import Booking from "../models/Booking.js";
import {
  createRazorpayOrder,
  verifyRazorpaySignature
} from "../services/paymentService.js";

export const createOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ message: "bookingId is required" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const order = await createRazorpayOrder({
      amount: Math.round((booking.amount || 500) * 100),
      receipt: `booking_${booking._id}`
    });

    booking.razorpayOrderId = order.id;
    await booking.save();

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature, skipPayment } =
      req.body;
    if (!bookingId) {
      return res.status(400).json({ message: "bookingId is required" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.status = "confirmed";

    if (skipPayment) {
      booking.paymentStatus = "pending";
    } else {
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(400).json({ message: "Missing payment verification fields" });
      }

      const isValid = verifyRazorpaySignature({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      });

      if (!isValid) {
        return res.status(400).json({ message: "Invalid payment signature" });
      }

      booking.paymentStatus = "paid";
      booking.razorpayPaymentId = razorpayPaymentId;
    }

    await booking.save();

    res.json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};
