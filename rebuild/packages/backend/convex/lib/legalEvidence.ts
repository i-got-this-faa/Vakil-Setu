import { v, type Infer } from "convex/values";

export const legalSource = v.object({
  title: v.string(), url: v.string(), documentType: v.union(v.literal("statute"), v.literal("judgment")),
  act: v.optional(v.string()), sectionNumber: v.optional(v.number()), sectionTitle: v.optional(v.string()),
  cutoffVerified: v.optional(v.boolean()), court: v.optional(v.string()), decisionDate: v.optional(v.string()),
  caseNumber: v.optional(v.string()), judges: v.optional(v.array(v.string())), requestedCutoff: v.optional(v.string()), versionWarning: v.optional(v.string()),
});
export const legalCitation = v.object({ passageId: v.string(), quote: v.string(), source: legalSource, page: v.optional(v.number()) });
export const legalEvidence = v.object({
  status: v.union(v.literal("answered"), v.literal("source_excerpts"), v.literal("no_matching_passages"), v.literal("unavailable")),
  retrievalMethod: v.union(v.literal("keyword"), v.literal("vector"), v.literal("hybrid"), v.literal("none")),
  citations: v.array(legalCitation), warnings: v.array(v.string()),
});
export type LegalEvidence = Infer<typeof legalEvidence>;
export type LegalPassage = { passageId: string; text: string; source: Infer<typeof legalSource>; page?: number };
export function safeLegalSource(source: Infer<typeof legalSource>): boolean {
  try {
    const url = new URL(source.url);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      ["jkhighcourt.nic.in", "www.sci.gov.in", "api.sci.gov.in", "www.ncrb.mha.gov.in"].includes(url.hostname) &&
      source.title.trim().length > 0 && source.title.length <= 500;
  } catch { return false; }
}
export function evidenceWarnings(passages: readonly LegalPassage[]) {
  const warnings = ["Sources do not establish which law applies to your facts. Seek a qualified advocate's advice."];
  if (passages.some(p => p.source.documentType === "statute" && p.source.cutoffVerified !== true)) warnings.push("Statutory amendments and provision-specific commencement through December 2025 are unverified.");
  if (passages.some(p => p.source.documentType === "judgment")) warnings.push("Subsequent treatment and current authority of these judgments have not been checked.");
  return warnings;
}
export function parseGroundedReply(raw: string, passages: readonly LegalPassage[], method: LegalEvidence["retrievalMethod"], maxChars: number): { text: string; legalEvidence: LegalEvidence } | null {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!value || typeof value !== "object" || !("text" in value) || typeof value.text !== "string" || !value.text.trim() || value.text.length > maxChars || !("evidence" in value) || !Array.isArray(value.evidence) || !value.evidence.length || value.evidence.length > 3) return null;
  const citations: LegalEvidence["citations"] = [];
  for (const item of value.evidence) {
    if (!item || typeof item !== "object" || !("passageId" in item) || typeof item.passageId !== "string" || !("quote" in item) || typeof item.quote !== "string" || item.quote.length < 24 || item.quote.length > 700) return null;
    const passage = passages.find(p => p.passageId === item.passageId);
    if (!passage || !passage.text.includes(item.quote)) return null;
    citations.push({ passageId: passage.passageId, quote: item.quote, source: passage.source, ...(passage.page === undefined ? {} : { page: passage.page }) });
  }
  return { text: value.text.trim(), legalEvidence: { status: "answered", retrievalMethod: method, citations, warnings: evidenceWarnings(passages) } };
}
