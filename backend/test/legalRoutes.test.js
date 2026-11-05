import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import knowledgeRoutes from "../src/routes/knowledgeRoutes.js";

test("knowledge API validates input and handles an empty corpus without MongoDB or LLM", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "vakil-rag-test-"));
  const previous = process.env.LEGAL_CORPUS_DIR;
  process.env.LEGAL_CORPUS_DIR = directory;
  const app = express();
  app.use(express.json());
  app.use("/api/knowledge", knowledgeRoutes);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/knowledge`;
  const request = (endpoint, body) => fetch(`${base}/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  try {
    for (const body of [{}, { query: ["bad"] }, { query: "a", limit: -1 }, { query: "a", dateFrom: "2024-02-31" }, { query: "a", language: "invalid" }, { query: "a", dateFrom: "2025-01-01", dateTo: "2024-01-01" }]) {
      assert.equal((await request("search", body)).status, 400);
    }
    const search = await request("search", { query: "property possession" });
    assert.equal(search.status, 200);
    assert.equal((await search.json()).judgmentCount, 0);
    const answer = await request("answer", { query: "property possession" });
    assert.equal(answer.status, 200);
    assert.equal((await answer.json()).status, "empty_corpus");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previous === undefined) delete process.env.LEGAL_CORPUS_DIR;
    else process.env.LEGAL_CORPUS_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
