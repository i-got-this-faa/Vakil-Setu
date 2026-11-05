import { loadCorpus } from "./legalCorpus.js";
import { retrieveLegalPassages } from "./legalVectorSearch.js";
import { answerLegalQuestion } from "./legalRagService.js";

// Prior user facts help resolve follow-ups. Assistant summaries are never treated as evidence.
export function buildRetrievalQuestion(text, history = []) {
  const prior = history.filter(m => m.role === "user" && m.content.trim() !== text.trim())
    .slice(-3).map(m => m.content.trim().slice(0, 700));
  return prior.length ? `Current question: ${text}\nEarlier user details: ${prior.join("\n")}` : text;
}

function warningsFor(citations) {
  const warnings = ["Retrieved material may be related without establishing the law applicable to your case. Consult an advocate."];
  if (citations.some(c => c.source.documentType === "statute" && c.source.cutoffVerified !== true)) {
    warnings.push("Statutory amendments and provision-specific commencement through 2025-12-31 have not been verified.");
  }
  if (citations.some(c => c.source.documentType === "judgment")) {
    warnings.push("Current authority and subsequent treatment of these judgments have not been checked.");
  }
  return warnings;
}

function excerptCitation(passage) {
  let end = Math.min(700, passage.text.length);
  if (end < passage.text.length) {
    const boundary = passage.text.lastIndexOf(" ", end);
    if (boundary > 300) end = boundary;
  }
  return { passageId: passage.id, page: passage.page ?? null, quote: passage.text.slice(0, end),
    truncated: end < passage.text.length, source: passage.source };
}

export async function buildTriageLegalAnswer(text, options = {}, dependencies = {}) {
  const language = options.language || "en";
  const mode = options.mode || process.env.TRIAGE_RAG_MODE || "auto";
  let retrieval;
  try {
    if (!["auto", "extractive", "llm"].includes(mode)) throw new Error("Invalid triage RAG mode");
    const corpus = dependencies.corpus || await loadCorpus();
    const question = buildRetrievalQuestion(text, options.history);
    retrieval = await (dependencies.retrieve || retrieveLegalPassages)(question,
      { language, retrievalMode: options.retrievalMode, limit: 5 }, { corpus });
    const metadata = { retrievalMethod: retrieval.retrievalMethod, embeddingModel: retrieval.embeddingModel,
      retrievalWarning: retrieval.retrievalWarning, authorityChecked: false };
    const passages = retrieval.passages;
    if (!passages.length) return {
      ...metadata, status: corpus.documents.length ? "no_matching_passages" : "empty_corpus",
      generationMode: "none", citations: [], warnings: [],
      answer: language === "hi" ? "उपलब्ध स्रोतों में पर्याप्त जानकारी नहीं मिली। कृपया अधिक विवरण दें या वकील से सलाह लें।" : "No matching legal sources were found. Please provide more details or consult an advocate."
    };
    const shouldGenerate = mode === "llm" || (mode === "auto" && Boolean(process.env.LLM_API_KEY));
    let generationWarning;
    if (shouldGenerate) {
      try {
        // Reuse this exact retrieval so the model and returned citations refer to one source set.
        const result = await answerLegalQuestion(question, { language }, { ...dependencies, corpus, retrieval });
        return { ...result, ...metadata, generationMode: "llm", warnings: warningsFor(result.citations) };
      } catch {
        generationWarning = "Grounded generation is unavailable; returning source excerpts instead.";
      }
    }
    const citations = passages.slice(0, 3).map(excerptCitation);
    return {
      ...metadata, status: "source_excerpts", generationMode: "extractive",
      generationWarning: generationWarning || (mode === "auto" ? "No generation model key is configured; returning source excerpts." : undefined),
      answer: language === "hi"
        ? "नीचे संभावित संबंधित स्रोतों के मूल अंश दिए गए हैं। ये आपके मामले का कानूनी निष्कर्ष नहीं हैं; अंशों की भाषा मूल स्रोत के अनुसार है।"
        : "The citations below contain potentially relevant excerpts in their original language. They are source material, not a legal conclusion about your case.",
      citations, warnings: warningsFor(citations)
    };
  } catch {
    return {
      status: "retrieval_unavailable", generationMode: "none", retrievalMethod: retrieval?.retrievalMethod ?? null,
      authorityChecked: false, citations: [], warnings: [],
      answer: language === "hi" ? "कानूनी स्रोत अभी उपलब्ध नहीं हैं। बाद में दोबारा प्रयास करें या वकील से सलाह लें।" : "Legal source retrieval is temporarily unavailable. Please try again or consult an advocate."
    };
  }
}
