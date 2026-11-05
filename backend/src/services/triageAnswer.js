/** Prefer cited guidance; otherwise use the independent, validated LLM response. */
export function selectTriageAnswer(classification, grounded, language = "en") {
  if (!grounded) return null; // Clarification turns do not run retrieval.
  if (grounded.status === "answered" && grounded.citations?.length) return grounded;
  if (classification.status !== "classified" || !["gemini", "gateway"].includes(classification.source) || !classification.summary?.trim()) return grounded;
  return {
    status: "general_guidance",
    generationMode: "llm_ungrounded",
    answer: [classification.summary, ...(classification.actions || []).map((action, index) => `${index + 1}. ${action}`)].join("\n\n"),
    citations: [],
    authorityChecked: false,
    retrievalStatus: grounded.status,
    retrievalMethod: grounded.retrievalMethod ?? null,
    warnings: [language === "hi"
      ? "यह सामान्य एआई मार्गदर्शन है; उपलब्ध कानूनी स्रोतों से इसकी पुष्टि नहीं हुई है।"
      : "General AI guidance; not verified against the available legal sources."]
  };
}
