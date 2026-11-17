import type { VoiceLocale } from "@legal-setu/domain";

// Bhashini (Government of India) text-to-speech. Urdu has no Bhashini voice; the app uses the phone's voice for it.
const SERVICES: Partial<Record<VoiceLocale, string>> = {
  hi: "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4",
  pa: "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4",
  bn: "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4",
  mr: "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4",
  gu: "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4",
  or: "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4",
  ta: "ai4bharat/indic-tts-coqui-dravidian-gpu--t4",
  te: "ai4bharat/indic-tts-coqui-dravidian-gpu--t4",
  kn: "ai4bharat/indic-tts-coqui-dravidian-gpu--t4",
  ml: "ai4bharat/indic-tts-coqui-dravidian-gpu--t4",
  en: "ai4bharat/indic-tts-coqui-misc-gpu--t4",
  // No Dogri voice exists on Bhashini; Dogri is written in Devanagari, so the Hindi voice reads it.
  doi: "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4",
};
const VOICE_LANGUAGE: Partial<Record<VoiceLocale, string>> = { doi: "hi" };
export const BHASHINI_ENDPOINT = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline";
export const BHASHINI_VOICE = "male"; // matches the app's avatar
export function bhashiniService(locale: VoiceLocale): string | undefined {
  return SERVICES[locale];
}
export function bhashiniKeys(env: Record<string, string | undefined>): string[] {
  return [env.BHASHINI_API_KEY, env.BHASHINI_API_KEY_FALLBACK].map((key) => key?.trim() ?? "").filter(Boolean);
}

/** Turns Bhashini's 32-bit float WAV into standard 16-bit PCM WAV: half the size and plays on every phone. */
export function toPcm16Wav(wav: Uint8Array): Uint8Array {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const tag = (offset: number) => String.fromCharCode(...wav.subarray(offset, offset + 4));
  if (wav.byteLength < 44 || tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error("not a WAV file");
  let format = 0, channels = 0, rate = 0, bits = 0, data: Uint8Array | null = null;
  for (let offset = 12; offset + 8 <= wav.byteLength;) {
    const id = tag(offset), size = view.getUint32(offset + 4, true), body = offset + 8;
    if (id === "fmt ") { format = view.getUint16(body, true); channels = view.getUint16(body + 2, true); rate = view.getUint32(body + 4, true); bits = view.getUint16(body + 14, true); }
    if (id === "data") { data = wav.subarray(body, Math.min(body + size, wav.byteLength)); break; }
    offset = body + size + (size % 2);
  }
  if (!data || !channels || !rate) throw new Error("WAV without audio");
  if (format === 1 && bits === 16) return wav;
  if (format !== 3 || bits !== 32) throw new Error(`unsupported WAV format ${format}/${bits}`);
  const samples = Math.floor(data.byteLength / 4);
  const input = new DataView(data.buffer, data.byteOffset, samples * 4);
  const out = new Uint8Array(44 + samples * 2);
  const o = new DataView(out.buffer);
  const write = (offset: number, text: string) => { for (let i = 0; i < 4; i++) out[offset + i] = text.charCodeAt(i); };
  write(0, "RIFF"); o.setUint32(4, 36 + samples * 2, true); write(8, "WAVE");
  write(12, "fmt "); o.setUint32(16, 16, true); o.setUint16(20, 1, true); o.setUint16(22, channels, true);
  o.setUint32(24, rate, true); o.setUint32(28, rate * channels * 2, true); o.setUint16(32, channels * 2, true); o.setUint16(34, 16, true);
  write(36, "data"); o.setUint32(40, samples * 2, true);
  for (let i = 0; i < samples; i++) {
    const value = Math.max(-1, Math.min(1, input.getFloat32(i * 4, true)));
    o.setInt16(44 + i * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true);
  }
  return out;
}

/** One sentence or two of speech. Tries each configured key; returns null if Bhashini can't help. */
export async function bhashiniSpeak(text: string, locale: VoiceLocale, keys: string[], signal: AbortSignal): Promise<Uint8Array | null> {
  const serviceId = bhashiniService(locale);
  if (!serviceId) return null;
  for (const key of keys) {
    try {
      const response = await fetch(BHASHINI_ENDPOINT, {
        method: "POST", redirect: "error", signal,
        headers: { "Content-Type": "application/json", Authorization: key },
        body: JSON.stringify({ pipelineTasks: [{ taskType: "tts", config: { language: { sourceLanguage: VOICE_LANGUAGE[locale] ?? locale }, serviceId, gender: BHASHINI_VOICE, samplingRate: 16000 } }], inputData: { input: [{ source: text }] } }),
      });
      if (!response.ok) { await response.body?.cancel(); continue; }
      const json: unknown = await response.json();
      const content = (json as { pipelineResponse?: { audio?: { audioContent?: unknown }[] }[] })?.pipelineResponse?.[0]?.audio?.[0]?.audioContent;
      if (typeof content !== "string" || !content) continue;
      const binary = atob(content);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return toPcm16Wav(bytes);
    } catch (error) {
      if (signal.aborted) throw error;
    }
  }
  return null;
}

const TRANSLATION_SERVICE = "ai4bharat/indictrans-v2-all-gpu--t4";

/** Translates short texts between Indian languages (IndicTrans2 on Bhashini). Returns null if it fails. */
export async function bhashiniTranslate(texts: string[], from: string, to: string, keys: string[], signal: AbortSignal): Promise<string[] | null> {
  if (!texts.length) return [];
  for (const key of keys) {
    try {
      const response = await fetch(BHASHINI_ENDPOINT, {
        method: "POST", redirect: "error", signal,
        headers: { "Content-Type": "application/json", Authorization: key },
        body: JSON.stringify({ pipelineTasks: [{ taskType: "translation", config: { language: { sourceLanguage: from, targetLanguage: to }, serviceId: TRANSLATION_SERVICE } }], inputData: { input: texts.map((source) => ({ source })) } }),
      });
      if (!response.ok) { await response.body?.cancel(); continue; }
      const json: unknown = await response.json();
      const output = (json as { pipelineResponse?: { output?: { target?: unknown }[] }[] })?.pipelineResponse?.[0]?.output;
      if (!Array.isArray(output) || output.length !== texts.length) continue;
      const targets = output.map((item) => (typeof item?.target === "string" ? item.target.trim() : ""));
      if (targets.some((target) => !target)) continue;
      return targets;
    } catch (error) {
      if (signal.aborted) throw error;
    }
  }
  return null;
}

// Speech-to-text (AI4Bharat models on Bhashini). Each was checked by round-tripping Bhashini speech in that language.
const ASR_SERVICES: Record<VoiceLocale, string> = {
  hi: "ai4bharat/conformer-hi-gpu--t4",
  doi: "ai4bharat/conformer-hi-gpu--t4", // No Dogri model; Dogri shares Devanagari and much vocabulary with Hindi.
  en: "ai4bharat/whisper-medium-en--gpu--t4",
  pa: "ai4bharat/conformer-multilingual-indo_aryan-gpu--t4",
  bn: "ai4bharat/conformer-multilingual-indo_aryan-gpu--t4",
  mr: "ai4bharat/conformer-multilingual-indo_aryan-gpu--t4",
  gu: "ai4bharat/conformer-multilingual-indo_aryan-gpu--t4",
  or: "ai4bharat/conformer-multilingual-indo_aryan-gpu--t4",
  ur: "ai4bharat/conformer-multilingual-indo_aryan-gpu--t4",
  ta: "ai4bharat/conformer-multilingual-dravidian-gpu--t4",
  te: "ai4bharat/conformer-multilingual-dravidian-gpu--t4",
  kn: "ai4bharat/conformer-multilingual-dravidian-gpu--t4",
  ml: "ai4bharat/conformer-multilingual-dravidian-gpu--t4",
};
const ASR_LANGUAGE: Partial<Record<VoiceLocale, string>> = { doi: "hi" };
// Bhashini decodes these containers. Raw AAC in ADTS (older Android builds) is rejected, so it is not listed.
const ASR_FORMATS: Record<string, string> = { "audio/wav": "wav", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/webm": "webm" };

/** Writes down what was said. Returns "" for silence, or null when Bhashini can't help (the caller then falls back). */
export async function bhashiniTranscribe(audio: ArrayBuffer, mimeType: string, locale: VoiceLocale, keys: string[], signal: AbortSignal): Promise<string | null> {
  const audioFormat = ASR_FORMATS[mimeType];
  if (!audioFormat || !keys.length) return null;
  const audioContent = Buffer.from(audio).toString("base64");
  for (const key of keys) {
    try {
      const response = await fetch(BHASHINI_ENDPOINT, {
        method: "POST", redirect: "error", signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
        headers: { "Content-Type": "application/json", Authorization: key },
        body: JSON.stringify({ pipelineTasks: [{ taskType: "asr", config: { language: { sourceLanguage: ASR_LANGUAGE[locale] ?? locale }, serviceId: ASR_SERVICES[locale], audioFormat, samplingRate: 16000 } }], inputData: { audio: [{ audioContent }] } }),
      });
      if (!response.ok) { await response.body?.cancel(); continue; }
      const json: unknown = await response.json();
      const source = (json as { pipelineResponse?: { output?: { source?: unknown }[] }[] })?.pipelineResponse?.[0]?.output?.[0]?.source;
      if (typeof source === "string") return source.trim();
    } catch (error) {
      if (signal.aborted) throw error;
    }
  }
  return null;
}
