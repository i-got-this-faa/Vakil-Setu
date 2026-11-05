import test from "node:test";
import assert from "node:assert/strict";
import { chunkPages, rankPassages, validateSource } from "../src/services/legalCorpus.js";
import { discoverJudgmentLinks } from "../src/services/legalDiscovery.js";
import { assertOfficialUrl } from "../src/services/legalSourceFetch.js";
import { answerLegalQuestion, validateGroundedAnswer } from "../src/services/legalRagService.js";

const source = { url: "https://jkhighcourt.nic.in/judgment.pdf", title: "Example judgment", court: "J&K", caseNumber: "1/2024", decisionDate: "2024-03-29", judges: ["Example Judge"], language: "en", documentType: "judgment" };
const passage = { id: "doc-1", page: 6, text: "Surrender of possession was a prerequisite for entertaining the appeal under the Migrant Act.", source };
const corpus = { version: 1, documents: [{ id: "doc", source, chunks: [passage, { id: "doc-2", page: 1, text: "The university disputed an employee salary calculation." }] }] };

test("page chunking preserves every character, bounded overlap and original page numbers", () => {
  const page = "Property appeal possession. ".repeat(200).trim();
  const chunks = chunkPages(`\f${page}\fA separate page.`, 300, 50);
  const first = chunks.filter((c) => c.page === 2);
  assert.ok(first.length > 1);
  assert.equal(first[0].start, 0);
  assert.equal(first.at(-1).end, page.length);
  for (let i = 0; i < first.length; i++) {
    assert.equal(first[i].text, page.slice(first[i].start, first[i].end));
    assert.ok(first[i].text.length <= 300);
    if (i) assert.equal(first[i].start, first[i - 1].end - 50);
  }
  assert.equal(chunks.at(-1).page, 3);
  assert.throws(() => chunkPages(page, 100, 100));
  assert.equal(chunkPages("word ".repeat(24).trim(), 100, 99).at(-1).end, 119);
});

test("retrieval finds the relevant passage and honors court, date, and result bounds", () => {
  assert.equal(rankPassages(corpus, "migrant property possession appeal", { limit: 1 })[0].id, passage.id);
  assert.deepEqual(rankPassages(corpus, "quantum astrophysics"), []);
  assert.deepEqual(rankPassages(corpus, "possession", { court: "Supreme Court" }), []);
  assert.deepEqual(rankPassages(corpus, "possession", { dateFrom: "2025-01-01" }), []);
  assert.equal(rankPassages(corpus, "possession", { dateTo: "2024-03-29" }).length, 1);
});

test("discovery labels archived comments and excludes unrelated PDF notices", () => {
  const html = '<a href="/includes/Jud_Search/Judgement/one.pdf">One</a><!-- <a href="/includes/Jud_Search/Judgement/old.pdf">Old</a> --><a href="/notices.pdf">Notice</a>';
  const candidates = discoverJudgmentLinks(html, "https://jkhighcourt.nic.in/");
  assert.equal(candidates.length, 2);
  assert.equal(candidates[0].discoveryContext, "rendered_link");
  assert.equal(candidates[1].discoveryContext, "html_comment");
  assert.ok(candidates.every((c) => c.needsMetadataReview));
});

test("source validation rejects missing bench attribution, invalid dates and unsafe URLs", () => {
  assert.equal(validateSource(source), source);
  assert.throws(() => validateSource({ ...source, judges: [] }));
  assert.throws(() => validateSource({ ...source, decisionDate: "2024-02-31" }));
  for (const url of ["http://jkhighcourt.nic.in/a.pdf", "https://localhost/a.pdf", "https://jkhighcourt.nic.in.evil.test/a.pdf", "https://user:pass@jkhighcourt.nic.in/a.pdf", "https://jkhighcourt.nic.in:444/a.pdf"]) {
    assert.throws(() => assertOfficialUrl(url));
  }
});

test("answers require real passage IDs and exact supporting quotes", () => {
  const valid = { answer: "In this judgment, surrender was required before the appeal could be entertained.", insufficientEvidence: false, evidence: [{ passageId: passage.id, quote: passage.text }] };
  const result = validateGroundedAnswer(JSON.stringify(valid), [passage]);
  assert.equal(result.status, "answered");
  assert.equal(result.citations[0].page, 6);
  assert.equal(result.authorityChecked, false);
  assert.equal(validateGroundedAnswer(JSON.stringify({ ...valid, evidence: [{ passageId: "invented", quote: passage.text }] }), [passage]).status, "invalid_evidence");
  assert.equal(validateGroundedAnswer(JSON.stringify({ ...valid, evidence: [{ passageId: passage.id, quote: "The appeal succeeded without surrender of possession." }] }), [passage]).status, "invalid_evidence");
  assert.equal(validateGroundedAnswer(JSON.stringify({ ...valid, evidence: [] }), [passage]).status, "invalid_evidence");
  assert.equal(validateGroundedAnswer("malformed JSON", [passage]).status, "invalid_evidence");
  assert.equal(validateGroundedAnswer("null", [passage]).status, "invalid_evidence");
  assert.equal(validateGroundedAnswer('{"insufficientEvidence":true}', [passage]).status, "insufficient_evidence");
});

test("empty or unrelated retrieval never calls the language model", async () => {
  const generate = () => { throw new Error("Must not call model"); };
  assert.equal((await answerLegalQuestion("possession", {}, { corpus: { documents: [] }, generate })).status, "empty_corpus");
  assert.equal((await answerLegalQuestion("astrophysics", {}, { corpus, generate })).status, "no_matching_passages");
});

test("RAG passes retrieved sources to generation and validates the returned evidence", async () => {
  const result = await answerLegalQuestion("migrant possession", { language: "hi" }, {
    corpus,
    generate: async (prompt, language) => {
      const request = JSON.parse(prompt);
      assert.equal(language, "hi");
      assert.equal(request.passages[0].id, passage.id);
      assert.equal(request.passages[0].source.url, source.url);
      return JSON.stringify({ answer: "इस निर्णय में अपील सुनने से पहले कब्जा सौंपना आवश्यक था।", insufficientEvidence: false, evidence: [{ passageId: passage.id, quote: passage.text }] });
    }
  });
  assert.equal(result.status, "answered");
  assert.equal(result.citations.length, 1);
});
