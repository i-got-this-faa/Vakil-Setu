/** Plain text for Web Speech: concise summary only. */
export function speakableAnalysisText(classification) {
  if (!classification) return "";
  return String(classification.summary || "").trim();
}

export function ttsLocaleFromClassification(classification, fallbackBcp47 = "en-IN") {
  const lang = classification?.response_language;
  if (lang === "hi") return "hi-IN";
  if (lang === "en") return "en-IN";
  return fallbackBcp47;
}
