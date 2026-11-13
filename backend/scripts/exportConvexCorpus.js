import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { corpusPassages, digest, loadCorpus } from "../src/services/legalCorpus.js";
// Offline only: this tool never reads .env or contacts a deployment.
const directory = path.resolve(process.argv[2] || "backend/data/convex-export");
const revision = process.argv[3] || "v1";
const corpus = await loadCorpus();
const fields = ["title", "url", "documentType", "act", "sectionNumber", "sectionTitle", "cutoffVerified", "court", "decisionDate", "caseNumber", "judges", "requestedCutoff", "versionWarning"];
const passages = corpusPassages(corpus).map(p => ({ passageId: p.id, text: p.text, textHash: digest(p.text), source: Object.fromEntries(fields.filter(k => p.source[k] !== undefined).map(k => [k, p.source[k]])), ...(p.page == null ? {} : { page: p.page }) })).sort((a, b) => a.passageId.localeCompare(b.passageId));
if (!passages.length) throw new Error("No source corpus exists locally. Run the reviewed ingestion first.");
const dataset = digest(JSON.stringify({ revision, passages }));
await mkdir(directory, { recursive: true });
const batches = [];
for (let i = 0; i < passages.length; i += 25) {
  const name = `${dataset.slice(0, 16)}-${i / 25}.json`;
  await writeFile(path.join(directory, name), JSON.stringify({ dataset, passages: passages.slice(i, i + 25) })); batches.push(name);
}
await writeFile(path.join(directory, "manifest.json"), JSON.stringify({ dataset, revision, count: passages.length, batches, embeddingProfile: "gemini-embedding-001/768", requiresReembedding: true }, null, 2));
console.log(JSON.stringify({ directory, dataset, count: passages.length, batches: batches.length, networkRequests: 0 }));
