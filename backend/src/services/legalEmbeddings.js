import { fileURLToPath } from "node:url";

export const embeddingModel = () => process.env.LEGAL_EMBEDDING_MODEL || "Xenova/multilingual-e5-small";
export const embeddingProfile = () => ({ model: embeddingModel(), dtype: "q8", pooling: "mean", windowTokens: 384, stride: 320, documentContext: "source-and-section", version: 2 });
let extractor;
let activeModel;
async function getExtractor() {
  const model = embeddingModel();
  if (activeModel !== model || !extractor) {
    activeModel = model;
    extractor = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.cacheDir = process.env.LEGAL_MODEL_CACHE || fileURLToPath(new URL("../../data/legal-models", import.meta.url));
      // Downloads happen only in the explicit indexing command. Requests use cached files.
      return pipeline("feature-extraction", model, {
        dtype: "q8", local_files_only: process.env.LEGAL_ALLOW_MODEL_DOWNLOAD !== "true",
        session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 }
      });
    })().catch(error => { extractor = undefined; throw error; });
  }
  return extractor;
}
export function normalizeVector(vector) {
  if (!Array.isArray(vector) || !vector.length || vector.some(v => !Number.isFinite(v))) throw new Error("Invalid embedding vector");
  const norm = Math.hypot(...vector);
  if (!norm) throw new Error("Zero embedding vector");
  return vector.map(v => v / norm);
}

// Cover long passages using token windows, then average their normalized embeddings.
// This preserves the original legal chunks and does not silently discard their endings.
export async function embedTexts(texts, { query = false } = {}) {
  const pipe = await getExtractor();
  const results = [];
  for (const text of texts) {
    if (typeof text !== "string" || !text.trim()) throw new Error("Cannot embed empty text");
    const ids = pipe.tokenizer.encode(text, { add_special_tokens: false });
    const windows = [];
    for (let start = 0; start < ids.length; start += 320) {
      windows.push(`${query ? "query" : "passage"}: ${pipe.tokenizer.decode(ids.slice(start, start + 384), { skip_special_tokens: true })}`);
      if (start + 384 >= ids.length) break;
    }
    let sum;
    for (let start = 0; start < windows.length; start += 4) {
      const output = await pipe(windows.slice(start, start + 4), { pooling: "mean", normalize: true, truncation: true, max_length: 512 });
      for (const vector of output.tolist()) {
        sum ??= Array(vector.length).fill(0);
        vector.forEach((value, index) => { sum[index] += value; });
      }
    }
    results.push(normalizeVector(sum));
  }
  return results;
}
