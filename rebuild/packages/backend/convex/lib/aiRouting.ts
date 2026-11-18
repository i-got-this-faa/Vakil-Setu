"use node";

import type { AiFailureReason, AiProvider, AiRequest, AiResult } from "./ai";
import { dgxConfig, dgxProvider } from "./aiDgx";
import { nativeGeminiProvider } from "./aiGemini";
import { nativeVertexProvider } from "./aiVertex";
import { geminiConfigs } from "./provider";
import { vertexConfig } from "./vertexConfig";
import { lawQueryResponseSchema, lawQuerySystemInstruction } from "./voice";

// Only explicitly consented routes enter the chain. The caller owns the shared deadline.
const GEMINI_ATTEMPT_TIMEOUT_MS = 20_000;

/** Every Gemini key/model route for one request (see `geminiConfigs`), sharing one "model is down" memory. */
function geminiProviders(env: Record<string, string | undefined>) {
  const configs = geminiConfigs(env);
  if (!Array.isArray(configs)) return configs;
  const attempt = Number(env.GEMINI_ATTEMPT_TIMEOUT_MS?.trim() || GEMINI_ATTEMPT_TIMEOUT_MS);
  if (!Number.isInteger(attempt) || attempt < 1_000 || attempt > 120_000) return { kind: "unavailable", reason: "invalid_config" } as const;
  // A single route keeps the old behaviour exactly: no per-attempt limit inside the caller's deadline.
  if (configs.length === 1) return [nativeGeminiProvider(configs[0]!)];
  const downModels = new Set<string>();
  return configs.map(config => nativeGeminiProvider(config, attempt, downModels));
}

/** AI_PROVIDER=gemini: answer with Gemini only and leave the college DGX server out (e.g. for a demo). */
export function geminiOnly(env: Record<string, string | undefined>) {
  return env.AI_PROVIDER?.trim().toLowerCase() === "gemini";
}

// Only explicitly consented routes enter the chain. The caller owns the shared deadline.
export function aiRoutes(env: Record<string, string | undefined>, allowVertexFallback: boolean) {
  const gemini = geminiProviders(env);
  if (!Array.isArray(gemini)) return gemini;
  const vertex = vertexConfig(env);
  const providers: AiProvider[] = [...gemini];
  if (allowVertexFallback && vertex.kind === "configured") providers.push(nativeVertexProvider(vertex));

  return { kind: "configured", providers } as const;
}

/**
 * Voice conversation: the college DGX models first (in DGX_MODELS order), then Gemini as a last resort.
 * With AI_PROVIDER=gemini, only Gemini is used.
 * Voice consent covers "AI services", so no per-provider opt-in is needed here.
 */
export function voiceRoutes(env: Record<string, string | undefined>) {
  const dgx = geminiOnly(env) ? { kind: "unavailable", reason: "not_configured" } as const : dgxConfig(env);
  const gemini = geminiProviders(env);
  const providers: AiProvider[] = [];
  if (dgx.kind === "configured") providers.push(...dgx.models.map(model => dgxProvider(dgx, model)));
  if (Array.isArray(gemini)) providers.push(...gemini);
  if (!providers.length) return { kind: "unavailable", reason: dgx.kind === "unavailable" && dgx.reason === "invalid_config" ? "invalid_config" : !Array.isArray(gemini) ? gemini.reason : "not_configured" } as const;
  return { kind: "configured", providers } as const;
}

/** Any failure moves on to the next provider (the shared deadline still bounds the whole chain). */
export const fallThroughAnyFailure = (_reason: AiFailureReason) => true;

/**
 * Default policy: a quota error may move to any consented route; an outage or slow answer moves on only to
 * another route at the SAME recipient (another Gemini key or model), never to a new recipient such as Vertex.
 */
export const fallThroughQuotaOrSameRecipient = (reason: AiFailureReason, from: AiProvider, to: AiProvider | undefined) =>
  reason === "rate_limited" || (to?.recipientOrigin === from.recipientOrigin && (reason === "provider_failed" || reason === "timeout"));

export async function generateWithQuotaFallback(providers: readonly AiProvider[], request: AiRequest, options: Parameters<AiProvider["generate"]>[1], beforeDispatch: (provider: AiProvider) => Promise<void>, fallThrough: (reason: AiFailureReason, from: AiProvider, to: AiProvider | undefined) => boolean = fallThroughQuotaOrSameRecipient): Promise<{ result: AiResult; provider: AiProvider }> {
  const hasFiles = request.messages.some(message => message.parts.some(part => part.kind === "file"));
  const usable = hasFiles ? providers.filter(provider => provider.acceptsFiles !== false) : providers;
  // Nothing can read the attached audio or document: report it like any other provider failure.
  if (!usable.length) return { result: { kind: "unavailable", reason: "provider_failed" }, provider: providers[0]! };
  let last: { result: AiResult; provider: AiProvider } | null = null;
  for (const [index, provider] of usable.entries()) {
    // A route already known to be down for this request (e.g. overloaded model on another key) is not retried.
    if (provider.skip?.()) continue;
    options.signal.throwIfAborted();
    // Recheck ownership and persist the exact recipient BEFORE each outbound request.
    await beforeDispatch(provider);
    options.signal.throwIfAborted();
    const result = await provider.generate(request, options);
    last = { result, provider };
    if (result.kind !== "unavailable" || !fallThrough(result.reason, provider, usable.slice(index + 1).find(next => !next.skip?.()))) return last;
  }
  if (last) return last;
  // Every route was skipped as down: report the outage without another request.
  return { result: { kind: "unavailable", reason: "provider_failed" }, provider: usable[0]! };
}

// The search-phrase step must be quick: if the small model is busy, answer without law excerpts this turn.
const LAW_QUERY_TIMEOUT_MS = 6_000;

/** Small DGX model that writes only the law search phrase; null turns the single-call voice path off. */
export function dgxQueryProvider(env: Record<string, string | undefined>): AiProvider | null {
  if (geminiOnly(env)) return null;
  const dgx = dgxConfig(env);
  if (dgx.kind !== "configured" || !dgx.queryModel) return null;
  return dgxProvider(dgx, dgx.queryModel, LAW_QUERY_TIMEOUT_MS);
}

/** English legal search phrase for the person's message, or "" when it isn't about the law (or the model is slow). */
export async function writeLawQuery(provider: AiProvider, message: string, summary: string, signal: AbortSignal, beforeDispatch: (provider: AiProvider) => Promise<void>): Promise<string> {
  await beforeDispatch(provider);
  signal.throwIfAborted();
  const text = summary ? `Their problem so far: ${summary}\nTheir new message: ${message}` : message;
  const result = await provider.generate({
    systemInstruction: lawQuerySystemInstruction(),
    messages: [{ role: "user", parts: [{ kind: "text", text }] }],
    maxOutputTokens: 60, maxReplyChars: 2_000, output: { kind: "json", schema: lawQueryResponseSchema() },
  }, { signal, onMetadata: () => {} });
  if (result.kind !== "reply") return "";
  try {
    const value: unknown = JSON.parse(result.text);
    const query = typeof value === "object" && value !== null && "lawQuery" in value && typeof value.lawQuery === "string" ? value.lawQuery.trim() : "";
    return query.slice(0, 300);
  } catch { return ""; }
}
