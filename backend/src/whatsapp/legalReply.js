import { retrieveLegalPassages } from "../services/legalVectorSearch.js";
import { loadCorpus } from "../services/legalCorpus.js";
import { answerLegalQuestion } from "../services/legalRagService.js";

export function expandVoiceQuery(text) {
  // Explicit small dictionary, not a claim of general multilingual semantic search.
  return `${text} ${/\bchori\b|चोरी/i.test(text) ? "theft dishonestly movable property" : ""}`;
}

const plain = (text) => text.replace(/[*_#]/g, "").replace(/\s+/g, " ").trim();

export async function legalReply(text, { mode = "extractive", language = "en", corpus } = {}) {
  const data = corpus || await loadCorpus();
  const query = expandVoiceQuery(text);
  const { passages } = await retrieveLegalPassages(query, { limit: 3 }, { corpus: data });
  if (!passages.length) return {
    spoken: language === "hi" ? "उपलब्ध कानूनी स्रोतों में पर्याप्त जानकारी नहीं मिली। कृपया अपना सवाल स्पष्ट करें या वकील खोजने के लिए कहें।" : "I could not find enough information in the available legal sources. Please explain your question in more detail, or say find a lawyer.",
    citations: [], status: "no_matching_passages", generationMode: "none"
  };
  const usedPassages = mode === "llm" ? passages : [passages[0]];
  const unverified = usedPassages.some((p) => p.source.documentType === "statute" && p.source.cutoffVerified !== true);
  const warning = unverified
    ? "This is reference text. Its amendments and commencement through December 2025 have not been verified."
    : "This is an excerpt from a past judgment, not a conclusion about your case or its current legal authority.";
  let spoken;
  let citations;
  let status;
  if (mode === "llm") {
    const result = await answerLegalQuestion(query, { language }, { corpus: data });
    spoken = result.answer;
    citations = result.citations;
    status = result.status;
  } else {
    const best = passages[0];
    let content = plain(best.text);
    if (best.sectionNumber) {
      const marker = new RegExp(`\\b${best.sectionNumber}\\.\\.?\\s*`).exec(content);
      if (marker) content = content.slice(marker.index + marker[0].length);
    }
    const sentenceEnd = [...content.matchAll(/[.!?](?=\s|$)/g)].find((m) => m.index >= 80 && m.index < 430)?.index;
    const end = sentenceEnd !== undefined ? sentenceEnd + 1 : content.length > 430 ? content.lastIndexOf(" ", 430) : content.length;
    const quote = content.slice(0, end);
    const clipped = end < content.length;
    const label = best.source.documentType === "statute" ? `${best.source.act}, section ${best.sectionNumber}` : `${best.source.title}, page ${best.page}`;
    spoken = `I found ${label}. Here is an excerpt from the source. ${quote}${clipped ? `${sentenceEnd === undefined ? "." : ""} The full passage is available in the source reference.` : ""}`;
    citations = [{ passageId: best.id, page: best.page, source: best.source, quote }];
    status = "source_excerpt";
  }
  if (language === "hi" && mode !== "llm") spoken = `यह स्रोत अंग्रेजी में है। मैं इसका अंग्रेजी अंश पढ़ रहा हूँ। ${spoken}`;
  const next = language === "hi" ? "आप अगला सवाल पूछ सकते हैं या वकील खोजने के लिए कह सकते हैं।" : "You can ask another question, or say find a lawyer.";
  const caveat = language === "hi" ? (unverified ? "इस स्रोत के संशोधन और लागू होने की स्थिति की दिसंबर 2025 तक पुष्टि नहीं हुई है।" : "यह पुराने निर्णय का अंश है, आपके मामले पर कानूनी निष्कर्ष नहीं।") : warning;
  return { spoken: `${spoken} ${caveat} ${next}`, citations, status, generationMode: mode, versionWarning: warning };
}

export function citationMessage(citations) {
  return citations.map((citation) => {
    const s = citation.source;
    const location = s.sectionNumber ? `Section ${s.sectionNumber}` : `Page ${citation.page}`;
    return `${s.title}\n${location}\n${s.url}${s.cutoffVerified === false ? "\nVersion through 2025-12-31 is not verified." : ""}`;
  }).join("\n\n");
}
