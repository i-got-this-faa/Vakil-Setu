import type { VoiceLocale } from "@legal-setu/domain";
import { geminiKeys } from "./provider";
import { toPcm16Wav } from "./bhashini";

// Gemini text-to-speech, used only for languages Bhashini has no voice for.
// Kashmiri: Gemini 3.8 Flash TTS lists Kashmiri (Perso-Arabic and Devanagari) as supported, and
// Bhashini's speech-to-text read our Gemini Kashmiri sample back almost word for word.
export const GEMINI_VOICE_LOCALES: readonly VoiceLocale[] = ["ks"];
const DEFAULT_MODEL = "gemini-3.8-flash-lite-tts";
const VOICE = "Charon"; // A male voice, to match the app's avatar.
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

export function geminiSpeechModel(env: Record<string, string | undefined>) {
  const model = env.GEMINI_TTS_MODEL?.trim();
  return model && /^[a-z0-9.-]{3,80}$/.test(model) ? model : DEFAULT_MODEL;
}

/** Wraps headerless 16-bit mono PCM (Gemini's "audio/L16;rate=24000") in a WAV header. */
export function pcmToWav(pcm: Uint8Array, rate: number): Uint8Array {
  const out = new Uint8Array(44 + pcm.byteLength);
  const view = new DataView(out.buffer);
  const write = (offset: number, text: string) => { for (let i = 0; i < 4; i++) out[offset + i] = text.charCodeAt(i); };
  write(0, "RIFF"); view.setUint32(4, 36 + pcm.byteLength, true); write(8, "WAVE");
  write(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  write(36, "data"); view.setUint32(40, pcm.byteLength, true);
  out.set(pcm, 44);
  return out;
}

/** One sentence or two of speech as a 16-bit WAV. Tries each Gemini key; returns null if none can help. */
export async function geminiSpeak(text: string, env: Record<string, string | undefined>, signal: AbortSignal): Promise<Uint8Array | null> {
  const model = geminiSpeechModel(env);
  for (const key of geminiKeys(env)) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST", redirect: "error", signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
        }),
      });
      if (!response.ok) { await response.body?.cancel(); continue; }
      const json: unknown = await response.json();
      const part = (json as { candidates?: { content?: { parts?: { inlineData?: { mimeType?: unknown; data?: unknown } }[] } }[] })?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
      if (typeof part?.data !== "string" || typeof part.mimeType !== "string" || !part.data) continue;
      const binary = atob(part.data);
      if (binary.length > MAX_AUDIO_BYTES) continue;
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      if (part.mimeType.startsWith("audio/wav")) return toPcm16Wav(bytes);
      const rate = Number(/rate=(\d+)/.exec(part.mimeType)?.[1] ?? 24000);
      if (!/^audio\/l16/i.test(part.mimeType) || !Number.isInteger(rate) || rate < 8000 || rate > 48000) continue;
      return pcmToWav(bytes, rate);
    } catch (error) {
      if (signal.aborted) throw error;
    }
  }
  return null;
}
