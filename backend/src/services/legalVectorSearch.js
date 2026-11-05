import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import path from "node:path";
import { corpusDir, corpusPassages, digest, loadCorpus, rankPassages } from "./legalCorpus.js";
import { embedTexts, embeddingProfile, normalizeVector } from "./legalEmbeddings.js";

export const embeddingInput = passage => [passage.source.title, passage.sectionNumber ? `Section ${passage.sectionNumber}: ${passage.sectionTitle}` : null, passage.text].filter(Boolean).join("\n");
export const vectorPath = () => path.join(corpusDir(), "vectors.json");
export const corpusFingerprint = corpus => digest(JSON.stringify(corpusPassages(corpus).map(p => [p.id, p.text, p.source])));
const sameProfile = profile => JSON.stringify(profile) === JSON.stringify(embeddingProfile());
export async function readVectorIndex(filename = vectorPath()) {
  try { return JSON.parse(await readFile(filename, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
export function validateIndex(index, corpus) {
  if (!index || index.version !== 1 || !sameProfile(index.profile) || index.fingerprint !== corpusFingerprint(corpus)) throw new Error("Vector index missing or outdated. Run npm run legal:embed --prefix backend.");
  const passages = corpusPassages(corpus);
  if (!Number.isInteger(index.dimensions) || index.dimensions < 1 || index.entries.length !== passages.length) throw new Error("Invalid vector index dimensions or coverage");
  const expected = new Map(passages.map(p => [p.id, digest(embeddingInput(p))]));
  for (const entry of index.entries) {
    if (expected.get(entry.id) !== entry.textHash || !Array.isArray(entry.vector) || entry.vector.length !== index.dimensions || entry.vector.some(v => !Number.isFinite(v)) || Math.abs(Math.hypot(...entry.vector) - 1) > 0.001) throw new Error("Invalid vector index entry");
    expected.delete(entry.id);
  }
  if (expected.size) throw new Error("Vector index has missing passages");
}
export async function buildVectorIndex(corpus, { embed = embedTexts, filename = vectorPath(), onProgress = () => {} } = {}) {
  const passages = corpusPassages(corpus);
  if (!passages.length) throw new Error("Cannot index an empty legal corpus");
  if (new Set(passages.map(p => p.id)).size !== passages.length) throw new Error("Duplicate passage IDs");
  const previous = await readVectorIndex(filename);
  const reusable = new Map(previous && sameProfile(previous.profile) ? previous.entries.map(e => [e.id, e]) : []);
  const entries = [];
  for (const passage of passages) {
    const textHash = digest(embeddingInput(passage));
    const old = reusable.get(passage.id);
    const vector = old?.textHash === textHash ? normalizeVector(old.vector) : normalizeVector((await embed([embeddingInput(passage)]))[0]);
    entries.push({ id: passage.id, textHash, vector });
    onProgress(entries.length, passages.length);
  }
  const index = { version: 1, profile: embeddingProfile(), fingerprint: corpusFingerprint(corpus), builtAt: new Date().toISOString(), dimensions: entries[0].vector.length, entries };
  validateIndex(index, corpus);
  await mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(index));
  await rename(temporary, filename);
  return index;
}
export function rankVectors(passages, index, queryVector, limit = 5) {
  const vector = normalizeVector(queryVector);
  if (vector.length !== index.dimensions) throw new Error("Query embedding dimension mismatch");
  const vectors = new Map(index.entries.map(e => [e.id, e.vector]));
  return passages.map(p => ({ ...p, score: vectors.get(p.id).reduce((sum, v, i) => sum + v * vector[i], 0) }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, limit);
}
export function reciprocalRankFusion(lexical, semantic, limit = 5) {
  const combined = new Map();
  for (const [kind, ranked] of [["bm25", lexical], ["vector", semantic]]) ranked.forEach((p, i) => {
    const entry = combined.get(p.id) || { ...p, score: 0, scores: {} };
    entry.score += 1 / (60 + i + 1);
    entry.scores[kind] = p.score;
    combined.set(p.id, entry);
  });
  return [...combined.values()].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, limit);
}
export async function retrieveLegalPassages(query, options = {}, dependencies = {}) {
  const corpus = dependencies.corpus || await loadCorpus();
  const mode = options.retrievalMode || process.env.LEGAL_RETRIEVAL_MODE || "auto";
  if (!["auto", "bm25", "vector", "hybrid"].includes(mode)) throw new Error("Invalid retrieval mode");
  const lexical = () => rankPassages(corpus, query, options);
  if (mode === "bm25" || !corpus.documents.length || !query.trim()) return { passages: lexical(), retrievalMethod: "bm25" };
  let index;
  try {
    index = dependencies.index || await readVectorIndex();
    validateIndex(index, corpus);
  } catch (error) {
    if (mode !== "auto") throw error;
    return { passages: lexical(), retrievalMethod: "bm25", retrievalWarning: error.message };
  }
  const candidates = corpusPassages(corpus, options);
  if (!candidates.length) return { passages: [], retrievalMethod: mode === "vector" ? "vector" : "hybrid" };
  const embed = dependencies.embed || embedTexts;
  const [queryVector] = await embed([query], { query: true });
  const limit = options.limit || 5;
  const semantic = rankVectors(candidates, index, queryVector, mode === "vector" ? limit : Math.max(20, limit));
  return {
    passages: mode === "vector" ? semantic : reciprocalRankFusion(rankPassages(corpus, query, { ...options, limit: Math.max(20, limit) }), semantic, limit),
    retrievalMethod: mode === "vector" ? "vector" : "hybrid", embeddingModel: index.profile.model
  };
}
