import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    advocateId: { type: mongoose.Schema.Types.ObjectId, ref: "Advocate", required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending"
    },
    scheduledAt: { type: Date, required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending"
    },
    isEmergency: { type: Boolean, default: false },
    amount: { type: Number, default: 0 },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
