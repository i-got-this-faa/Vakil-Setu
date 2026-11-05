import Advocate from "../models/Advocate.js";
import { classifyLegalIssue } from "../services/aiService.js";
import { buildTriageLegalAnswer } from "../services/legalTriageService.js";
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

/** Classify and match advocates, with separately labelled source-grounded legal evidence. */
export function createTriageHandler({ classify = classifyLegalIssue, match = advocatesForDomain, legalAnswer = buildTriageLegalAnswer } = {}) {
  return async (req, res, next) => {
    try {
      const { text, history = [], language, retrievalMode } = req.body || {};
      if (typeof text !== "string" || !text.trim() || text.length > 4000) {
        return res.status(400).json({ message: "text must contain 1–4000 characters" });
      }
      if (!Array.isArray(history) || history.length > 100 || history.some(m =>
        !m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || m.content.length > 4000)) {
        return res.status(400).json({ message: "history must contain at most 100 user/assistant messages of up to 4000 characters" });
      }
      if (language !== undefined && !["en", "hi"].includes(language)) {
        return res.status(400).json({ message: "language must be en or hi" });
      }
      if (retrievalMode !== undefined && !["auto", "bm25", "vector", "hybrid"].includes(retrievalMode)) {
        return res.status(400).json({ message: "Invalid retrievalMode" });
      }
      const prior = history.slice(-10);
      const classification = await classify(text.trim(), prior);
      const [advocates, grounded] = await Promise.all([
        match(classification.domain),
        legalAnswer(text.trim(), { history: prior, language: language || classification.response_language || "en", retrievalMode })
      ]);
      res.json({ classification, advocates, legalAnswer: grounded });
    } catch (error) {
      next(error);
    }
  };
}

export const triageIssue = createTriageHandler();
