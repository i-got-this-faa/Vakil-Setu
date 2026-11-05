import dotenv from "dotenv";
import { readFile, writeFile, mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { corpusDir } from "../src/services/legalCorpus.js";
import { buildBnsDocument, validateFirecrawlStatute } from "../src/services/legalStatutes.js";
import { scrapeOfficialStatute } from "../src/services/firecrawlService.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });
const source = JSON.parse(await readFile(new URL("../config/bns.source.json", import.meta.url), "utf8"));
const directory = corpusDir();
const rawDirectory = path.join(directory, "firecrawl");
await mkdir(rawDirectory, { recursive: true });
const lock = path.join(directory, ".statute-ingest-lock");
await mkdir(lock);
try {
  const cache = path.join(rawDirectory, "ncrb-bns-chapters.json");
  let response;
  if (!process.argv.includes("--refresh")) {
    try { response = JSON.parse(await readFile(cache, "utf8")); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  if (!response) {
    response = await scrapeOfficialStatute(source.url);
    // Validate before replacing a previously good cache.
    const markdown = validateFirecrawlStatute(response, source.url);
    buildBnsDocument(source, markdown, response.data.metadata);
    await writeFile(`${cache}.tmp`, JSON.stringify(response, null, 2));
    await rename(`${cache}.tmp`, cache);
  }
  const markdown = validateFirecrawlStatute(response, source.url);
  const document = buildBnsDocument(source, markdown, response.data.metadata);
  let corpus = { version: 1, documents: [] };
  try { corpus = JSON.parse(await readFile(path.join(directory, "statutes.json"), "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (corpus.version !== 1 || !Array.isArray(corpus.documents)) throw new Error("Invalid statute corpus");
  const existing = corpus.documents.find((d) => d.id === document.id);
  if (existing?.contentHash === document.contentHash && JSON.stringify(existing.source) === JSON.stringify(source)) {
    console.log(`Unchanged: BNS (${document.sectionCount} sections). No Firecrawl call needed without --refresh.`);
  } else {
    corpus.documents = [...corpus.documents.filter((d) => d.id !== document.id), document];
    await writeFile(path.join(rawDirectory, `bns-${document.contentHash.slice(0, 12)}.md`), markdown);
    await writeFile(path.join(directory, "statutes.json.tmp"), JSON.stringify(corpus, null, 2));
    await rename(path.join(directory, "statutes.json.tmp"), path.join(directory, "statutes.json"));
    console.log(`Imported BNS: ${document.sectionCount} sections, ${document.chunks.length} passages.`);
  }
  console.log("Requested cutoff: 2025-12-31. Amendment and commencement verification remains incomplete.");
} finally {
  await rm(lock, { recursive: true, force: true });
}
