import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHmac } from "node:crypto";
import { ConversationStore } from "../src/whatsapp/store.js";
import { WhatsappService } from "../src/whatsapp/service.js";
import { createWhatsappApp, verifySignature, incomingMessages } from "../src/whatsapp/app.js";
import { planConversation } from "../src/whatsapp/conversation.js";
import { legalReply } from "../src/whatsapp/legalReply.js";
import { MetaTransport } from "../src/whatsapp/transport.js";

const advocates = [{ id: "demo", name: "Demo Advocate", city: "Jammu", expertise: ["criminal"], languages: ["English"], demo: true }];
const signature = (body) => `sha256=${createHmac("sha256", "test-secret").update(body).digest("hex")}`;
const envelope = (id, mediaId = "yes") => ({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: "123" }, messages: [{ id, from: "919999000001", type: "audio", audio: { id: mediaId } }] } }] }] });

test("signed webhook validates challenge and deduplicates events before any second delivery", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "vakil-wa-"));
  const store = await new ConversationStore(directory).initialize();
  const deliveries = [];
  const service = new WhatsappService({ store, speech: { mode: "stub", transcribe: async () => ({ text: "Yes, English" }) }, transport: { mode: "stub", deliver: async (_to, m) => { deliveries.push(m); return { delivered: true }; }, downloadAudio: async () => ({}) }, advocates, demo: true });
  const app = createWhatsappApp({ service, appSecret: "test-secret", verifyToken: "verify", phoneId: "123", demo: true });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal(await (await fetch(`${base}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify&hub.challenge=42`)).text(), "42");
    assert.equal((await fetch(`${base}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=42`)).status, 403);
    const body = Buffer.from(JSON.stringify(envelope("event-one")));
    const send = (sig = signature(body)) => fetch(`${base}/webhooks/whatsapp`, { method: "POST", headers: { "Content-Type": "application/json", "x-hub-signature-256": sig }, body });
    assert.equal((await send("sha256=" + "0".repeat(64))).status, 401);
    assert.equal(Object.keys(store.snapshot().inbox).length, 0);
    assert.equal((await send()).status, 200);
    await service.waitUntilIdle();
    assert.equal(deliveries.length, 1);
    assert.match(deliveries[0].text, /May I store/);
    assert.equal((await send()).status, 200);
    await service.waitUntilIdle();
    assert.equal(deliveries.length, 1);
    assert.equal(Object.keys(store.snapshot().inbox).length, 1);
    const persisted = JSON.parse(await readFile(path.join(directory, "state.json"), "utf8"));
    assert.equal(Object.values(persisted.inbox)[0].status, "done");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});

test("consent precedes retrieval and declining consent does not collect case facts", async () => {
  const answer = async () => { throw new Error("Must not query legal data before consent"); };
  const intro = await planConversation({ text: "my case", sender: "user", jobId: "1", advocates, demo: true, answer });
  assert.equal(intro.session.phase, "consent");
  const refusal = await planConversation({ session: intro.session, text: "No", sender: "user", jobId: "2", advocates, demo: true, answer });
  assert.equal(refusal.session.consent, false);
  assert.equal(refusal.session.lastQuestion, undefined);
});

test("consultation requires selection, readback and explicit sharing confirmation", async () => {
  const initial = { phase: "question", consent: true, language: "en", lastQuestion: "theft", domain: "criminal" };
  let plan = await planConversation({ session: initial, text: "find a lawyer", sender: "user", jobId: "1", advocates, demo: true });
  assert.equal(plan.session.phase, "city");
  for (const [i, text] of ["Jammu", "first", "tomorrow at four"].entries()) {
    plan = await planConversation({ session: plan.session, text, sender: "user", jobId: `${i + 2}`, advocates, demo: true });
    assert.equal(plan.request, undefined);
  }
  assert.equal(plan.session.phase, "confirm");
  assert.match(plan.messages[0].text, /share your case summary/);
  const vague = await planConversation({ session: plan.session, text: "maybe", sender: "user", jobId: "5", advocates, demo: true });
  assert.equal(vague.request, undefined);
  const contradictory = await planConversation({ session: plan.session, text: "Yes, but do not share my case", sender: "user", jobId: "5b", advocates, demo: true });
  assert.equal(contradictory.request, undefined);
  const confirmed = await planConversation({ session: plan.session, text: "Yes, share my case summary", sender: "user", jobId: "6", advocates, demo: true });
  assert.equal(confirmed.request.status, "requested");
  assert.equal(confirmed.request.paymentStatus, "not_requested");
  assert.ok(confirmed.request.sharingConsentAt);
  assert.match(confirmed.messages[0].text, /not a confirmed appointment/);
});

test("live matching excludes fictional and unverified advocates", async () => {
  const result = await planConversation({ session: { phase: "city", consent: true, language: "en", domain: "criminal" }, text: "Jammu", sender: "user", jobId: "1", advocates, demo: false });
  assert.equal(result.session.phase, "question");
  assert.match(result.messages[0].text, /No verified advocate/);
});

test("uncertain delivery is retained for review and not blindly repeated after restart", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "vakil-wa-restart-"));
  try {
    const store = await new ConversationStore(directory).initialize();
    await store.mutate((state) => { state.inbox.one = { status: "sending", message: { id: "one" } }; state.inbox.two = { status: "queued", message: { id: "two" } }; });
    const restored = await new ConversationStore(directory).initialize();
    assert.equal(restored.snapshot().inbox.one.status, "needs_review");
    assert.equal(restored.snapshot().inbox.two.status, "queued");
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("retrieved source excerpts disclose unverified statutory versions and cite actual sections", async () => {
  const source = { title: "BNS reference text", act: "BNS", url: "https://example.test/bns", documentType: "statute", cutoffVerified: false };
  const corpus = { documents: [{ id: "law", source, chunks: [{ id: "law-303", sectionNumber: 303, text: "Theft means dishonestly taking movable property without consent.", page: null }] }] };
  const result = await legalReply("theft property", { mode: "extractive", corpus });
  assert.equal(result.status, "source_excerpt");
  assert.equal(result.citations[0].source.sectionNumber, 303);
  assert.match(result.spoken, /have not been verified/);
  assert.equal(result.generationMode, "extractive");
});

test("invalid signatures and unrelated phone-number events are rejected or ignored", () => {
  assert.equal(verifySignature(Buffer.from("x"), "invalid", "secret"), false);
  assert.deepEqual(incomingMessages(envelope("one"), "different-number"), []);
});

test("Meta media download never forwards an access token to an untrusted host", async () => {
  let calls = 0;
  const transport = new MetaTransport({ token: "test-token", phoneId: "123", version: "v23.0", fetchImpl: async () => { calls++; return new Response(JSON.stringify({ url: "https://evil.example/audio" }), { status: 200 }); } });
  await assert.rejects(transport.downloadAudio("media123"), /Untrusted/);
  assert.equal(calls, 1);
});

test("unusable audio asks for a repeat without advancing the consultation or querying law", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "vakil-wa-repeat-"));
  try {
    const store = await new ConversationStore(directory).initialize();
    await store.mutate((state) => { state.sessions["919999000001"] = { phase: "confirm", consent: true, language: "en" }; });
    const delivered = [];
    const service = new WhatsappService({ store, speech: { transcribe: async () => { throw new Error("No speech"); } }, transport: { downloadAudio: async () => ({}), deliver: async (_to, message) => { delivered.push(message); return { id: "reply" }; } }, advocates, demo: true, answer: () => { throw new Error("Must not retrieve law"); } });
    await service.enqueue([{ id: "bad-audio", from: "919999000001", type: "audio", mediaId: "bad" }]);
    await service.waitUntilIdle();
    assert.equal(store.snapshot().sessions["919999000001"].phase, "confirm");
    assert.equal(Object.keys(store.snapshot().requests).length, 0);
    assert.match(delivered[0].text, /send a short, clear message again/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("Meta delivery callbacks require the message-webhook signature", async () => {
  const events = [];
  const service = { transport: {}, speech: {}, enqueue: async () => [], recordDelivery: async (event) => events.push(event) };
  const app = createWhatsappApp({ service, appSecret: "test-secret", verifyToken: "verify", phoneId: "123", demo: false });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const payload = { object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: "123" }, statuses: [{ id: "wamid.provider-message", recipient_id: "919999000001", status: "delivered" }] } }] }] };
    const body = Buffer.from(JSON.stringify(payload));
    const endpoint = `http://127.0.0.1:${server.address().port}/webhooks/whatsapp`;
    assert.equal((await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body })).status, 401);
    assert.equal(events.length, 0);
    assert.equal((await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "x-hub-signature-256": signature(body) }, body })).status, 200);
    assert.equal(events[0].sid, "wamid.provider-message");
    assert.equal(events[0].status, "delivered");
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
