import test from "node:test";
import assert from "node:assert/strict";
import twilio from "twilio";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { SignedAudioStore, TwilioTransport, createTwilioApp, twilioMessage } from "../src/whatsapp/twilio.js";

const accountSid = "AC" + "a".repeat(32);
const authToken = "b".repeat(32);
const fromNumber = "whatsapp:+14155238886";
const baseUrl = "https://sandbox.example.test";
const fixture = { AccountSid: accountSid, To: fromNumber, From: "whatsapp:+919999000001", MessageSid: "SM" + "c".repeat(32), NumMedia: "1", MediaContentType0: "audio/ogg", MediaUrl0: `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/SM${"c".repeat(32)}/Media/ME${"d".repeat(32)}` };

test("Twilio signed webhook accepts actual form format and rejects tampered parameters", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "vakil-twilio-"));
  const mediaStore = new SignedAudioStore({ directory, baseUrl, secret: authToken });
  const accepted = [];
  const service = { transport: { mode: "twilio_sandbox" }, speech: { mode: "test" }, enqueue: async (messages) => accepted.push(...messages) };
  const app = createTwilioApp({ service, accountSid, authToken, fromNumber, baseUrl, mediaStore });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const endpoint = `http://127.0.0.1:${server.address().port}/webhooks/twilio`;
    const signature = twilio.getExpectedTwilioSignature(authToken, `${baseUrl}/webhooks/twilio`, fixture);
    const send = (form, sig = signature) => fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "x-twilio-signature": sig }, body: new URLSearchParams(form) });
    assert.equal((await send({ ...fixture, From: "whatsapp:+919999000002" })).status, 401);
    assert.equal(accepted.length, 0);
    const response = await send(fixture);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /<Response\/>/);
    assert.equal(accepted[0].type, "audio");
    assert.equal(accepted[0].mediaId, fixture.MediaUrl0);
    assert.equal(accepted[0].from, "919999000001");
  } finally { await new Promise((resolve) => server.close(resolve)); await rm(directory, { recursive: true, force: true }); }
});

test("generated audio is served only through a valid unexpired signed URL", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "vakil-media-"));
  const mediaStore = new SignedAudioStore({ directory, baseUrl, secret: authToken });
  const service = { transport: { mode: "test" }, speech: { mode: "test" } };
  const app = createTwilioApp({ service, accountSid, authToken, fromNumber, baseUrl, mediaStore });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const published = new URL(await mediaStore.publish({ bytes: Buffer.from("ID3sample"), extension: "mp3", contentType: "audio/mpeg" }, "reply-one"));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(`${origin}${published.pathname}${published.search}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /audio\/mpeg/);
    assert.equal(await response.text(), "ID3sample");
    assert.equal((await fetch(`${origin}${published.pathname}`)).status, 403);
    published.searchParams.set("expires", String(Math.floor(Date.now() / 1000) - 10));
    assert.equal((await fetch(`${origin}${published.pathname}${published.search}`)).status, 403);
    await assert.rejects(mediaStore.publish({ bytes: Buffer.from("wave"), extension: "wav", contentType: "audio/wav" }, "wrong"), /MP3/);
  } finally { await new Promise((resolve) => server.close(resolve)); await rm(directory, { recursive: true, force: true }); }
});

test("Twilio transport sends an audio URL and keeps credentials off CDN redirects", async () => {
  const calls = [];
  const sent = [];
  const transport = new TwilioTransport({ accountSid, authToken, fromNumber, mediaStore: { baseUrl, publish: async () => "https://sandbox.example.test/media/signed.mp3" }, client: { messages: { create: async (message) => { sent.push(message); return { sid: "SMsent", status: "queued" }; } } }, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1 ? new Response(null, { status: 302, headers: { Location: "https://media.twiliocdn.com/voice.ogg?signature=signed" } }) : new Response(Buffer.from("audio"), { headers: { "Content-Type": "audio/ogg; codecs=opus" } });
  } });
  const audio = await transport.downloadAudio(fixture.MediaUrl0);
  assert.equal(audio.contentType, "audio/ogg");
  assert.match(calls[0].options.headers.Authorization, /^Basic /);
  assert.equal(calls[1].options.headers.Authorization, undefined);
  const receipt = await transport.deliver("919999000001", { kind: "audio", text: "Hello", language: "en" }, { synthesize: async () => ({ bytes: Buffer.from("mp3"), extension: "mp3", contentType: "audio/mpeg" }) }, "id");
  assert.deepEqual(sent[0].mediaUrl, ["https://sandbox.example.test/media/signed.mp3"]);
  assert.equal(sent[0].from, fromNumber);
  assert.equal(sent[0].statusCallback, `${baseUrl}/webhooks/twilio/status`);
  assert.equal(receipt.status, "queued");
  await assert.rejects(transport.downloadAudio("https://evil.example/audio"), /Untrusted/);
});

test("Twilio parsing rejects another account and does not treat an unsupported attachment as speech", () => {
  assert.throws(() => twilioMessage({ ...fixture, AccountSid: "different" }, { accountSid, fromNumber }), /account/);
  assert.equal(twilioMessage({ ...fixture, MediaContentType0: "image/png" }, { accountSid, fromNumber }).type, "unsupported");
});

test("delivery callbacks require their own signed URL and record failure codes", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "vakil-status-"));
  const events = [];
  const mediaStore = new SignedAudioStore({ directory, baseUrl, secret: authToken });
  const service = { transport: {}, speech: {}, recordDelivery: async (event) => events.push(event) };
  const app = createTwilioApp({ service, accountSid, authToken, fromNumber, baseUrl, mediaStore });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const body = { AccountSid: accountSid, From: fromNumber, To: fixture.From, MessageSid: fixture.MessageSid, MessageStatus: "undelivered", ErrorCode: "63016" };
    const endpoint = `http://127.0.0.1:${server.address().port}/webhooks/twilio/status`;
    const send = (signedUrl) => fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "x-twilio-signature": twilio.getExpectedTwilioSignature(authToken, signedUrl, body) }, body: new URLSearchParams(body) });
    assert.equal((await send(`${baseUrl}/webhooks/twilio`)).status, 401);
    assert.equal(events.length, 0);
    assert.equal((await send(`${baseUrl}/webhooks/twilio/status`)).status, 204);
    assert.equal(events[0].status, "undelivered");
    assert.equal(events[0].errorCode, "63016");
  } finally { await new Promise((resolve) => server.close(resolve)); await rm(directory, { recursive: true, force: true }); }
});
