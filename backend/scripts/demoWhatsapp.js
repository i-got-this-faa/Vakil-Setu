import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac } from "node:crypto";
import { createRuntime } from "../src/whatsapp/runtime.js";
import { loadCorpus } from "../src/services/legalCorpus.js";
import { LocalSpeech } from "../src/whatsapp/speech.js";

const backend = fileURLToPath(new URL("../", import.meta.url));
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const root = path.join(backend, "data", "whatsapp-demo");
const directory = path.join(root, "runs", runId);
const corpus = await loadCorpus();
if (!corpus.documents.some((d) => d.source.act === "BNS")) throw new Error("Import the BNS corpus first: npm run legal:ingest:bns --prefix backend");
const runtime = await createRuntime({ mode: "demo", directory });
const fixtures = JSON.parse(await readFile(path.join(backend, "demo/voice-fixtures.json"), "utf8"));
const questionIndex = process.argv.indexOf("--question");
if (questionIndex >= 0) {
  const question = process.argv[questionIndex + 1];
  if (!question?.trim() || question.length > 2000) throw new Error("--question requires 1-2000 characters");
  fixtures.theft.transcript = question;
  runtime.service.speech.fixtures.theft.transcript = question;
}
const steps = ["hello", "consent", "theft", "lawyer", "city", "choose", "time", "confirm", "status"];
const realSpeech = process.argv.includes("--real-speech");
if (realSpeech) {
  const speech = new LocalSpeech();
  await speech.checkReady();
  runtime.service.speech = speech;
  const input = new Map();
  runtime.service.transport.downloadAudio = async (id) => {
    if (!fixtures[id]) throw new Error("Unknown presentation input");
    if (!input.has(id)) input.set(id, await speech.synthesize(fixtures[id].transcript));
    return input.get(id);
  };
}
const server = runtime.app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const url = `http://127.0.0.1:${server.address().port}/webhooks/whatsapp`;
const report = { mode: "local_presentation", messaging: "simulated signed Meta events", transcription: "fixed fixture transcripts, not speech recognition", speechOutput: "real offline synthesis", legalResponse: "retrieved source excerpt, not LLM-generated advice", directory, turns: [] };
if (realSpeech) report.transcription = "real local Whisper ASR on synthetic input voice notes";
console.log(`VAKIL SETU — WHATSAPP BACKEND PRESENTATION\nNo website, MongoDB, API key or network provider is required.\nMessaging is simulated. Transcription: ${report.transcription}. Search and generated audio are real.\n`);
try {
  for (const [index, fixtureId] of steps.entries()) {
    const body = Buffer.from(JSON.stringify({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: runtime.phoneId }, messages: [{ from: "919999000001", id: `wamid.demo.${runId}.${index}`, type: "audio", audio: { id: fixtureId } }] } }] }] }));
    const headers = { "Content-Type": "application/json", "x-hub-signature-256": `sha256=${createHmac("sha256", runtime.appSecret).update(body).digest("hex")}` };
    const response = await fetch(url, { method: "POST", headers, body });
    if (response.status !== 200) throw new Error(`Demo webhook returned ${response.status}`);
    await runtime.service.waitUntilIdle();
    const jobs = Object.values(runtime.service.store.snapshot().inbox);
    const job = jobs.at(-1);
    if (job.status !== "done") throw new Error(`Presentation turn ${fixtureId} failed: ${job.status}`);
    const observed = job.transcription?.text || fixtures[fixtureId].transcript;
    console.log(`${index + 1}. USER [${realSpeech && job.transcription ? "real ASR of synthetic voice" : "fixture transcript"}]: ${observed}`);
    for (const receipt of job.receipts) console.log(`   ASSISTANT [${receipt.kind}]: ${receipt.text}\n`);
    report.turns.push({ fixtureId, transcript: observed, intendedTranscript: fixtures[fixtureId].transcript, transcription: job.transcription, replies: job.receipts, evidence: job.evidence });
    if (fixtureId === "confirm") {
      // Replay the identical signed event to prove message-ID deduplication.
      await fetch(url, { method: "POST", headers, body });
      await runtime.service.waitUntilIdle();
      if (Object.keys(runtime.service.store.snapshot().requests).length !== 1) throw new Error("Duplicate booking request created");
    }
  }
  report.requests = Object.values(runtime.service.store.snapshot().requests);
  const evidence = report.turns.find((turn) => turn.fixtureId === "theft").evidence;
  if (questionIndex < 0 && evidence?.citations?.[0]?.source.sectionNumber !== 303) throw new Error("The default theft scenario did not retrieve BNS section 303");
  report.checks = { signedWebhook: true, duplicateEventIgnored: true, consultationRequests: report.requests.length, appointmentConfirmed: false, paymentTaken: false };
  if (report.requests.length !== 1 || report.requests[0].status !== "requested") throw new Error("Missing consultation request");
  await mkdir(root, { recursive: true, mode: 0o700 });
  const legalAudio = report.turns.find((t) => t.fixtureId === "theft").replies.find((r) => r.audioPath)?.audioPath;
  if (!legalAudio) throw new Error("Legal audio reply missing");
  report.sampleAudio = path.join(root, realSpeech ? "legal-reply.mp3" : "legal-reply.wav");
  await copyFile(legalAudio, report.sampleAudio);
  await writeFile(path.join(root, "latest-demo.json"), JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(`PASS: ${steps.length} voice-flow turns, legal lookup (${evidence?.status}), actual WAV replies, one pending consultation request, duplicate event ignored.`);
  console.log(`Audio: ${report.sampleAudio}\nFull presentation transcript: ${path.join(root, "latest-demo.json")}`);
} finally {
  await new Promise((resolve) => server.close(resolve));
  await runtime.service.waitUntilIdle();
}
