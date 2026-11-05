import "dotenv/config";
import { readFile, writeFile, mkdir, rename, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chunkPages, corpusDir, digest, loadCorpus, validateSource } from "../src/services/legalCorpus.js";
import { fetchOfficial } from "../src/services/legalSourceFetch.js";

const run = promisify(execFile);
const defaultManifest = fileURLToPath(new URL("../config/judgments.sources.json", import.meta.url));
const manifest = JSON.parse(await readFile(process.argv[2] || defaultManifest, "utf8"));
if (!Array.isArray(manifest) || !manifest.length) throw new Error("Manifest must be a nonempty source array");
manifest.forEach(validateSource);
await run("pdftotext", ["-v"]); // Fail before downloading if Poppler is missing.
const directory = corpusDir();
await mkdir(path.join(directory, "raw"), { recursive: true });
const lockPath = path.join(directory, ".ingest-lock");
await mkdir(lockPath); // Refuse concurrent writers. Remove a stale lock only after checking no import is active.
let failures = 0;
try {
  const corpus = await loadCorpus(directory, { includeStatutes: false });
  for (const entry of manifest) {
    let temporary;
    try {
      const { bytes, finalUrl } = await fetchOfficial(entry.url);
      // Some official PDFs have a UTF-8 BOM and blank line before the PDF header.
      if (!bytes.subarray(0, 64).toString("utf8").replace(/^[\s\uFEFF]+/u, "").startsWith("%PDF-")) throw new Error("Source is not a PDF (possibly an access or CAPTCHA page)");
      const contentHash = digest(bytes);
      const id = digest(entry.url).slice(0, 24);
      const existing = corpus.documents.find((d) => d.id === id);
      if (existing?.contentHash === contentHash && JSON.stringify(existing.source) === JSON.stringify(entry)) {
        console.log(`Unchanged: ${entry.caseNumber}`);
        continue;
      }
      const duplicate = corpus.documents.find((d) => d.contentHash === contentHash && d.id !== id);
      if (duplicate) throw new Error(`Duplicate PDF already stored as ${duplicate.source.caseNumber}; review source aliases`);
      temporary = await mkdtemp(path.join(tmpdir(), "vakil-judgment-"));
      const pdfPath = path.join(temporary, "source.pdf");
      const textPath = path.join(temporary, "source.txt");
      await writeFile(pdfPath, bytes);
      await run("pdftotext", ["-layout", "-enc", "UTF-8", pdfPath, textPath], { timeout: 60000 });
      const text = await readFile(textPath, "utf8");
      const pages = text.split("\f").filter((p) => p.trim());
      if (!pages.length || pages.some((p) => (p.match(/\p{L}/gu) || []).length < 30)) {
        throw new Error("Insufficient extractable text: OCR and manual review needed");
      }
      const chunks = chunkPages(text).map((chunk, index) => ({ ...chunk, id: `${id}-${contentHash.slice(0, 12)}-${index + 1}` }));
      const document = { id, source: entry, finalUrl, contentHash, fetchedAt: new Date().toISOString(), pageCount: pages.length, chunks };
      const rawName = `${id}-${contentHash.slice(0, 12)}`;
      await writeFile(path.join(directory, "raw", `${rawName}.pdf`), bytes);
      await writeFile(path.join(directory, "raw", `${rawName}.txt`), text);
      corpus.documents = [...corpus.documents.filter((d) => d.id !== id), document];
      await writeFile(path.join(directory, "corpus.json.tmp"), JSON.stringify(corpus, null, 2));
      await rename(path.join(directory, "corpus.json.tmp"), path.join(directory, "corpus.json"));
      console.log(`Imported ${entry.caseNumber}: ${pages.length} pages, ${chunks.length} passages`);
    } catch (error) {
      failures++;
      console.error(`FAILED ${entry.url}: ${error.message}`);
    } finally {
      if (temporary) await rm(temporary, { recursive: true, force: true });
    }
  }
  console.log(`Corpus: ${corpus.documents.length} judgments. Failures: ${failures}.`);
} finally {
  await rm(lockPath, { recursive: true, force: true });
}
if (failures) process.exitCode = 1;
