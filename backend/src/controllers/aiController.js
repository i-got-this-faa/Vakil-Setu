import { classifyLegalIssue } from "../services/aiService.js";

export const classifyIssue = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: "text is required" });
    }

    const classification = await classifyLegalIssue(text);
    res.json(classification);
  } catch (error) {
    next(error);
  }
};
