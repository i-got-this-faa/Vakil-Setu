import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const args = process.argv.slice(2);
const directory = resolve(args[0] || "../backend/data/convex-export");
const index = args.indexOf("--deployment-name");
const deployment = index < 0 ? "" : args[index + 1];
if (!deployment || !/^[a-z0-9-]+$/.test(deployment)) throw new Error("Specify the exact reviewed --deployment-name. No deployment is inferred.");
const manifest = JSON.parse(readFileSync(resolve(directory, "manifest.json"), "utf8"));
if (!/^[a-f0-9]{64}$/.test(manifest.dataset) || !Number.isInteger(manifest.count) || !Array.isArray(manifest.batches)) throw new Error("Invalid export manifest.");
const batches = manifest.batches.map(name => {
  if (typeof name !== "string" || !/^[a-f0-9]{16}-\d+\.json$/.test(name)) throw new Error("Invalid batch filename.");
  const batch = JSON.parse(readFileSync(resolve(directory, name), "utf8"));
  if (batch.dataset !== manifest.dataset || !Array.isArray(batch.passages)) throw new Error("Batch dataset mismatch.");
  return batch;
});
if (batches.reduce((n, b) => n + b.passages.length, 0) !== manifest.count) throw new Error("Batch coverage differs from manifest.");
const embed = args.includes("--embed");
console.log(JSON.stringify({ deployment, count: manifest.count, embed, apply: args.includes("--apply") }));
if (!args.includes("--apply")) { console.log("Dry run only. Review the target and corpus; add --apply to write to that deployment."); process.exit(0); }
const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backend = resolve(workspace, "packages/backend");
const cli = resolve(backend, "node_modules/convex/bin/main.js");
function run(name, value) { return JSON.parse(execFileSync(process.execPath, [cli, "run", name, JSON.stringify(value), "--deployment-name", deployment], { cwd: backend, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }) || "null"); }
const copyIndex = args.indexOf("--copy-embeddings-from");
const copyFrom = copyIndex < 0 ? "" : args[copyIndex + 1];
if (copyIndex >= 0 && !/^[a-f0-9]{64}$/.test(copyFrom)) throw new Error("--copy-embeddings-from needs the previous dataset ID.");
const skipImport = args.includes("--skip-import");
// Arguments travel on the command line, which Windows caps at ~32K characters: split a large batch
// into smaller importBatch calls (each still 1–25 passages of the same staged dataset).
function importChunks(batch) {
  if (JSON.stringify(batch).length <= 24_000 || batch.passages.length === 1) return void run("legalCorpus:importBatch", batch);
  const half = Math.ceil(batch.passages.length / 2);
  importChunks({ ...batch, passages: batch.passages.slice(0, half) });
  importChunks({ ...batch, passages: batch.passages.slice(half) });
}
if (!skipImport) for (const [i, batch] of batches.entries()) { importChunks(batch); console.log(`imported batch ${i + 1}/${batches.length}`); }
if (copyFrom) {
  // Unchanged passages keep their vectors, so only new passages use the embedding quota.
  let cursor = null, copied = 0;
  for (;;) { const page = run("legalCorpus:copyEmbeddings", { from: copyFrom, to: manifest.dataset, cursor }); copied += page.copied; if (page.isDone) break; cursor = page.continueCursor; }
  console.log(`reused ${copied} vectors from ${copyFrom.slice(0, 12)}`);
}
if (embed) {
  let cursor = null, indexed = 0;
  for (;;) {
    let page = null;
    // A rate-limited batch is retried after a pause; passages already embedded are skipped on retry.
    for (let attempt = 1; !page; attempt++) {
      try { page = run("legalEmbedding:indexBatch", { dataset: manifest.dataset, cursor }); }
      catch (error) { if (attempt >= 6) throw error; console.log(`embedding paused (attempt ${attempt}); retrying in ${attempt * 20}s`); execFileSync("sleep", [String(attempt * 20)]); }
    }
    indexed += page.indexed;
    if (page.indexed) console.log(`embedded ${indexed}`);
    if (page.isDone) break;
    cursor = page.continueCursor;
  }
}
// --vectors: the dataset has (some) vectors even if this run did not embed; --allow-missing-vectors publishes with gaps.
const vectors = embed || args.includes("--vectors");
const published = run("legalCorpus:publish", { dataset: manifest.dataset, expectedCount: manifest.count, ...(vectors ? { embeddingModel: "gemini-embedding-001/768" } : {}), ...(args.includes("--allow-missing-vectors") ? { allowMissingVectors: true } : {}) });
console.log(JSON.stringify(published));
console.log("Reviewed legal dataset published. Import/re-embedding completion is not a legal-accuracy certification.");
