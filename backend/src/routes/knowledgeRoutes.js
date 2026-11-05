import { Router } from "express";
import { loadCorpus } from "../services/legalCorpus.js";
import { answerLegalQuestion } from "../services/legalRagService.js";

import { retrieveLegalPassages } from "../services/legalVectorSearch.js";

const router = Router();

function parseQuery(body) {
  if (typeof body?.query !== "string" || !body.query.trim() || body.query.length > 2000) throw new Error("query must contain 1-2000 characters");
  const options = {};
  if (body.limit !== undefined && (!Number.isInteger(body.limit) || body.limit < 1 || body.limit > 10)) throw new Error("limit must be an integer from 1 to 10");
  options.limit = body.limit || 5;
  if (body.retrievalMode !== undefined && !["auto", "bm25", "vector", "hybrid"].includes(body.retrievalMode)) throw new Error("retrievalMode must be auto, bm25, vector, or hybrid");
  options.retrievalMode = body.retrievalMode;
  for (const key of ["act", "documentType"]) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== "string" || !body[key].trim() || body[key].length > 100) throw new Error(`Invalid ${key}`);
      options[key] = body[key].trim();
    }
  }
  if (body.sectionNumber !== undefined) {
    if (!Number.isInteger(body.sectionNumber) || body.sectionNumber < 1) throw new Error("sectionNumber must be a positive integer");
    options.sectionNumber = body.sectionNumber;
  }
  if (body.court !== undefined) {
    if (typeof body.court !== "string" || !body.court.trim() || body.court.length > 200) throw new Error("court must contain 1-200 characters");
    options.court = body.court.trim();
  }
  for (const key of ["dateFrom", "dateTo"]) {
    if (body[key] !== undefined) {
      const value = body[key];
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error(`${key} must be a real ISO date`);
      options[key] = value;
    }
  }
  if (options.dateFrom && options.dateTo && options.dateFrom > options.dateTo) throw new Error("dateFrom must not be later than dateTo");
  if (body.language !== undefined && !["en", "hi"].includes(body.language)) throw new Error("language must be en or hi");
  options.language = body.language || "en";
  return { query: body.query.trim(), options };
}

router.post(["/search", "/answer"], async (req, res, next) => {
  let parsed;
  try {
    parsed = parseQuery(req.body);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
  try {
    if (req.path === "/answer") return res.json(await answerLegalQuestion(parsed.query, parsed.options));
    const corpus = await loadCorpus();
    const retrieval = await retrieveLegalPassages(parsed.query, parsed.options, { corpus });
    return res.json({ ...retrieval, documentCount: corpus.documents.length, judgmentCount: corpus.documents.filter(d => d.source.documentType === "judgment").length });
  } catch (error) {
    res.status(503);
    next(error);
  }
});

export default router;
