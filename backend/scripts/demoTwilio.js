import { readFile, mkdir, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import twilio from "twilio";
import { digest, loadCorpus } from "../src/services/legalCorpus.js";
import { ConversationStore } from "../src/whatsapp/store.js";
import { DemoSpeech, LocalSpeech } from "../src/whatsapp/speech.js";
import { WhatsappService } from "../src/whatsapp/service.js";
import { SignedAudioStore, TwilioTransport, createTwilioApp } from "../src/whatsapp/twilio.js";

// All provider credentials and transport responses in this script are test doubles.
const accountSid = `AC${"0".repeat(32)}`;
const authToken = "local-simulation-token-not-a-real-twilio-credential";
const fromNumber = "whatsapp:+14155238886";
const sender = "919999000001";
const baseUrl = "https://twilio-local-demo.example.test";
const backend = fileURLToPath(new URL("../", import.meta.url));
const root = path.join(backend, "data/whatsapp-twilio-demo");
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const directory = path.join(root, "runs", runId);
const realSpeech = process.argv.includes("--real-speech");
const corpus = await loadCorpus();
if (!corpus.documents.some((d) => d.source.act === "BNS")) throw new Error("Import the BNS corpus before this demonstration");
const store = await new ConversationStore(directory).initialize();
const fixtures = JSON.parse(await readFile(path.join(backend, "demo/voice-fixtures.json"), "utf8"));
Object.assign(fixtures, {
  repeat: { transcript: "Repeat the last answer.", language: "en" },
  cancel: { transcript: "Cancel my consultation request.", language: "en" },
  cancelYes: { transcript: "Yes, cancel the request.", language: "en" }
});
const steps = ["hello", "consent", "theft", "repeat", "lawyer", "city", "choose", "time", "confirm", "status", "cancel", "cancelYes", "status"];
const mediaInputs = new Map();
for (const key of Object.keys(fixtures)) {
  const messageId = `SM${digest(`${runId}:${key}`).slice(0, 32)}`;
  const mediaId = `ME${digest(`media:${runId}:${key}`).slice(0, 32)}`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${messageId}/Media/${mediaId}`;
  mediaInputs.set(key, { url, fixture: fixtures[key] });
}
const localSpeech = new LocalSpeech();
if (realSpeech) await localSpeech.checkReady();
const speech = realSpeech ? localSpeech : new DemoSpeech(Object.fromEntries([...mediaInputs.values()].map((item) => [item.url, item.fixture])));
if (!realSpeech) { speech.synthesize = localSpeech.synthesize.bind(localSpeech); speech.mode = "fixture_transcription_real_mp3"; }
const mediaStore = new SignedAudioStore({ directory: path.join(directory, "media"), baseUrl, secret: authToken });
const outbound = [];
const transport = new TwilioTransport({ accountSid, authToken, fromNumber, mediaStore, client: { messages: { create: async (payload) => {
  const sid = `SM${digest(`out:${runId}:${outbound.length}`).slice(0, 32)}`;
  outbound.push({ sid, payload });
  return { sid, status: "queued" };
} } } });
transport.mode = "simulated_twilio_api";
transport.downloadAudio = async (url) => {
  const item = [...mediaInputs.values()].find((entry) => entry.url === url);
  if (!item) throw new Error("Unknown simulation media");
  return realSpeech ? localSpeech.synthesize(item.fixture.transcript) : { bytes: Buffer.from("simulation-input"), contentType: "audio/ogg" };
};
const advocates = JSON.parse(await readFile(path.join(backend, "demo/advocates.json"), "utf8"));
const service = new WhatsappService({ store, speech, transport, advocates, demo: false, sandboxProfiles: true });
const app = createTwilioApp({ service, accountSid, authToken, fromNumber, baseUrl, mediaStore, demo: true });
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
async function post(route, body) {
  const signature = twilio.getExpectedTwilioSignature(authToken, `${baseUrl}${route}`, body);
  return fetch(`${origin}${route}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "x-twilio-signature": signature }, body: new URLSearchParams(body) });
}
const report = { mode: "local_twilio_simulation", liveMessagesSent: 0, transcription: realSpeech ? "real local ASR on synthetic speech" : "fixture transcript", turns: [], audioLinksFetched: 0 };
console.log(`TWILIO LOCAL SIMULATION — no account or external message calls\nTranscription: ${report.transcription}. Real corpus and MP3 generation.\n`);
try {
  for (const [index, key] of steps.entries()) {
    const item = mediaInputs.get(key);
    const messageSid = `SM${digest(`incoming:${runId}:${index}`).slice(0, 32)}`;
    const body = { AccountSid: accountSid, To: fromNumber, From: `whatsapp:+${sender}`, MessageSid: messageSid, NumMedia: "1", MediaContentType0: "audio/mpeg", MediaUrl0: item.url };
    const before = outbound.length;
    if ((await post("/webhooks/twilio", body)).status !== 200) throw new Error("Twilio-shaped webhook rejected");
    await service.waitUntilIdle();
    const job = store.snapshot().inbox[digest(`twilio:${messageSid}`)];
    if (job?.status !== "done") throw new Error(`Turn ${key} needs review`);
    const turn = { key, transcript: job.transcription?.text || item.fixture.transcript, replies: job.outgoing, evidence: job.evidence };
    report.turns.push(turn);
    console.log(`${index + 1}. ${turn.transcript}\n   ${job.outgoing[0].text}\n`);
    for (const sent of outbound.slice(before)) {
      if (sent.payload.mediaUrl) {
        const url = new URL(sent.payload.mediaUrl[0]);
        const response = await fetch(`${origin}${url.pathname}${url.search}`);
        if (response.status !== 200 || !response.headers.get("content-type")?.includes("audio/mpeg") || (await response.arrayBuffer()).byteLength < 1000) throw new Error("Signed MP3 could not be fetched");
        report.audioLinksFetched++;
        if (key === "theft") report.sampleAudio = path.join(mediaStore.directory, path.basename(url.pathname));
      }
      const status = { AccountSid: accountSid, From: fromNumber, To: `whatsapp:+${sender}`, MessageSid: sent.sid, MessageStatus: "delivered" };
      if ((await post("/webhooks/twilio/status", status)).status !== 204) throw new Error("Delivery callback rejected");
      // Delayed sent and duplicate delivered must not regress the saved status.
      await post("/webhooks/twilio/status", { ...status, MessageStatus: "sent" });
      await post("/webhooks/twilio/status", status);
      if (store.snapshot().delivery[sent.sid].status !== "delivered") throw new Error("Delivery status regressed");
    }
    if (["confirm", "cancelYes"].includes(key)) {
      const count = outbound.length;
      await post("/webhooks/twilio", body); await service.waitUntilIdle();
      if (outbound.length !== count) throw new Error("Duplicate incoming event caused a duplicate action");
    }
  }
  const state = store.snapshot();
  report.requests = Object.values(state.requests);
  report.delivery = Object.values(state.delivery);
  const legalTurn = report.turns.find((turn) => turn.key === "theft");
  const replay = report.turns.find((turn) => turn.key === "repeat");
  if (replay.replies[0].text !== legalTurn.replies[0].text) throw new Error("The repeat voice command did not replay the legal reply");
  if (report.requests[0]?.caseSummary !== legalTurn.transcript) throw new Error("A control command unexpectedly replaced the case summary");
  if (report.requests.length !== 1 || report.requests[0].status !== "cancelled") throw new Error("The voice cancellation flow did not complete");
  if (legalTurn.evidence?.citations[0]?.source.sectionNumber !== 303) throw new Error("Expected BNS section 303");
  await mkdir(root, { recursive: true, mode: 0o700 });
  const sampleAudio = path.join(root, "legal-reply.mp3");
  await copyFile(report.sampleAudio, sampleAudio);
  report.sampleAudio = sampleAudio;
  await writeFile(path.join(root, "latest-demo.json"), JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(`PASS: ${steps.length} Twilio-shaped turns, ${report.audioLinksFetched} signed audio fetches, deduplication, delivery callbacks and confirmed request cancellation. No real messages sent.\nReport: ${path.join(root, "latest-demo.json")}`);
} finally { await new Promise((resolve) => server.close(resolve)); await service.waitUntilIdle(); }
