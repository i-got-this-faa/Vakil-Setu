import test from "node:test";
import assert from "node:assert/strict";
import { ApiSpeech } from "../src/whatsapp/speech.js";
import { MetaTransport } from "../src/whatsapp/transport.js";
import { incomingMessages } from "../src/whatsapp/app.js";

test("live speech adapter uploads real audio and checks transcription response", async () => {
  const calls = [];
  const speech = new ApiSpeech({ baseUrl: "https://speech.example.test/v1", apiKey: "test", sttModel: "stt-test", ttsModel: "tts-test", voice: "voice-test", fetchImpl: async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("transcriptions")) return Response.json({ text: "Someone took my property." });
    return new Response(new Uint8Array([73, 68, 51, 0]), { headers: { "Content-Type": "audio/mpeg" } });
  } });
  const transcript = await speech.transcribe("media", { bytes: Buffer.from("audio"), contentType: "audio/mpeg" }, "en");
  assert.equal(transcript.simulated, false);
  assert.equal(calls[0].options.body.get("file").name, "voice-note.mp3");
  assert.equal(calls[0].options.body.get("model"), "stt-test");
  const reply = await speech.synthesize("Hello", "en");
  assert.equal(reply.contentType, "audio/mpeg");
  assert.equal(JSON.parse(calls[1].options.body).input, "Hello");
  const failing = new ApiSpeech({ baseUrl: "https://speech.example.test/v1", apiKey: "test", sttModel: "stt", ttsModel: "tts", voice: "voice", fetchImpl: async () => new Response("unavailable", { status: 503 }) });
  await assert.rejects(failing.transcribe("id", { bytes: Buffer.from("a"), contentType: "audio/ogg" }), /503/);
});

test("Meta adapter uploads generated audio then sends an audio media message", async () => {
  const calls = [];
  const transport = new MetaTransport({ token: "test-only-token", phoneId: "123", version: "v23.0", fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return Response.json(url.endsWith("/media") ? { id: "uploaded123" } : { messages: [{ id: "sent123" }] });
  } });
  const result = await transport.deliver("919999000001", { kind: "audio", text: "Hello", language: "en" }, { synthesize: async () => ({ bytes: Buffer.from("sample"), contentType: "audio/mpeg", extension: "mp3" }) }, "reply1");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.body.get("messaging_product"), "whatsapp");
  const sent = JSON.parse(calls[1].options.body);
  assert.equal(sent.type, "audio");
  assert.equal(sent.audio.id, "uploaded123");
  assert.equal(sent.to, "919999000001");
  assert.equal(result.sid, "sent123");
  assert.equal(result.provider, "meta");
});

test("malformed signed message envelopes cannot enter the queue", () => {
  assert.throws(() => incomingMessages({ object: "whatsapp_business_account", entry: {} }, "123"), /Invalid webhook/);
  assert.throws(() => incomingMessages({ object: "whatsapp_business_account", entry: [{ changes: {} }] }, "123"), /Invalid webhook/);
});

test("live adapter configuration cannot silently fall back to demo credentials", () => {
  assert.throws(() => new ApiSpeech({}), /Live speech requires/);
  assert.throws(() => new MetaTransport({}), /Live WhatsApp requires/);
  assert.throws(() => new ApiSpeech({ baseUrl: "http://insecure.test", apiKey: "key", sttModel: "stt", ttsModel: "tts", voice: "voice" }), /HTTPS/);
});
