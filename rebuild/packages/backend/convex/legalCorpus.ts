import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { legalSource, safeLegalSource } from "./lib/legalEvidence";
import { fail } from "./lib/access";
export const passageInput = v.object({ passageId: v.string(), text: v.string(), source: legalSource, page: v.optional(v.number()), textHash: v.string() });

// Operator-only staging: ordinary accounts cannot insert authoritative legal material.
export const importBatch = internalMutation({ args: { dataset: v.string(), passages: v.array(passageInput) }, handler: async (ctx, args) => {
  if (!/^[a-f0-9]{64}$/.test(args.dataset) || !args.passages.length || args.passages.length > 25) fail("INVALID_INPUT", "Use a SHA-256 dataset and batches of 1–25 passages.");
  const current = await ctx.db.query("legalDatasets").withIndex("by_key", q => q.eq("key", "current")).unique();
  if (current?.dataset === args.dataset) fail("CONFLICT", "Active datasets are immutable. Stage a new content version.");
  for (const p of args.passages) {
    if (!p.passageId.trim() || p.passageId.length > 200 || !p.text.trim() || p.text.length > 10000 || !/^[a-f0-9]{64}$/.test(p.textHash) || !safeLegalSource(p.source) || (p.page !== undefined && (!Number.isInteger(p.page) || p.page < 1))) fail("INVALID_INPUT", "Invalid legal passage.");
    const existing = await ctx.db.query("legalPassages").withIndex("by_dataset_passage", q => q.eq("dataset", args.dataset).eq("passageId", p.passageId)).unique();
    if (existing && (existing.text !== p.text || existing.textHash !== p.textHash || JSON.stringify(existing.source) !== JSON.stringify(p.source) || existing.page !== p.page)) fail("CONFLICT", "Dataset content is immutable.");
    if (!existing) await ctx.db.insert("legalPassages", { ...p, dataset: args.dataset, searchText: `${p.source.title} ${p.source.sectionTitle || ""} ${p.text}` });
  }
  return args.passages.length;
} });
export const publish = internalMutation({ args: { dataset: v.string(), expectedCount: v.number(), embeddingModel: v.optional(v.string()) }, handler: async (ctx, args) => {
  const passages = await ctx.db.query("legalPassages").withIndex("by_dataset_passage", q => q.eq("dataset", args.dataset)).take(5001);
  if (!Number.isInteger(args.expectedCount) || args.expectedCount < 1 || args.expectedCount > 5000 || passages.length !== args.expectedCount) fail("INVALID_INPUT", "Dataset coverage differs from the reviewed manifest.");
  if (args.embeddingModel !== undefined) {
    if (args.embeddingModel !== "gemini-embedding-001/768") fail("INVALID_INPUT", "Unsupported embedding profile.");
    const vectors = await ctx.db.query("legalVectors").withIndex("by_dataset_passage", q => q.eq("dataset", args.dataset)).take(5001);
    if (vectors.length !== passages.length || vectors.some(v => v.embeddingModel !== args.embeddingModel || !passages.some(p => p._id === v.passageId && p.textHash === v.textHash))) fail("INVALID_INPUT", "Embedding coverage or model mismatch.");
  }
  const current = await ctx.db.query("legalDatasets").withIndex("by_key", q => q.eq("key", "current")).unique();
  const value = { key: "current", dataset: args.dataset, count: passages.length, ...(args.embeddingModel ? { embeddingModel: args.embeddingModel } : {}) };
  if (current) { await ctx.db.replace(current._id, value); } else await ctx.db.insert("legalDatasets", value);
  return { count: passages.length };
} });
export const status = query({ args: {}, handler: async ctx => {
  const current = await ctx.db.query("legalDatasets").withIndex("by_key", q => q.eq("key", "current")).unique();
  return current ? { configured: true, count: current.count, vectors: Boolean(current.embeddingModel) } : { configured: false, count: 0, vectors: false };
} });
export const current = internalQuery({ args: {}, handler: async ctx => await ctx.db.query("legalDatasets").withIndex("by_key", q => q.eq("key", "current")).unique() });
export const keyword = internalQuery({ args: { dataset: v.string(), query: v.string() }, handler: async (ctx, args) => {
  const query = args.query.slice(0, 500).trim();
  if (!query) return [];
  return await ctx.db.query("legalPassages").withSearchIndex("search_text", q => q.search("searchText", query).eq("dataset", args.dataset)).take(20);
} });
export const vectorPassages = internalQuery({ args: { dataset: v.string(), ids: v.array(v.id("legalVectors")) }, handler: async (ctx, args) => {
  const passages = [];
  for (const id of args.ids.slice(0, 20)) {
    const vector = await ctx.db.get(id); if (!vector || vector.dataset !== args.dataset) continue;
    const passage = await ctx.db.get(vector.passageId);
    if (passage && passage.dataset === args.dataset && passage.textHash === vector.textHash) passages.push(passage);
  }
  return passages;
} });
export const embeddingBatch = internalQuery({ args: { dataset: v.string(), after: v.number() }, handler: async (ctx, args) => {
  if (!Number.isInteger(args.after) || args.after < 0 || args.after > 5000) fail("INVALID_INPUT", "Invalid batch offset.");
  const passages = await ctx.db.query("legalPassages").withIndex("by_dataset_passage", q => q.eq("dataset", args.dataset)).take(5001);
  return passages.slice(args.after, args.after + 10);
} });
export const saveEmbedding = internalMutation({ args: { passageId: v.id("legalPassages"), embedding: v.array(v.number()) }, handler: async (ctx, args) => {
  if (args.embedding.length !== 768 || args.embedding.some(n => !Number.isFinite(n)) || Math.abs(Math.hypot(...args.embedding) - 1) > .001) fail("INVALID_INPUT", "Expected normalized 768-dimensional embedding.");
  const passage = await ctx.db.get(args.passageId); if (!passage) fail("NOT_FOUND", "Passage not found.");
  const current = await ctx.db.query("legalDatasets").withIndex("by_key", q => q.eq("key", "current")).unique();
  if (current?.dataset === passage.dataset) fail("CONFLICT", "Active datasets are immutable.");
  const prior = await ctx.db.query("legalVectors").withIndex("by_dataset_passage", q => q.eq("dataset", passage.dataset).eq("passageId", passage._id)).unique();
  const value = { dataset: passage.dataset, passageId: passage._id, textHash: passage.textHash, embeddingModel: "gemini-embedding-001/768", embedding: args.embedding };
  if (prior) await ctx.db.replace(prior._id, value); else await ctx.db.insert("legalVectors", value);
} });
