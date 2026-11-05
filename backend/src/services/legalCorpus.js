import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const defaultCorpusDir = fileURLToPath(new URL("../../data/legal", import.meta.url));
export const corpusDir = () => process.env.LEGAL_CORPUS_DIR || defaultCorpusDir;
export const digest = (text) => createHash("sha256").update(text).digest("hex");

export function validateSource(source) {
  for (const field of ["url", "title", "court", "caseNumber", "decisionDate", "language", "documentType"]) {
    if (typeof source[field] !== "string" || !source[field].trim()) throw new Error(`Missing source ${field}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source.decisionDate) || !Number.isFinite(Date.parse(source.decisionDate)) ||
      new Date(source.decisionDate).toISOString().slice(0, 10) !== source.decisionDate) {
    throw new Error("decisionDate must be a real ISO date (YYYY-MM-DD)");
  }
  if (!Array.isArray(source.judges) || !source.judges.length || source.judges.some((j) => typeof j !== "string" || !j.trim())) {
    throw new Error("Source requires judges from the document, not inferred names");
  }
  if (source.documentType !== "judgment") throw new Error("Only judgments are supported in this corpus");
  const url = new URL(source.url);
  if (url.protocol !== "https:" || url.username || url.password || url.port) throw new Error("Source must be a public HTTPS URL");
  return source;
}

// Keep page boundaries and exact normalized offsets so every passage is locatable.
export function chunkPages(text, maxChars = 1800, overlap = 250) {
  if (!Number.isInteger(maxChars) || maxChars < 100 || !Number.isInteger(overlap) || overlap < 0 || overlap >= maxChars) throw new Error("Invalid chunk sizes");
  const chunks = [];
  text.split("\f").forEach((rawPage, index) => {
    const page = rawPage.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    let start = 0;
    while (start < page.length) {
      let end = Math.min(start + maxChars, page.length);
      if (end < page.length) {
        const boundary = page.lastIndexOf(" ", end);
        if (boundary > start + Math.max(overlap, maxChars / 2)) end = boundary;
      }
      chunks.push({ page: index + 1, start, end, text: page.slice(start, end) });
      if (end === page.length) break;
      start = end - overlap;
    }
  });
  return chunks;
}

export async function loadCorpus(directory = corpusDir(), { includeStatutes = true } = {}) {
  const combined = { version: 1, documents: [] };
  for (const filename of includeStatutes ? ["corpus.json", "statutes.json"] : ["corpus.json"]) {
    try {
      const corpus = JSON.parse(await readFile(path.join(directory, filename), "utf8"));
      if (corpus.version !== 1 || !Array.isArray(corpus.documents)) throw new Error(`Invalid legal corpus: ${filename}`);
      combined.documents.push(...corpus.documents);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return combined;
}

const stopwords = new Set("a an and are as at be been by for from has have how i in is it my of on or that the this to was were what which with would can could should me".split(" "));
const tokens = (text) => String(text).toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter((word) => !stopwords.has(word)) || [];

export function corpusPassages(corpus, { court, dateFrom, dateTo, documentType, sectionNumber, act } = {}) {
  return corpus.documents
    .filter((d) => (!court || d.source.court === court) && (!dateFrom || d.source.decisionDate >= dateFrom) && (!dateTo || d.source.decisionDate <= dateTo) && (!documentType || d.source.documentType === documentType) && (!act || d.source.act === act))
    .flatMap((d) => d.chunks.map((chunk) => ({ ...chunk, documentId: d.id, source: chunk.sectionNumber ? { ...d.source, sectionNumber: chunk.sectionNumber, sectionTitle: chunk.sectionTitle, url: `${d.source.url}#${chunk.sectionNumber}` } : d.source })))
    .filter((chunk) => !sectionNumber || chunk.sectionNumber === sectionNumber);
}

export function rankPassages(corpus, query, options = {}) {
  const { limit = 5 } = options;
  const passages = corpusPassages(corpus, options);
  const words = [...new Set(tokens(query))];
  if (!words.length || !passages.length) return [];
  const tokenLists = passages.map((p) => tokens(p.text));
  const averageLength = tokenLists.reduce((sum, list) => sum + list.length, 0) / tokenLists.length;
  const documentFrequency = new Map(words.map((word) => [word, tokenLists.filter((list) => list.includes(word)).length]));
  return passages.map((passage, index) => {
    const list = tokenLists[index];
    let score = 0;
    for (const word of words) {
      const frequency = list.filter((term) => term === word).length;
      if (!frequency) continue;
      const df = documentFrequency.get(word);
      const idf = Math.log(1 + (passages.length - df + 0.5) / (df + 0.5));
      score += idf * frequency * 2.2 / (frequency + 1.2 * (0.25 + 0.75 * list.length / (averageLength || 1)));
    }
    return { ...passage, score };
  }).filter((p) => p.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, limit);
}
