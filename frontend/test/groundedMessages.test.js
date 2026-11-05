import test from "node:test";
import assert from "node:assert/strict";
import { assistantFromClassification, createMessage, historyForApi } from "../src/utils/chatMessages.js";

test("grounded answers and evidence refusals take priority over independent triage text", () => {
  const triage = { summary: "An ungrounded model summary" };
  for (const status of ["answered", "invalid_evidence", "empty_corpus", "retrieval_unavailable", "source_excerpts"]) {
    assert.equal(assistantFromClassification(triage, { status, answer: "Source response" }), "Source response");
  }
  assert.equal(assistantFromClassification({ summary: "Please describe what happened." }, null), "Please describe what happened.");
});

test("citations remain attached to messages but are excluded from model conversation history", () => {
  const legalAnswer = { status: "answered", answer: "Grounded explanation", citations: [{ passageId: "source-303", quote: "Exact source text" }] };
  const message = createMessage("assistant", legalAnswer.answer, { legalAnswer });
  assert.deepEqual(JSON.parse(JSON.stringify(message)).legalAnswer, legalAnswer);
  assert.deepEqual(historyForApi([message]), [{ role: "assistant", content: "Grounded explanation" }]);
});
