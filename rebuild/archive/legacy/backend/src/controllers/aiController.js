import Advocate from "../models/Advocate.js";
import { classifyLegalIssue } from "../services/aiService.js";
import { normalizeLegalDomainForMatch } from "../utils/legalDomain.js";

async function advocatesForDomain(domain) {
  const canonical = normalizeLegalDomainForMatch(domain);
  return Advocate.find({ expertise: canonical, availability: true })
    .sort({ rating: -1 })
    .limit(5);
}

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

/** Classify + match advocates in one round trip for smoother client workflow. */
export const triageIssue = async (req, res, next) => {
  try {
    const { text, history } = req.body;
    if (!text) {
      return res.status(400).json({ message: "text is required" });
    }

    const prior = Array.isArray(history) ? history : [];
    const classification = await classifyLegalIssue(text, prior);
    const advocates = await advocatesForDomain(classification.domain);
    res.json({ classification, advocates });
  } catch (error) {
    next(error);
  }
};
