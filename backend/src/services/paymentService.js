import Razorpay from "razorpay";
import crypto from "crypto";

export const createRazorpayOrder = async ({ amount, currency = "INR", receipt }) => {
  if (!process.env.RAZORPAY_KEY || !process.env.RAZORPAY_SECRET) {
    throw new Error("Razorpay credentials are missing.");
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET
  });

  return razorpay.orders.create({
    amount,
    currency,
    receipt
  });
};

export const verifyRazorpaySignature = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature
}) => {
  if (!process.env.RAZORPAY_SECRET || typeof razorpaySignature !== "string" || !/^[a-f0-9]{64}$/i.test(razorpaySignature)) return false;
  const generated = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET || "")
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(generated, "hex"), Buffer.from(razorpaySignature, "hex"));
};
