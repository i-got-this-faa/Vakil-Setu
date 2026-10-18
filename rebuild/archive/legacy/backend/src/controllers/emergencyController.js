import Advocate from "../models/Advocate.js";

export const triggerEmergency = async (_req, res, next) => {
  try {
    const advocate = await Advocate.findOne({ availability: true }).sort({ rating: -1 });
    if (!advocate) {
      return res.status(404).json({ message: "No available advocate found" });
    }

    res.json({ advocate });
  } catch (error) {
    next(error);
  }
};
