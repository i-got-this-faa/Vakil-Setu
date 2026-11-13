"use node";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export async function embedLegalText(text: string, task: "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT", signal: AbortSignal): Promise<number[] | null> {
  const key = process.env.GEMINI_API_KEY?.trim(); if (!key) return null;
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent", {
      method: "POST", redirect: "error", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, signal,
      body: JSON.stringify({ model: "models/gemini-embedding-001", content: { parts: [{ text: text.slice(0, 12000) }] }, taskType: task, outputDimensionality: 768 }),
    });
    if (!response.ok) { await response.body?.cancel(); return null; }
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !("embedding" in data) || !data.embedding || typeof data.embedding !== "object" || !("values" in data.embedding) || !Array.isArray(data.embedding.values) || data.embedding.values.length !== 768) return null;
    const vector: number[] = [];
    for (const n of data.embedding.values) { if (typeof n !== "number" || !Number.isFinite(n)) return null; vector.push(n); }
    const norm = Math.hypot(...vector); return norm ? vector.map(n => n / norm) : null;
  } catch { return null; }
}
// Operator-only re-embedding. Existing local E5 vectors cannot be imported into this index.
export const indexBatch = internalAction({ args: { dataset: v.string(), after: v.number() }, handler: async (ctx, args): Promise<{ indexed: number; next: number }> => {
  const passages = await ctx.runQuery(internal.legalCorpus.embeddingBatch, args);
  let indexed = 0;
  for (const passage of passages) {
    const vector = await embedLegalText(`${passage.source.title}\n${passage.source.sectionTitle || ""}\n${passage.text}`, "RETRIEVAL_DOCUMENT", AbortSignal.timeout(15000));
    if (!vector) throw new Error("Embedding unavailable; no active corpus was changed. Check the server's Gemini embedding access and retry this batch.");
    await ctx.runMutation(internal.legalCorpus.saveEmbedding, { passageId: passage._id, embedding: vector }); indexed++;
  }
  return { indexed, next: args.after + indexed };
} });
