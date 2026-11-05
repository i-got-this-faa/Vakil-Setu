import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { classifyLegalIssue } from "../src/services/aiService.js";
import aiRoutes from "../src/routes/aiRoutes.js";

test("triage never invents a civil dispute when the model is unavailable or invalid", async () => {
  const previous = { ...process.env };
  const fetchBefore = global.fetch;
  try {
    delete process.env.LLM_API_KEY;
    for (const text of ["meow meow meow", "My landlord locked me out", "मेरी बहन मुझे परेशान करती है"] ) {
      const result = await classifyLegalIssue(text);
      assert.equal(result.status, "unavailable");
      assert.equal(result.domain, null);
      assert.deepEqual(result.actions, []);
    }
    process.env.LLM_API_KEY = "synthetic-test-key";
    process.env.LLM_PROVIDER = "gemini";
    const classified = { status: "classified", domain: "property", domain_label: "Property", urgency: "medium", summary: "A response to the tenant's facts.", actions: ["Keep your documents."] };
    let sent;
    global.fetch = async (url, options) => {
      sent = { url, ...JSON.parse(options.body) };
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(classified) }] } }] }) };
    };
    const result = await classifyLegalIssue("What documents?", [{ role: "user", content: "My landlord locked me out" }], "hindi");
    assert.equal(result.domain, "property");
    assert.equal(result.source, "gemini");
    assert.equal(result.response_language, "hi");
    assert.equal(sent.contents[0].parts[0].text, "My landlord locked me out");
    assert.match(sent.systemInstruction.parts[0].text, /Hindi/);
    assert.ok(!sent.url.includes("synthetic-test-key"));
    for (const value of ["not JSON", JSON.stringify({ ...classified, domain: "nonsense" }), JSON.stringify({ ...classified, status: undefined })]) {
      global.fetch = async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: value }] } }] }) });
      assert.equal((await classifyLegalIssue("test")).status, "unavailable");
    }
    global.fetch = async () => { throw new Error("provider unavailable"); };
    assert.equal((await classifyLegalIssue("test")).domain, null);
    for (const [text, history, language] of [[[], [], "auto"], ["x", {}, "auto"], ["x", [], "invalid"]]) {
      await assert.rejects(classifyLegalIssue(text, history, language), error => error.status === 400);
    }
  } finally {
    global.fetch = fetchBefore;
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});

test("triage API returns no advocates without a classification and rejects invalid input", async () => {
  const key = process.env.LLM_API_KEY; delete process.env.LLM_API_KEY;
  const app = express(); app.use(express.json()); app.use("/api/ai", aiRoutes);
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  try {
    const send = body => fetch(`http://127.0.0.1:${server.address().port}/api/ai/triage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const response = await send({ text: "meow meow" });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.classification.domain, null); assert.deepEqual(data.advocates, []);
    assert.equal((await send({ text: ["bad"] })).status, 400);
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (key !== undefined) process.env.LLM_API_KEY = key;
  }
});
