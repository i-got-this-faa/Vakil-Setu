import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Advocate from "../models/Advocate.js";
import mongoose from "mongoose";

export const createBooking = async (req, res, next) => {
  try {
    const {
      userId,
      userName = "Guest User",
      userPhone = "",
      advocateId,
      scheduledAt,
      isEmergency = false,
      amount = 0
    } = req.body;
    if (!advocateId || !scheduledAt) {
      return res.status(400).json({ message: "advocateId and scheduledAt are required" });
    }

    if (!mongoose.isValidObjectId(advocateId) || (userId && !mongoose.isValidObjectId(userId))) {
      return res.status(400).json({ message: "Invalid advocate or user ID" });
    }
    if (!Number.isFinite(new Date(scheduledAt).getTime()) || new Date(scheduledAt).getTime() <= Date.now()) {
      return res.status(400).json({ message: "Choose a valid future consultation time" });
    }
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 1 || amount > 100000) {
      return res.status(400).json({ message: "Consultation fee must be between ₹1 and ₹100,000" });
    }
    if (!userId && (typeof userName !== "string" || !userName.trim())) {
      return res.status(400).json({ message: "Your name is required" });
    }
    const advocate = await Advocate.findById(advocateId);
    if (!advocate || advocate.availability === false) {
      return res.status(400).json({ message: "Advocate is not available for requests" });
    }

    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const guest = await User.create({
        name: userName,
        phone: userPhone
      });
      resolvedUserId = guest._id;
    }

    const booking = await Booking.create({
      userId: resolvedUserId,
      advocateId,
      scheduledAt,
      isEmergency,
      amount
    });

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
};
