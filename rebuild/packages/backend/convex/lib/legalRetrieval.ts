"use node";
import type { ActionCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { embedLegalText } from "../legalEmbedding";
import { evidenceWarnings, type LegalEvidence, type LegalPassage } from "./legalEvidence";

export async function retrieveLegalEvidence(ctx: ActionCtx, query: string, signal: AbortSignal, beforeEmbedding: () => Promise<void>): Promise<{ configured: boolean; passages: LegalPassage[]; method: LegalEvidence["retrievalMethod"]; warnings: string[] }> {
  const dataset = await ctx.runQuery(internal.legalCorpus.current, {});
  if (!dataset) return { configured: false, passages: [], method: "none", warnings: ["No reviewed legal corpus has been published."] };
  const keyword = await ctx.runQuery(internal.legalCorpus.keyword, { dataset: dataset.dataset, query });
  let semantic: Doc<"legalPassages">[] = [];
  const warnings: string[] = [];
  if (dataset.embeddingModel && process.env.LEGAL_VECTOR_ENABLED === "true" && process.env.GEMINI_API_KEY?.trim()) {
    await beforeEmbedding(); signal.throwIfAborted();
    const vector = await embedLegalText(query, "RETRIEVAL_QUERY", signal);
    if (vector) {
      try {
        const hits = await ctx.vectorSearch("legalVectors", "by_embedding", { vector, limit: 20, filter: q => q.eq("dataset", dataset.dataset) });
        semantic = await ctx.runQuery(internal.legalCorpus.vectorPassages, { dataset: dataset.dataset, ids: hits.map(h => h._id) });
      } catch { warnings.push("Vector index unavailable; keyword retrieval was used."); }
    } else warnings.push("Vector retrieval was unavailable; keyword retrieval was used.");
  }
  const ranks = new Map<string, { passage: Doc<"legalPassages">; score: number }>();
  for (const list of [keyword, semantic]) list.forEach((passage, i) => {
    const entry = ranks.get(passage._id) || { passage, score: 0 }; entry.score += 1 / (61 + i); ranks.set(passage._id, entry);
  });
  const passages = [...ranks.values()].sort((a, b) => b.score - a.score).slice(0, 5).map(({ passage: p }) => ({ passageId: p.passageId, text: p.text, source: p.source, ...(p.page === undefined ? {} : { page: p.page }) }));
  return { configured: true, passages, method: semantic.length ? keyword.length ? "hybrid" : "vector" : "keyword", warnings: [...warnings, ...evidenceWarnings(passages)] };
}
export function sourceExcerpt(passages: readonly LegalPassage[], method: LegalEvidence["retrievalMethod"], warnings: string[]) {
  const p = passages[0];
  if (!p) return null;
  const quote = p.text.slice(0, 700);
  return { kind: "reply" as const, text: `A related source excerpt follows in its original language; it is not a conclusion about your case.\n\n${quote}\n\nRead the full source for context and exceptions.`, legalEvidence: { status: "source_excerpts" as const, retrievalMethod: method, citations: [{ passageId: p.passageId, quote, source: p.source, ...(p.page === undefined ? {} : { page: p.page }) }], warnings } };
}
