import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
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
const EMBEDDING_PROFILE = "gemini-embedding-001/768";
const COVERAGE_PAGE = 200;
// Every check reads the corpus in pages, so this only bounds an operator mistake.
const MAX_PASSAGES = 10_000;

/** One page of a staged dataset: how many passages, and whether each has a matching vector (when asked). */
export const coveragePage = internalQuery({ args: { dataset: v.string(), embeddingModel: v.optional(v.string()), cursor: v.union(v.string(), v.null()) }, handler: async (ctx, args) => {
  const page = await ctx.db.query("legalPassages").withIndex("by_dataset_passage", q => q.eq("dataset", args.dataset)).paginate({ numItems: COVERAGE_PAGE, cursor: args.cursor });
  let covered = true, missing = 0;
  if (args.embeddingModel !== undefined) for (const passage of page.page) {
    const vector = await ctx.db.query("legalVectors").withIndex("by_dataset_passage", q => q.eq("dataset", args.dataset).eq("passageId", passage._id)).unique();
    if (!vector) missing++;
    else if (vector.embeddingModel !== args.embeddingModel || vector.textHash !== passage.textHash) covered = false;
  }
  return { count: page.page.length, missing, covered, isDone: page.isDone, continueCursor: page.continueCursor };
} });

export const activate = internalMutation({ args: { dataset: v.string(), count: v.number(), embeddingModel: v.optional(v.string()) }, handler: async (ctx, args) => {
  const current = await ctx.db.query("legalDatasets").withIndex("by_key", q => q.eq("key", "current")).unique();
  const value = { key: "current", dataset: args.dataset, count: args.count, ...(args.embeddingModel ? { embeddingModel: args.embeddingModel } : {}) };
  if (current) { await ctx.db.replace(current._id, value); } else await ctx.db.insert("legalDatasets", value);
  return null;
} });

// Operator-only. Checks coverage page by page (a large corpus with vectors exceeds one transaction's read limit),
// then makes the dataset active. Staged datasets only change through importBatch, which refuses an active one.
// `allowMissingVectors`: publish while some passages still lack a vector (e.g. the embedding quota ran out). Every
// passage is still found by keyword search, and saveEmbedding can fill the gaps later. A wrong vector is never allowed.
export const publish = internalAction({ args: { dataset: v.string(), expectedCount: v.number(), embeddingModel: v.optional(v.string()), allowMissingVectors: v.optional(v.boolean()) }, handler: async (ctx, args): Promise<{ count: number; missingVectors: number }> => {
  if (!Number.isInteger(args.expectedCount) || args.expectedCount < 1 || args.expectedCount > MAX_PASSAGES) fail("INVALID_INPUT", "Dataset coverage differs from the reviewed manifest.");
  if (args.embeddingModel !== undefined && args.embeddingModel !== EMBEDDING_PROFILE) fail("INVALID_INPUT", "Unsupported embedding profile.");
  let count = 0, missing = 0;
  let cursor: string | null = null;
  for (;;) {
    const page: { count: number; missing: number; covered: boolean; isDone: boolean; continueCursor: string } = await ctx.runQuery(internal.legalCorpus.coveragePage, { dataset: args.dataset, cursor, ...(args.embeddingModel ? { embeddingModel: args.embeddingModel } : {}) });
    if (!page.covered) fail("INVALID_INPUT", "Embedding coverage or model mismatch.");
    count += page.count;
    missing += page.missing;
    if (count > args.expectedCount) break;
    if (page.isDone) break;
    cursor = page.continueCursor;
  }
  if (count !== args.expectedCount) fail("INVALID_INPUT", "Dataset coverage differs from the reviewed manifest.");
  if (missing && !args.allowMissingVectors) fail("INVALID_INPUT", `Embedding coverage incomplete: ${missing} passages have no vector.`);
  if (missing === count) fail("INVALID_INPUT", "No passage has a vector; publish without an embedding model instead.");
  await ctx.runMutation(internal.legalCorpus.activate, { dataset: args.dataset, count, ...(args.embeddingModel ? { embeddingModel: args.embeddingModel } : {}) });
  return { count, missingVectors: missing };
} });

/**
 * Operator-only: reuses vectors from another dataset for passages whose ID and text are unchanged, so a new
 * corpus version only needs embeddings for its new passages. Returns a cursor; call again until done.
 */
export const copyEmbeddings = internalMutation({ args: { from: v.string(), to: v.string(), cursor: v.union(v.string(), v.null()) }, handler: async (ctx, args) => {
  const current = await ctx.db.query("legalDatasets").withIndex("by_key", q => q.eq("key", "current")).unique();
  if (current?.dataset === args.to) fail("CONFLICT", "Active datasets are immutable.");
  const page = await ctx.db.query("legalPassages").withIndex("by_dataset_passage", q => q.eq("dataset", args.to)).paginate({ numItems: 50, cursor: args.cursor });
  let copied = 0;
  for (const passage of page.page) {
    const existing = await ctx.db.query("legalVectors").withIndex("by_dataset_passage", q => q.eq("dataset", args.to).eq("passageId", passage._id)).unique();
    if (existing?.textHash === passage.textHash) continue;
    const old = await ctx.db.query("legalPassages").withIndex("by_dataset_passage", q => q.eq("dataset", args.from).eq("passageId", passage.passageId)).unique();
    if (!old || old.textHash !== passage.textHash || old.text !== passage.text) continue;
    const vector = await ctx.db.query("legalVectors").withIndex("by_dataset_passage", q => q.eq("dataset", args.from).eq("passageId", old._id)).unique();
    if (!vector || vector.textHash !== passage.textHash || vector.embeddingModel !== EMBEDDING_PROFILE) continue;
    const value = { dataset: args.to, passageId: passage._id, textHash: passage.textHash, embeddingModel: vector.embeddingModel, embedding: vector.embedding };
    if (existing) await ctx.db.replace(existing._id, value); else await ctx.db.insert("legalVectors", value);
    copied++;
  }
  return { copied, isDone: page.isDone, continueCursor: page.continueCursor };
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
/** The next 10 passages of a dataset, minus those that already have a matching vector. */
export const embeddingBatch = internalQuery({ args: { dataset: v.string(), cursor: v.union(v.string(), v.null()) }, handler: async (ctx, args) => {
  const page = await ctx.db.query("legalPassages").withIndex("by_dataset_passage", q => q.eq("dataset", args.dataset)).paginate({ numItems: 10, cursor: args.cursor });
  const passages = [];
  for (const passage of page.page) {
    const vector = await ctx.db.query("legalVectors").withIndex("by_dataset_passage", q => q.eq("dataset", args.dataset).eq("passageId", passage._id)).unique();
    if (vector?.textHash !== passage.textHash || vector.embeddingModel !== EMBEDDING_PROFILE) passages.push(passage);
  }
  return { passages, isDone: page.isDone, continueCursor: page.continueCursor };
} });
export const saveEmbedding = internalMutation({ args: { passageId: v.id("legalPassages"), embedding: v.array(v.number()) }, handler: async (ctx, args) => {
  if (args.embedding.length !== 768 || args.embedding.some(n => !Number.isFinite(n)) || Math.abs(Math.hypot(...args.embedding) - 1) > .001) fail("INVALID_INPUT", "Expected normalized 768-dimensional embedding.");
  const passage = await ctx.db.get(args.passageId); if (!passage) fail("NOT_FOUND", "Passage not found.");
  const current = await ctx.db.query("legalDatasets").withIndex("by_key", q => q.eq("key", "current")).unique();
  const prior = await ctx.db.query("legalVectors").withIndex("by_dataset_passage", q => q.eq("dataset", passage.dataset).eq("passageId", passage._id)).unique();
  // The live dataset's passages never change; a missing vector may only be filled in, never replaced.
  if (current?.dataset === passage.dataset && (prior || current.embeddingModel !== "gemini-embedding-001/768")) fail("CONFLICT", "Active datasets are immutable.");
  const value = { dataset: passage.dataset, passageId: passage._id, textHash: passage.textHash, embeddingModel: "gemini-embedding-001/768", embedding: args.embedding };
  if (prior) await ctx.db.replace(prior._id, value); else await ctx.db.insert("legalVectors", value);
} });
