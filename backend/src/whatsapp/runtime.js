import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConversationStore } from "./store.js";
import { DemoSpeech, ApiSpeech, LocalSpeech } from "./speech.js";
import { DemoTransport, MetaTransport } from "./transport.js";
import { WhatsappService } from "./service.js";
import { legalReply } from "./legalReply.js";
import { createWhatsappApp } from "./app.js";
import { createTwilioApp, SignedAudioStore, TwilioTransport } from "./twilio.js";
import { createHmac } from "node:crypto";

const backendDir = fileURLToPath(new URL("../../", import.meta.url));
export async function createRuntime({ mode = process.env.WHATSAPP_MODE || "demo", directory } = {}) {
  if (!["demo", "live"].includes(mode)) throw new Error("WHATSAPP_MODE must be demo or live");
  const demo = mode === "demo";
  const provider = process.env.WHATSAPP_PROVIDER || "twilio";
  if (!["meta", "twilio"].includes(provider)) throw new Error("WHATSAPP_PROVIDER must be twilio or meta");
  directory ||= process.env.WHATSAPP_DATA_DIR || path.join(backendDir, "data", `whatsapp-${mode}`);
  const store = await new ConversationStore(directory).initialize();
  let advocates;
  let speech;
  let transport;
  let appSecret;
  let verifyToken;
  let phoneId;
  let mediaStore;
  const sandboxProfiles = !demo && provider === "twilio" && process.env.WHATSAPP_DEMO_ADVOCATES === "true";
  if (demo) {
    advocates = JSON.parse(await readFile(path.join(backendDir, "demo/advocates.json"), "utf8"));
    speech = new DemoSpeech(JSON.parse(await readFile(path.join(backendDir, "demo/voice-fixtures.json"), "utf8")));
    transport = new DemoTransport(path.join(directory, "outbox"));
    appSecret = "local-demo-signing-secret-not-a-real-meta-secret";
    verifyToken = "local-demo-verify-token";
    phoneId = "100000000000000";
  } else {
    const e = process.env;
    const speechProvider = e.SPEECH_PROVIDER || "local";
    if (speechProvider === "local") {
      speech = new LocalSpeech();
      await speech.checkReady();
    } else if (speechProvider === "api") {
      speech = new ApiSpeech({ baseUrl: e.SPEECH_API_BASE_URL, apiKey: e.SPEECH_API_KEY, sttModel: e.STT_MODEL, ttsModel: e.TTS_MODEL, voice: e.TTS_VOICE });
    } else throw new Error("SPEECH_PROVIDER must be local or api");
    if (provider === "twilio") {
      if (!e.TWILIO_AUTH_TOKEN || !e.PUBLIC_BASE_URL) throw new Error("TWILIO_AUTH_TOKEN and PUBLIC_BASE_URL are required for Twilio Sandbox");
      const secret = createHmac("sha256", e.TWILIO_AUTH_TOKEN).update("VakilSetu temporary audio links").digest("hex");
      mediaStore = new SignedAudioStore({ directory: path.join(directory, "public-media"), baseUrl: e.PUBLIC_BASE_URL, secret });
      transport = new TwilioTransport({ accountSid: e.TWILIO_ACCOUNT_SID, authToken: e.TWILIO_AUTH_TOKEN, fromNumber: e.TWILIO_WHATSAPP_FROM, mediaStore });
    } else {
      if (!e.WHATSAPP_APP_SECRET || !e.WHATSAPP_VERIFY_TOKEN) throw new Error("WHATSAPP_APP_SECRET and WHATSAPP_VERIFY_TOKEN are required");
      appSecret = e.WHATSAPP_APP_SECRET;
      verifyToken = e.WHATSAPP_VERIFY_TOKEN;
      phoneId = e.WHATSAPP_PHONE_NUMBER_ID;
      transport = new MetaTransport({ token: e.WHATSAPP_ACCESS_TOKEN, phoneId, version: e.WHATSAPP_GRAPH_VERSION });
    }
    advocates = sandboxProfiles ? JSON.parse(await readFile(path.join(backendDir, "demo/advocates.json"), "utf8")) : e.WHATSAPP_ADVOCATE_MANIFEST ? JSON.parse(await readFile(e.WHATSAPP_ADVOCATE_MANIFEST, "utf8")) : [];
    if (!Array.isArray(advocates) || advocates.some((a) => (!sandboxProfiles && (a.demo || !a.verified)) || typeof a.id !== "string" || typeof a.name !== "string" || typeof a.city !== "string" || !Array.isArray(a.languages) || !Array.isArray(a.expertise))) throw new Error("Live advocate manifest must contain verified, non-demo profiles");
  }
  const generation = demo ? "extractive" : process.env.LEGAL_REPLY_MODE || "extractive";
  if (!["extractive", "llm"].includes(generation)) throw new Error("LEGAL_REPLY_MODE must be extractive or llm");
  const service = new WhatsappService({ store, transport, speech, advocates, demo, sandboxProfiles, answer: (text, options) => legalReply(text, { ...options, mode: generation }) });
  const app = !demo && provider === "twilio"
    ? createTwilioApp({ service, accountSid: process.env.TWILIO_ACCOUNT_SID, authToken: process.env.TWILIO_AUTH_TOKEN, fromNumber: process.env.TWILIO_WHATSAPP_FROM, baseUrl: process.env.PUBLIC_BASE_URL, mediaStore })
    : createWhatsappApp({ service, appSecret, verifyToken, phoneId, demo });
  return { app, service, directory, mode, phoneId, appSecret, verifyToken, mediaStore, provider: demo ? "simulated" : provider };
}
