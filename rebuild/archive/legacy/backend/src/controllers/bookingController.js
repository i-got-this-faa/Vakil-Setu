import Booking from "../models/Booking.js";
import User from "../models/User.js";

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
