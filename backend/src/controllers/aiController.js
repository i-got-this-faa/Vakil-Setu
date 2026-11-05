import Advocate from "../models/Advocate.js";
import { classifyLegalIssue } from "../services/aiService.js";
import { buildTriageLegalAnswer } from "../services/legalTriageService.js";
import { selectTriageAnswer } from "../services/triageAnswer.js";
import { normalizeLegalDomainForMatch } from "../utils/legalDomain.js";

async function advocatesForDomain(domain) {
  const canonical = normalizeLegalDomainForMatch(domain);
  return Advocate.find({ expertise: canonical, availability: true })
    .sort({ rating: -1 })
    .limit(5);
}

export const classifyIssue = async (req, res, next) => {
  try {
    const { text, language = "auto" } = req.body;
    if (!text) {
      return res.status(400).json({ message: "text is required" });
    }

    const classification = await classifyLegalIssue(text, [], language);
    res.json(classification);
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ message: error.message });
    next(error);
  }
};

/** Keep independent triage separate from source-grounded legal guidance. */
export function createTriageHandler({ classify = classifyLegalIssue, match = advocatesForDomain, legalAnswer = buildTriageLegalAnswer } = {}) {
  return async (req, res, next) => {
    try {
      const { text, history = [], language = "auto", retrievalMode } = req.body || {};
      const preferences = { en: "english", hi: "hindi", english: "english", hindi: "hindi", auto: "auto" };
      if (typeof text !== "string" || !text.trim() || text.length > 4000) return res.status(400).json({ message: "Enter between 1 and 4,000 characters." });
      if (typeof language !== "string" || !Object.hasOwn(preferences, language)) return res.status(400).json({ message: "Unsupported language." });
      if (!Array.isArray(history) || history.length > 100 || history.some(m => !m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || m.content.length > 4000)) return res.status(400).json({ message: "Invalid conversation history." });
      if (retrievalMode !== undefined && !["auto", "bm25", "vector", "hybrid"].includes(retrievalMode)) return res.status(400).json({ message: "Invalid retrievalMode." });
      const prior = history.slice(-10);
      const classification = await classify(text.trim(), prior, preferences[language]);
      const locale = preferences[language] === "hindi" ? "hi" : preferences[language] === "english" ? "en" : classification.response_language || "en";
      const hasAnalysis = classification.status === "classified";
      const [advocates, grounded] = await Promise.all([
        hasAnalysis ? match(classification.domain) : [],
        // Greetings and missing details should remain a conversation, not retrieve unrelated laws.
        classification.status === "needs_clarification" ? Promise.resolve(null) : legalAnswer(text.trim(), { history: prior, language: locale, retrievalMode })
      ]);
      res.json({ classification, advocates, legalAnswer: selectTriageAnswer(classification, grounded, locale) });
    } catch (error) {
      if (error.status === 400) return res.status(400).json({ message: error.message });
      next(error);
    }
  };
}
export const triageIssue = createTriageHandler();
