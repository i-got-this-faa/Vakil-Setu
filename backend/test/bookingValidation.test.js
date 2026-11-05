import test from "node:test";
import assert from "node:assert/strict";
import { createBooking } from "../src/controllers/bookingController.js";

test("rejects invalid booking input before creating users or bookings", async () => {
  const valid = { advocateId: "507f1f77bcf86cd799439011", scheduledAt: new Date(Date.now() + 86400000).toISOString(), userName: "Test", amount: 500 };
  for (const changes of [{ advocateId: "bad" }, { scheduledAt: "2020-01-01" }, { scheduledAt: "bad" }, { amount: -10 }, { amount: "500" }, { userName: "  " }]) {
    const res = { status(code) { this.code = code; return this; }, json(data) { this.data = data; } };
    await createBooking({ body: { ...valid, ...changes } }, res, error => { throw error; });
    assert.equal(res.code, 400, JSON.stringify(changes));
  }
});
