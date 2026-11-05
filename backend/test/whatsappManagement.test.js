import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { planConversation } from "../src/whatsapp/conversation.js";
import { ConversationStore } from "../src/whatsapp/store.js";
import { WhatsappService } from "../src/whatsapp/service.js";
import { mergeDelivery } from "../src/whatsapp/delivery.js";

const sender = "919999000001";
const session = { consent: true, language: "en", phase: "question", requestId: "VS-TEST", lastSpokenReply: "The last spoken reply.", lastLegalReply: "The legal source excerpt." };
const request = { id: "VS-TEST", sender, advocateName: "Demo Advocate", status: "requested", demo: true };
const plan = (text, overrides = {}) => planConversation({ session, sender, text, requests: [request], advocates: [], demo: true, jobId: "command", ...overrides });

test("repeating a reply preserves the current stage and creates no request or retrieval", async () => {
  const result = await plan("Repeat the last answer.", { session: { ...session, phase: "confirm" }, answer: () => { throw new Error("Must not retrieve"); } });
  assert.equal(result.messages[0].text, session.lastLegalReply);
  assert.equal(result.session.phase, "confirm");
  assert.equal(result.request, undefined);
  assert.equal(result.requestUpdate, undefined);
  const imperfect = await plan("Repeat the last hand, sir.", { answer: () => { throw new Error("Must not retrieve"); } });
  assert.equal(imperfect.messages[0].text, session.lastLegalReply);
});

test("voice cancellation requires confirmation and cannot access another user's request", async () => {
  const confirmation = await plan("Cancel my request.");
  assert.equal(confirmation.session.phase, "cancel_request");
  assert.equal(confirmation.requestUpdate, undefined);
  const no = await plan("No", { session: confirmation.session });
  assert.equal(no.requestUpdate, undefined);
  const yes = await plan("Yes, cancel it", { session: confirmation.session });
  assert.equal(yes.requestUpdate.status, "cancelled");
  assert.equal(yes.requestUpdate.id, request.id);
  const outsider = await plan("Cancel my request", { sender: "919999000002" });
  assert.equal(outsider.requestUpdate, undefined);
  assert.match(outsider.messages[0].text, /no saved/i);
});

test("status reflects persisted cancellation and new-case commands preserve existing requests", async () => {
  const result = await plan("What is my request status?", { requests: [{ ...request, status: "cancelled" }] });
  assert.match(result.messages[0].text, /is cancelled/);
  const reset = await plan("Start a new case.");
  assert.equal(reset.session.requestId, request.id);
  assert.equal(reset.session.lastLegalReply, undefined);
});

test("the worker persists cancellation and duplicate confirmation cannot cancel twice", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "vakil-cancel-"));
  try {
    const store = await new ConversationStore(directory).initialize();
    await store.mutate((state) => { state.sessions[sender] = session; state.requests[request.id] = request; });
    const replies = [];
    const service = new WhatsappService({ store, speech: {}, transport: { deliver: async (_to, message) => { replies.push(message.text); return { kind: message.kind }; } }, advocates: [], demo: true });
    await service.enqueue([{ id: "cancel", from: sender, type: "text", text: "Cancel my request" }]);
    await service.waitUntilIdle();
    assert.equal(store.snapshot().requests[request.id].status, "requested");
    const yes = { id: "confirm", from: sender, type: "text", text: "Yes" };
    await service.enqueue([yes]); await service.waitUntilIdle();
    const cancelledAt = store.snapshot().requests[request.id].cancelledAt;
    assert.equal(store.snapshot().requests[request.id].status, "cancelled");
    await service.enqueue([yes]); await service.waitUntilIdle();
    assert.equal(store.snapshot().requests[request.id].cancelledAt, cancelledAt);
    assert.equal(replies.length, 2);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("delayed or duplicate callbacks never regress delivered/read or terminal failure", () => {
  let result = mergeDelivery(undefined, { sid: "SMone", status: "delivered" });
  result = mergeDelivery(result, { sid: "SMone", status: "queued" });
  assert.equal(result.status, "delivered");
  const count = result.events.length;
  result = mergeDelivery(result, { sid: "SMone", status: "delivered" });
  assert.equal(result.events.length, count);
  result = mergeDelivery(result, { sid: "SMone", status: "read" });
  result = mergeDelivery(result, { sid: "SMone", status: "failed", errorCode: "63016" });
  assert.equal(result.status, "read");
  const failed = mergeDelivery(mergeDelivery(undefined, { sid: "SMtwo", status: "failed" }), { sid: "SMtwo", status: "sent" });
  assert.equal(failed.status, "failed");
});

test("a callback arriving before the send response remains delivered after the receipt is saved", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "vakil-delivery-"));
  try {
    const store = await new ConversationStore(directory).initialize();
    const sid = `SM${"1".repeat(32)}`;
    const service = new WhatsappService({ store, speech: {}, transport: { deliver: async () => ({ sid, status: "queued", provider: "twilio" }) }, advocates: [], demo: true });
    await service.recordDelivery({ sid, status: "delivered" });
    await service.enqueue([{ id: "hello", from: sender, type: "text", text: "Hello" }]); await service.waitUntilIdle();
    const delivery = store.snapshot().delivery[sid];
    assert.equal(delivery.status, "delivered");
    assert.ok(delivery.jobKey);
    assert.equal(Object.keys(store.snapshot().requests).length, 0);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("unsupported attachments produce a voice prompt without being interpreted as case text", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "vakil-unsupported-"));
  try {
    const store = await new ConversationStore(directory).initialize();
    await store.mutate((state) => { state.sessions[sender] = { ...session, phase: "confirm" }; });
    const replies = [];
    const service = new WhatsappService({ store, speech: {}, transport: { deliver: async (_to, message) => { replies.push(message); return {}; } }, advocates: [], demo: true });
    await service.enqueue([{ id: "photo", from: sender, type: "unsupported" }]); await service.waitUntilIdle();
    assert.equal(store.snapshot().sessions[sender].phase, "confirm");
    assert.match(replies[0].text, /send a voice note/);
    assert.equal(Object.keys(store.snapshot().requests).length, 0);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
