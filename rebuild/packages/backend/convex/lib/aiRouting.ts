"use node";

import type { AiFailureReason, AiProvider, AiRequest, AiResult } from "./ai";
import { dgxConfig, dgxProvider } from "./aiDgx";
import { nativeGeminiProvider } from "./aiGemini";
import { nativeVertexProvider } from "./aiVertex";
import { geminiConfig } from "./provider";
import { vertexConfig } from "./vertexConfig";
import { lawQueryResponseSchema, lawQuerySystemInstruction } from "./voice";

// Only explicitly consented routes enter the chain. The caller owns the shared deadline.
export function aiRoutes(env: Record<string, string | undefined>, allowVertexFallback: boolean) {
  const gemini = geminiConfig(env);
  if (gemini.kind === "unavailable") return gemini;
  const vertex = vertexConfig(env);
  const providers: AiProvider[] = [nativeGeminiProvider(gemini)];
  if (allowVertexFallback && vertex.kind === "configured") providers.push(nativeVertexProvider(vertex));

  return { kind: "configured", providers } as const;
}

/**
 * Voice conversation: the college DGX models first (in DGX_MODELS order), then Gemini as a last resort.
 * Voice consent covers "AI services", so no per-provider opt-in is needed here.
 */
export function voiceRoutes(env: Record<string, string | undefined>) {
  const dgx = dgxConfig(env);
  const gemini = geminiConfig(env);
  const providers: AiProvider[] = [];
  if (dgx.kind === "configured") providers.push(...dgx.models.map(model => dgxProvider(dgx, model)));
  if (gemini.kind === "configured") providers.push(nativeGeminiProvider(gemini));
  if (!providers.length) return { kind: "unavailable", reason: dgx.kind === "unavailable" && dgx.reason === "invalid_config" ? "invalid_config" : gemini.kind === "unavailable" ? gemini.reason : "not_configured" } as const;
  return { kind: "configured", providers } as const;
}

/** Any failure moves on to the next provider (the shared deadline still bounds the whole chain). */
export const fallThroughAnyFailure = (_reason: AiFailureReason) => true;

export async function generateWithQuotaFallback(providers: readonly AiProvider[], request: AiRequest, options: Parameters<AiProvider["generate"]>[1], beforeDispatch: (provider: AiProvider) => Promise<void>, fallThrough: (reason: AiFailureReason) => boolean = reason => reason === "rate_limited"): Promise<{ result: AiResult; provider: AiProvider }> {
  const hasFiles = request.messages.some(message => message.parts.some(part => part.kind === "file"));
  const usable = hasFiles ? providers.filter(provider => provider.acceptsFiles !== false) : providers;
  // Nothing can read the attached audio or document: report it like any other provider failure.
  if (!usable.length) return { result: { kind: "unavailable", reason: "provider_failed" }, provider: providers[0]! };
  for (const provider of usable) {
    options.signal.throwIfAborted();
    // Recheck ownership and persist the exact recipient BEFORE each outbound request.
    await beforeDispatch(provider);
    options.signal.throwIfAborted();
    const result = await provider.generate(request, options);
    if (result.kind !== "unavailable" || !fallThrough(result.reason) || provider === usable.at(-1)) return { result, provider };
  }
  throw new Error("At least one configured provider required");
}

// The search-phrase step must be quick: if the small model is busy, answer without law excerpts this turn.
const LAW_QUERY_TIMEOUT_MS = 6_000;

/** Small DGX model that writes only the law search phrase; null turns the single-call voice path off. */
export function dgxQueryProvider(env: Record<string, string | undefined>): AiProvider | null {
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
