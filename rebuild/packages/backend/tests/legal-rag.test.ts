import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { parseGroundedReply } from "../convex/lib/legalEvidence";
const modules = import.meta.glob("../convex/**/*.ts");
const dataset = "a".repeat(64);
const passage = { passageId: "bns-303", text: "Theft means dishonestly taking movable property without the owner's consent.", textHash: "b".repeat(64), source: { title: "BNS reference text", url: "https://www.ncrb.mha.gov.in/reference#303", documentType: "statute" as const, sectionNumber: 303, cutoffVerified: false } };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
async function setup() {
  const t = convexTest(schema, modules);
  const user = t.withIdentity({ subject: "rag-owner" });
  await user.mutation(api.accounts.ensure, { role: "user", displayName: "Owner", locale: "en" });
  const caseId = await user.mutation(api.cases.create, { title: "Theft", text: "Someone stole my phone.", locale: "en", context: [] });
  await t.mutation(internal.legalCorpus.importBatch, { dataset, passages: [passage] });
  await t.action(internal.legalCorpus.publish, { dataset, expectedCount: 1 });
  const contextKey = (await user.query(api.chat.listMine, { caseId })).contextKey;
  return { t, user, caseId, request: { caseId, message: "theft", documentIds: [], requestId: "rag-request", contextKey, consent: true as const } };
}
test("corpus publication verifies coverage, official sources and active immutability", async () => {
  const t = convexTest(schema, modules);
  await expect(t.mutation(internal.legalCorpus.importBatch, { dataset, passages: [{ ...passage, source: { ...passage.source, url: "https://evil.example/" } }] })).rejects.toThrow("INVALID_INPUT");
  await t.mutation(internal.legalCorpus.importBatch, { dataset, passages: [passage] });
  await expect(t.action(internal.legalCorpus.publish, { dataset, expectedCount: 2 })).rejects.toThrow();
  await t.action(internal.legalCorpus.publish, { dataset, expectedCount: 1 });
  await expect(t.mutation(internal.legalCorpus.importBatch, { dataset, passages: [passage] })).rejects.toThrow("CONFLICT");
  await expect(t.action(internal.legalCorpus.publish, { dataset, expectedCount: 1, embeddingModel: "gemini-embedding-001/768" })).rejects.toThrow();
  expect(await t.query(api.legalCorpus.status, {})).toEqual({ configured: true, count: 1, vectors: false });
});
test("published keyword sources are available without a generation key and persist as excerpts", async () => {
  vi.stubEnv("GEMINI_API_KEY", "");
  const f = await setup(); const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  expect(await f.user.action(api.chat.send, f.request)).toEqual({ kind: "available" });
  expect(fetchMock).not.toHaveBeenCalled();
  const turn = (await f.user.query(api.chat.listMine, { caseId: f.caseId })).turns[0];
  expect(turn?.result).toMatchObject({ kind: "reply", legalEvidence: { status: "source_excerpts", citations: [{ passageId: "bns-303" }] } });
  const stranger = f.t.withIdentity({ subject: "stranger" });
  await stranger.mutation(api.accounts.ensure, { role: "user", displayName: "Other", locale: "en" });
  await expect(stranger.action(api.chat.send, { ...f.request, requestId: "other" })).rejects.toThrow("NOT_FOUND");
});
test("generated citations are validated and persisted for both clients, with no duplicate dispatch on replay", async () => {
  const f = await setup(); vi.stubEnv("GEMINI_API_KEY", "test-key"); vi.stubEnv("GEMINI_MODEL", "gemini-test");
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ text: "The source defines theft.", evidence: [{ passageId: passage.passageId, quote: passage.text }] }) }] } }] })));
  vi.stubGlobal("fetch", fetchMock);
  expect(await f.user.action(api.chat.send, f.request)).toEqual({ kind: "available" });
  expect(await f.user.action(api.chat.send, f.request)).toEqual({ kind: "available" });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const result = (await f.user.query(api.chat.listMine, { caseId: f.caseId })).turns[0]?.result;
  expect(result).toMatchObject({ kind: "reply", text: "The source defines theft.", legalEvidence: { status: "answered", retrievalMethod: "keyword" } });
});
test("fabricated evidence is rejected rather than returned as a grounded answer", () => {
  const raw = JSON.stringify({ text: "You will win", evidence: [{ passageId: "invented", quote: passage.text }] });
  expect(parseGroundedReply(raw, [passage], "keyword", 2000)).toBeNull();
  expect(parseGroundedReply(JSON.stringify({ text: "Wrong", evidence: [{ passageId: passage.passageId, quote: "An invented legal rule that does not exist here." }] }), [passage], "keyword", 2000)).toBeNull();
});
test("embedding imports reject the existing incompatible local 384-dimensional vectors", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.legalCorpus.importBatch, { dataset, passages: [passage] });
  const docs = await t.run(ctx => ctx.db.query("legalPassages").collect());
  const id = docs[0]?._id; if (!id) throw new Error("Fixture missing");
  await expect(t.mutation(internal.legalCorpus.saveEmbedding, { passageId: id, embedding: Array(384).fill(1 / Math.sqrt(384)) })).rejects.toThrow("INVALID_INPUT");
});
test("a new corpus version reuses unchanged vectors, embeds only new passages, and publishes with full coverage", async () => {
  const t = convexTest(schema, modules);
  const unit = (seed: number) => { const raw = Array.from({ length: 768 }, (_, i) => Math.sin(i + seed)); const norm = Math.hypot(...raw); return raw.map(n => n / norm); };
  const v1 = "c".repeat(64), v2 = "d".repeat(64);
  const added = { ...passage, passageId: "ni-138", textHash: "e".repeat(64), text: "Section 138. Dishonour of cheque for insufficiency of funds in the account.", source: { title: "The Negotiable Instruments Act, 1881", url: "https://indiacode.gov.in/handle/123456789/535883", documentType: "statute" as const, act: "NI Act", sectionNumber: 138, cutoffVerified: false } };
  // Version 1 has one embedded passage and is live.
  await t.mutation(internal.legalCorpus.importBatch, { dataset: v1, passages: [passage] });
  const [old] = await t.run(ctx => ctx.db.query("legalPassages").collect());
  if (!old) throw new Error("Fixture missing");
  await t.mutation(internal.legalCorpus.saveEmbedding, { passageId: old._id, embedding: unit(1) });
  await t.action(internal.legalCorpus.publish, { dataset: v1, expectedCount: 1, embeddingModel: "gemini-embedding-001/768" });
  // Version 2 adds an India Code passage (an allowed official source).
  await t.mutation(internal.legalCorpus.importBatch, { dataset: v2, passages: [passage, added] });
  await expect(t.action(internal.legalCorpus.publish, { dataset: v2, expectedCount: 2, embeddingModel: "gemini-embedding-001/768" })).rejects.toThrow("INVALID_INPUT");
  expect(await t.mutation(internal.legalCorpus.copyEmbeddings, { from: v1, to: v2, cursor: null })).toMatchObject({ copied: 1, isDone: true });
  // Only the new passage still needs an embedding.
  const batch = await t.query(internal.legalCorpus.embeddingBatch, { dataset: v2, cursor: null });
  expect(batch.passages.map(p => p.passageId)).toEqual(["ni-138"]);
  await t.mutation(internal.legalCorpus.saveEmbedding, { passageId: batch.passages[0]!._id, embedding: unit(2) });
  expect((await t.query(internal.legalCorpus.embeddingBatch, { dataset: v2, cursor: null })).passages).toEqual([]);
  expect(await t.action(internal.legalCorpus.publish, { dataset: v2, expectedCount: 2, embeddingModel: "gemini-embedding-001/768" })).toEqual({ count: 2, missingVectors: 0 });
  expect(await t.query(api.legalCorpus.status, {})).toEqual({ configured: true, count: 2, vectors: true });
  // The live version cannot receive copied vectors.
  await expect(t.mutation(internal.legalCorpus.copyEmbeddings, { from: v1, to: v2, cursor: null })).rejects.toThrow("CONFLICT");
});
test("a corpus can go live with some vectors missing, and the gaps are filled in later without replacing any vector", async () => {
  const t = convexTest(schema, modules);
  const unit = (seed: number) => { const raw = Array.from({ length: 768 }, (_, i) => Math.cos(i * seed)); const norm = Math.hypot(...raw); return raw.map(n => n / norm); };
  const second = { ...passage, passageId: "bns-304", textHash: "f".repeat(64), text: "Snatching is theft where the offender suddenly seizes movable property." };
  await t.mutation(internal.legalCorpus.importBatch, { dataset, passages: [passage, second] });
  const [first, other] = await t.run(ctx => ctx.db.query("legalPassages").collect());
  if (!first || !other) throw new Error("Fixture missing");
  await t.mutation(internal.legalCorpus.saveEmbedding, { passageId: first._id, embedding: unit(1) });
  await expect(t.action(internal.legalCorpus.publish, { dataset, expectedCount: 2, embeddingModel: "gemini-embedding-001/768" })).rejects.toThrow("INVALID_INPUT");
  expect(await t.action(internal.legalCorpus.publish, { dataset, expectedCount: 2, embeddingModel: "gemini-embedding-001/768", allowMissingVectors: true })).toEqual({ count: 2, missingVectors: 1 });
  // Live: the missing vector may be added once; existing vectors cannot be replaced.
  await t.mutation(internal.legalCorpus.saveEmbedding, { passageId: other._id, embedding: unit(2) });
  await expect(t.mutation(internal.legalCorpus.saveEmbedding, { passageId: first._id, embedding: unit(3) })).rejects.toThrow("CONFLICT");
  expect((await t.query(internal.legalCorpus.embeddingBatch, { dataset, cursor: null })).passages).toEqual([]);
});
