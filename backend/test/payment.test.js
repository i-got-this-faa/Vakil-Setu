import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import Booking from "../src/models/Booking.js";
import { verifyPayment } from "../src/controllers/paymentController.js";
import { verifyRazorpaySignature } from "../src/services/paymentService.js";

const signature = (order, payment, secret) => crypto.createHmac("sha256", secret).update(`${order}|${payment}`).digest("hex");

test("payment verification protects the booking and remains pending until advocate acceptance", async (t) => {
  const oldSecret = process.env.RAZORPAY_SECRET;
  process.env.RAZORPAY_SECRET = "test-secret";
  const originalFind = Booking.findById;
  t.after(() => {
    Booking.findById = originalFind;
    if (oldSecret === undefined) delete process.env.RAZORPAY_SECRET;
    else process.env.RAZORPAY_SECRET = oldSecret;
  });
  async function run(body, overrides = {}) {
    let saves = 0;
    const booking = { status: "pending", paymentStatus: "pending", razorpayOrderId: "order_own", save: async () => saves++, ...overrides };
    Booking.findById = async () => booking;
    const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
    await verifyPayment({ body: { bookingId: "test-booking", ...body } }, res, error => { throw error; });
    return { res, booking, saves };
  }
  await t.test("rejects a valid signature for a different order", async () => {
    const { res, saves } = await run({ razorpayOrderId: "order_other", razorpayPaymentId: "pay_1", razorpaySignature: signature("order_other", "pay_1", "test-secret") });
    assert.equal(res.code, 400); assert.equal(saves, 0);
  });
  await t.test("rejects payment skipping", async () => {
    const { res, saves } = await run({ skipPayment: true });
    assert.equal(res.code, 400); assert.equal(saves, 0);
  });
  await t.test("rejects a forged signature", async () => {
    const { res, saves } = await run({ razorpayOrderId: "order_own", razorpayPaymentId: "pay_1", razorpaySignature: "0".repeat(64) });
    assert.equal(res.code, 400); assert.equal(saves, 0);
  });
  const payment = { razorpayOrderId: "order_own", razorpayPaymentId: "pay_1", razorpaySignature: signature("order_own", "pay_1", "test-secret") };
  await t.test("records valid payment without confirming an appointment", async () => {
    const { res, booking, saves } = await run(payment);
    assert.equal(res.code, 200); assert.equal(booking.status, "pending"); assert.equal(booking.paymentStatus, "paid"); assert.equal(saves, 1);
  });
  await t.test("repeated verification is idempotent", async () => {
    const { res, saves } = await run(payment, { paymentStatus: "paid", razorpayPaymentId: "pay_1" });
    assert.equal(res.code, 200); assert.equal(saves, 0);
  });
  await t.test("rejects payment on cancelled bookings", async () => {
    const { res, saves } = await run(payment, { status: "cancelled" });
    assert.equal(res.code, 409); assert.equal(saves, 0);
  });
  await t.test("fails closed when the payment secret is absent", () => {
    delete process.env.RAZORPAY_SECRET;
    assert.equal(verifyRazorpaySignature(payment), false);
  });
});
