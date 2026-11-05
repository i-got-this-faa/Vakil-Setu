import "dotenv/config";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chunkPages, corpusDir, digest, loadCorpus, validateSource } from "../src/services/legalCorpus.js";
import { buildBnsDocument, validateFirecrawlStatute } from "../src/services/legalStatutes.js";
import { fetchOfficial } from "../src/services/legalSourceFetch.js";

const corpus = await loadCorpus();
const documents = [];
const ids = new Set();
for (const document of corpus.documents) {
  const errors = [];
  const checks = [];
  const { source } = document;
  let reconstructed;
  try {
    for (const chunk of document.chunks) {
      if (ids.has(chunk.id)) errors.push(`Duplicate passage ID: ${chunk.id}`);
      ids.add(chunk.id);
      if (!chunk.text?.trim()) errors.push(`Empty passage: ${chunk.id}`);
    }
    if (source.documentType === "judgment") {
      validateSource(source);
      const base = `${document.id}-${document.contentHash.slice(0, 12)}`;
      const pdf = await readFile(path.join(corpusDir(), "raw", `${base}.pdf`));
      const text = await readFile(path.join(corpusDir(), "raw", `${base}.txt`), "utf8");
      if (digest(pdf) !== document.contentHash) errors.push("Saved PDF hash differs from indexed document hash");
      else checks.push("Saved PDF SHA-256 matches indexed source hash");
      reconstructed = chunkPages(text).map((chunk, i) => ({ ...chunk, id: `${base}-${i + 1}` }));
      const pages = text.split("\f").filter(p => p.trim()).length;
      if (pages !== document.pageCount) errors.push("Saved text page count differs from index");
      checks.push(`${pages} extracted PDF pages; page references preserved`);
      if (process.argv.includes("--online")) {
        const live = await fetchOfficial(source.url);
        checks.push(`Official URL retrieved: ${live.finalUrl}`);
        if (digest(live.bytes) !== document.contentHash) errors.push("Current official PDF differs from saved PDF; review before re-ingesting");
        else checks.push("Current official PDF SHA-256 matches saved PDF");
      }
    } else {
      const response = JSON.parse(await readFile(path.join(corpusDir(), "firecrawl", "ncrb-bns-chapters.json"), "utf8"));
      const markdown = validateFirecrawlStatute(response, source.url);
      const rebuilt = buildBnsDocument(source, markdown, response.data.metadata);
      if (rebuilt.contentHash !== document.contentHash) errors.push("Cached statute text hash differs from index");
      else checks.push("Cached NCRB scrape hash matches index");
      reconstructed = rebuilt.chunks;
      if (rebuilt.sections.length !== 358 || document.sections.length !== 358) errors.push("BNS section coverage differs from 358");
      if (JSON.stringify(rebuilt.sections) !== JSON.stringify(document.sections)) errors.push("Stored sections differ from cached source reconstruction");
      checks.push("Ordered BNS sections 1–358 reconstructed from cached scrape");
    }
    if (JSON.stringify(reconstructed) !== JSON.stringify(document.chunks)) errors.push("Indexed chunks differ from saved source reconstruction");
    else checks.push("Every indexed chunk matches reconstruction from saved source text");
  } catch (error) { errors.push(error.message); }
  documents.push({ title: source.title, url: source.url, documentType: source.documentType, pages: document.pageCount, sections: document.sectionCount, passages: document.chunks.length, checks, errors });
}
const report = {
  auditedAt: new Date().toISOString(), onlinePdfCheck: process.argv.includes("--online"),
  documents, totalPassages: ids.size, integrityPassed: documents.length > 0 && documents.every(d => !d.errors.length),
  limitations: [
    "Integrity checks compare the index with saved source material; they do not validate legal interpretation.",
    "BNS amendments and provision-specific commencement through 2025-12-31 remain unverified.",
    "Only three judgments from one High Court are indexed; this is not representative coverage of Indian case law.",
    "Judgment metadata and subsequent treatment require human legal review; no holding or outcome labels have been verified.",
    "The NCRB HTML is a reference reproduction; this audit does not compare every section with the Gazette or a current consolidated statute.",
    "PDF-to-text extraction may contain reading-order or formatting errors even when all pages are present."
  ]
};
await mkdir(corpusDir(), { recursive: true });
await writeFile(path.join(corpusDir(), "audit.json"), JSON.stringify(report, null, 2));
const markdown = `# RAG data audit\n\nGenerated: ${report.auditedAt}\n\nSource integrity: **${report.integrityPassed ? "PASS" : "FAIL"}**. ${report.totalPassages} indexed passages. Live official PDF comparison: ${report.onlinePdfCheck ? "requested; see document checks" : "not run"}.\n\n` + documents.map(d => `## ${d.title}\n\nSource: ${d.url}\n\n${d.passages} passages${d.pages ? `; ${d.pages} pages` : ""}${d.sections ? `; ${d.sections} sections` : ""}.\n\n${d.checks.map(c => `- ${c}`).join("\n")}\n${d.errors.map(e => `- ERROR: ${e}`).join("\n")}\n`).join("\n") + `\n## Limits of verification\n\n${report.limitations.map(l => `- ${l}`).join("\n")}\n`;
await writeFile(fileURLToPath(new URL("../../docs/RAG_DATA_AUDIT.md", import.meta.url)), markdown);
console.log(JSON.stringify(report, null, 2));
if (!report.integrityPassed) process.exitCode = 1;
