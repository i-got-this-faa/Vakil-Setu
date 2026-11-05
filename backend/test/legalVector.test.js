import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildVectorIndex, retrieveLegalPassages, validateIndex, reciprocalRankFusion } from "../src/services/legalVectorSearch.js";

const corpus = { documents: [{ id: "doc", source: { documentType: "statute", act: "BNS" }, chunks: [
  { id: "theft", text: "Dishonestly taking movable property without consent.", sectionNumber: 303 },
  { id: "injury", text: "Causing bodily hurt and physical injury.", sectionNumber: 115 }
] }] };
const embed = async texts => texts.map(text => /property|चोरी/.test(text) ? [1, 0] : [0, 1]);

test("vector retrieval finds cross-language evidence without lexical overlap and preserves citations", async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "vakil-vector-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const filename = path.join(dir, "vectors.json");
  const index = await buildVectorIndex(corpus, { embed, filename });
  const result = await retrieveLegalPassages("चोरी", { retrievalMode: "vector", limit: 1 }, { corpus, index, embed });
  assert.equal(result.retrievalMethod, "vector");
  assert.equal(result.passages[0].id, "theft");
  assert.equal(result.passages[0].source.sectionNumber, 303);
  const filtered = await retrieveLegalPassages("चोरी", { retrievalMode: "vector", sectionNumber: 115 }, { corpus, index, embed });
  assert.deepEqual(filtered.passages.map(p => p.id), ["injury"]);
  const none = await retrieveLegalPassages("चोरी", { retrievalMode: "vector", court: "Other court" }, { corpus, index, embed });
  assert.deepEqual(none.passages, []);
  let calls = 0;
  await buildVectorIndex(corpus, { embed: async () => { calls++; throw new Error("Must reuse unchanged embeddings"); }, filename });
  assert.equal(calls, 0);
});

test("stale text, missing entries, incompatible vectors and changed model profiles are rejected", async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "vakil-vector-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const index = await buildVectorIndex(corpus, { embed, filename: path.join(dir, "vectors.json") });
  const changed = structuredClone(corpus);
  changed.documents[0].chunks[0].text += " Updated.";
  assert.throws(() => validateIndex(index, changed), /outdated/);
  assert.throws(() => validateIndex({ ...index, entries: index.entries.slice(1) }, corpus), /coverage/);
  const bad = structuredClone(index); bad.entries[0].vector = [NaN, 1];
  assert.throws(() => validateIndex(bad, corpus), /entry/);
  assert.throws(() => validateIndex({ ...index, profile: { model: "other" } }, corpus), /outdated/);
  await assert.rejects(retrieveLegalPassages("property", { retrievalMode: "vector" }, { corpus: changed, index, embed }), /outdated/);
  const fallback = await retrieveLegalPassages("property", {}, { corpus: changed, index, embed });
  assert.equal(fallback.retrievalMethod, "bm25");
  assert.match(fallback.retrievalWarning, /outdated/);
});

test("rank fusion rewards agreement rather than mixing incomparable raw scores", () => {
  const result = reciprocalRankFusion([{ id: "a", score: 1000 }, { id: "b", score: 1 }], [{ id: "b", score: 0.8 }, { id: "c", score: 0.7 }]);
  assert.equal(result[0].id, "b");
  assert.equal(result.length, 3);
  assert.deepEqual(result[0].scores, { bm25: 1, vector: 0.8 });
});
