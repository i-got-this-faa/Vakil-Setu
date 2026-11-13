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
function run(name, value) { execFileSync(process.execPath, [cli, "run", name, JSON.stringify(value), "--deployment-name", deployment], { cwd: backend, stdio: "inherit" }); }
for (const batch of batches) run("legalCorpus:importBatch", batch);
if (embed) for (let after = 0; after < manifest.count; after += 10) run("legalEmbedding:indexBatch", { dataset: manifest.dataset, after });
run("legalCorpus:publish", { dataset: manifest.dataset, expectedCount: manifest.count, ...(embed ? { embeddingModel: "gemini-embedding-001/768" } : {}) });
console.log("Reviewed legal dataset published. Import/re-embedding completion is not a legal-accuracy certification.");
