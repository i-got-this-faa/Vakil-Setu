import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const execute = promisify(execFile);
const backend = fileURLToPath(new URL("../../", import.meta.url));

export class DemoSpeech {
  constructor(fixtures = {}) {
    this.fixtures = fixtures;
    this.mode = "fixture_transcription_offline_tts";
    this.supportedLanguages = ["en"];
  }

  async transcribe(mediaId) {
    const fixture = this.fixtures[mediaId];
    if (!fixture || typeof fixture.transcript !== "string") throw new Error("Unknown demo audio fixture");
    return { text: fixture.transcript, language: fixture.language || "en", simulated: true };
  }

  async synthesize(text, language = "en") {
    if (language !== "en") throw new Error("Offline presentation voice supports English only; configure a live speech service for Hindi");
    if (!this.engine) {
      const require = createRequire(import.meta.url);
      this.engine = require("mespeak");
      this.engine.loadConfig(require("mespeak/src/mespeak_config.json"));
      this.engine.loadVoice(require("mespeak/voices/en/en-us.json"));
    }
    const result = this.engine.speak(text, { rawdata: "buffer", speed: 155 });
    if (!result) throw new Error("Offline speech synthesis failed");
    return { bytes: Buffer.from(result), contentType: "audio/wav", extension: "wav" };
  }
}

export class LocalSpeech extends DemoSpeech {
  constructor() {
    super();
    this.mode = "local_whisper_real_asr_offline_tts";
    this.python = process.env.WHATSAPP_PYTHON || path.join(backend, ".whatsapp-venv/bin/python");
  }
  async checkReady() {
    try { await access(this.python); }
    catch { throw new Error("Local speech is not installed. Run npm run setup:speech:local --prefix backend first"); }
    try {
      await execute(this.python, [path.join(backend, "scripts/transcribeLocal.py"), "--cache", path.join(backend, "data/whatsapp-models"), "--check-only"], { timeout: 30000, maxBuffer: 1024 * 1024 });
      await execute("ffmpeg", ["-version"], { timeout: 10000 });
    } catch { throw new Error("Local speech/model or FFmpeg is unavailable. Run npm run setup:speech:local --prefix backend and install FFmpeg"); }
  }
  async transcribe(_mediaId, media, language = "en") {
    if (language !== "en") throw new Error("Local presentation speech currently supports English only");
    if (!media?.bytes?.length) throw new Error("No audio was downloaded");
    const directory = await mkdtemp(path.join(tmpdir(), "vakil-voice-"));
    try {
      const filename = path.join(directory, "voice.audio");
      await writeFile(filename, media.bytes, { mode: 0o600 });
      const { stdout } = await execute(this.python, [path.join(backend, "scripts/transcribeLocal.py"), filename, "--cache", path.join(backend, "data/whatsapp-models")], { timeout: 120000, maxBuffer: 1024 * 1024 });
      const result = JSON.parse(stdout);
      if (typeof result.text !== "string" || !result.text.trim() || result.text.length > 6000) throw new Error("Local transcription returned no usable speech");
      return { text: result.text.trim(), language: "en", simulated: false };
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
  async synthesize(text, language = "en") {
    const wav = await super.synthesize(text, language);
    const directory = await mkdtemp(path.join(tmpdir(), "vakil-reply-"));
    try {
      const filename = path.join(directory, "reply.wav");
      await writeFile(filename, wav.bytes, { mode: 0o600 });
      const { stdout } = await execute("ffmpeg", ["-v", "error", "-i", filename, "-f", "mp3", "-codec:a", "libmp3lame", "-b:a", "64k", "pipe:1"], { timeout: 60000, encoding: "buffer", maxBuffer: 16 * 1024 * 1024 });
      return { bytes: stdout, contentType: "audio/mpeg", extension: "mp3" };
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
}

// For providers implementing the audio/transcriptions and audio/speech protocol.
// No vendor is contacted unless live mode and explicit provider configuration are used.
export class ApiSpeech {
  constructor({ baseUrl, apiKey, sttModel, ttsModel, voice, fetchImpl = fetch }) {
    if (!baseUrl || !apiKey || !sttModel || !ttsModel || !voice) throw new Error("Live speech requires SPEECH_API_BASE_URL, SPEECH_API_KEY, STT_MODEL, TTS_MODEL and TTS_VOICE");
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("Speech API must use HTTPS without URL credentials");
    Object.assign(this, { baseUrl: baseUrl.replace(/\/$/, ""), apiKey, sttModel, ttsModel, voice, fetchImpl, mode: "live_audio_api" });
    this.supportedLanguages = (process.env.SPEECH_LANGUAGES || "en").split(",").map((l) => l.trim()).filter((l) => ["en", "hi"].includes(l));
  }

  async transcribe(_mediaId, media, language) {
    const form = new FormData();
    const extension = { "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/aac": "aac", "audio/amr": "amr", "audio/wav": "wav" }[media.contentType] || "ogg";
    form.set("file", new Blob([media.bytes], { type: media.contentType }), `voice-note.${extension}`);
    form.set("model", this.sttModel);
    if (language) form.set("language", language);
    const response = await this.fetchImpl(`${this.baseUrl}/audio/transcriptions`, {
      method: "POST", headers: { Authorization: `Bearer ${this.apiKey}` }, body: form, signal: AbortSignal.timeout(60000)
    });
    if (!response.ok) throw new Error(`Speech recognition returned HTTP ${response.status}`);
    const result = await response.json();
    if (typeof result.text !== "string" || !result.text.trim() || result.text.length > 6000) throw new Error("Speech recognition returned no usable transcript");
    return { text: result.text.trim(), language: language || "en", simulated: false };
  }

  async synthesize(text, _language) {
    const response = await this.fetchImpl(`${this.baseUrl}/audio/speech`, {
      method: "POST", headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.ttsModel, voice: this.voice, input: text, response_format: "mp3" }), signal: AbortSignal.timeout(60000)
    });
    if (!response.ok) throw new Error(`Speech synthesis returned HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 16 * 1024 * 1024 || !/audio\//.test(response.headers.get("content-type") || "")) throw new Error("Speech synthesis returned invalid audio");
    return { bytes, contentType: "audio/mpeg", extension: "mp3" };
  }
}
