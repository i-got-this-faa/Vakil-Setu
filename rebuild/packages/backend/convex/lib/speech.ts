import { v } from "convex/values";
import { CHAT_LIMITS } from "@legal-setu/domain";
import { AiDeadlineError } from "./ai";

// Server-only ElevenLabs text-to-speech policy. Never import from client code; never return config to clients.
// Verified against https://elevenlabs.io/docs/api-reference/text-to-speech/convert and /docs/overview/models:
// eleven_multilingual_v2 lists English and Hindi; Punjabi is NOT listed for that model, so Punjabi is excluded.
export const SPEECH_MODEL = "eleven_multilingual_v2";
export const SPEECH_OUTPUT_FORMAT = "mp3_44100_128";
export const SPEECH_RECIPIENT_ORIGIN = "https://api.elevenlabs.io";
export const SPEECH_LOCALES = ["en", "hi"] as const;
export const SPEECH_LIMITS = {
  textChars: CHAT_LIMITS.replyChars,
  audioBytes: 2 * 1024 * 1024,
  timeoutMs: 20_000,
  requestsPerHour: 30,
  inFlightMs: 60_000,
} as const;

export type SpeechUnavailableReason =
  | "not_configured"
  | "invalid_config"
  | "unsupported_language"
  | "no_reply"
  | "rate_limited"
  | "timeout"
  | "provider_failed"
  | "response_too_large"
  | "malformed";
export type SpeechResult = { kind: "audio"; mimeType: "audio/mpeg"; audio: ArrayBuffer } | { kind: "unavailable"; reason: SpeechUnavailableReason };

export const speechResult = v.union(
  v.object({ kind: v.literal("audio"), mimeType: v.literal("audio/mpeg"), audio: v.bytes() }),
  v.object({ kind: v.literal("unavailable"), reason: v.union(
    v.literal("not_configured"), v.literal("invalid_config"), v.literal("unsupported_language"), v.literal("no_reply"),
    v.literal("rate_limited"), v.literal("timeout"), v.literal("provider_failed"), v.literal("response_too_large"), v.literal("malformed"),
  ) }),
);

export type SpeechConfig = { kind: "configured"; apiKey: string; voiceId: string } | { kind: "unavailable"; reason: "not_configured" | "invalid_config" };

export function speechConfig(env: Record<string, string | undefined>): SpeechConfig {
  const apiKey = env.ELEVENLABS_API_KEY?.trim();
  const voiceId = env.ELEVENLABS_VOICE_ID?.trim();
  if (!apiKey || !voiceId) return { kind: "unavailable", reason: "not_configured" };
  if (/\s/u.test(apiKey) || apiKey.length > 256 || !/^[A-Za-z0-9]{8,64}$/u.test(voiceId)) return { kind: "unavailable", reason: "invalid_config" };
  return { kind: "configured", apiKey, voiceId };
}

// Public, secret-free: no API key and no voice ID.
export function speechCapabilities(env: Record<string, string | undefined>) {
  const config = speechConfig(env);
  return {
    configured: config.kind === "configured",
    ...(config.kind === "unavailable" ? { reason: config.reason } : {}),
    provider: "elevenlabs" as const,
    model: SPEECH_MODEL,
    languages: [...SPEECH_LOCALES],
    maxTextChars: SPEECH_LIMITS.textChars,
    maxAudioBytes: SPEECH_LIMITS.audioBytes,
  };
}

export function speechLocaleSupported(locale: string): boolean {
  return (SPEECH_LOCALES as readonly string[]).includes(locale);
}

export function speechEndpoint(voiceId: string): string {
  return `${SPEECH_RECIPIENT_ORIGIN}/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${SPEECH_OUTPUT_FORMAT}`;
}

// MP3 sanity check: ID3 tag or MPEG frame sync. Rejects JSON/HTML error bodies returned with 200.
export function looksLikeMp3(bytes: Uint8Array): boolean {
  if (bytes.length < 3) return false;
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true;
  return bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0;
}

async function readBounded(response: Response, maxBytes: number, signal: AbortSignal): Promise<Uint8Array | null> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) { await response.body?.cancel(); return null; }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) { await reader.cancel(); return null; }
      chunks.push(chunk.value);
    }
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

// Fixed HTTPS endpoint, redirects refused, key only in a header, no provider body echoed back.
export async function synthesizeElevenLabs(config: Extract<SpeechConfig, { kind: "configured" }>, text: string, signal: AbortSignal): Promise<SpeechResult> {
  try {
    if (signal.aborted) return { kind: "unavailable", reason: "timeout" };
    const response = await fetch(speechEndpoint(config.voiceId), {
      method: "POST",
      redirect: "error",
      signal,
      headers: { "Content-Type": "application/json", Accept: "audio/mpeg", "xi-api-key": config.apiKey },
      body: JSON.stringify({ text, model_id: SPEECH_MODEL }),
    });
    if (signal.aborted) { await response.body?.cancel(); return { kind: "unavailable", reason: "timeout" }; }
    if (!response.ok) { await response.body?.cancel(); return { kind: "unavailable", reason: response.status === 429 ? "rate_limited" : "provider_failed" }; }
    const bytes = await readBounded(response, SPEECH_LIMITS.audioBytes, signal);
    if (signal.aborted) return { kind: "unavailable", reason: "timeout" };
    if (bytes === null) return { kind: "unavailable", reason: "response_too_large" };
    if (!bytes.length || !looksLikeMp3(bytes)) return { kind: "unavailable", reason: "malformed" };
    return { kind: "audio", mimeType: "audio/mpeg", audio: bytes.buffer as ArrayBuffer };
  } catch (error) {
    if (signal.aborted || error instanceof AiDeadlineError) return { kind: "unavailable", reason: "timeout" };
    return { kind: "unavailable", reason: "provider_failed" };
  }
}
