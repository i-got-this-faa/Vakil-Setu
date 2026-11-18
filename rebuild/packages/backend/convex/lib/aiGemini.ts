import type { AiProvider, AiRequest, AiResult, AiTransportMetadata } from "./ai";
import { boundedResponseText, extractGeminiContent, geminiConfig } from "./provider";

type Config = Extract<ReturnType<typeof geminiConfig>, { kind: "configured" }>;

export function geminiThinkingConfig(model: string) {
  // MINIMAL is rejected by 3.8 Flash and 4 Argon. Unknown overrides use defaults.
  if (["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3-flash-preview"].includes(model)) return { thinkingConfig: { thinkingLevel: "MINIMAL", includeThoughts: false } };
  if (["gemini-3.8-flash", "gemini-4-argon"].includes(model)) return { thinkingConfig: { thinkingLevel: "LOW", includeThoughts: false } };
  return {};
}

export function geminiRequestBody(model: string, request: AiRequest) {
  return {
    systemInstruction: { parts: [{ text: request.systemInstruction }] },
    contents: request.messages.map(message => ({ role: message.role === "assistant" ? "model" : "user", parts: message.parts.map(part => part.kind === "text" ? { text: part.text } : { inlineData: { mimeType: part.mimeType, data: part.dataBase64 } }) })),
    generationConfig: { candidateCount: 1, maxOutputTokens: request.maxOutputTokens, ...geminiThinkingConfig(model), ...(request.output.kind === "json" ? { responseFormat: { text: { mimeType: "APPLICATION_JSON", schema: request.output.schema } } } : {}) },
  };
}

function failureReason(value: unknown): "blocked" | "truncated" | "malformed" {
  if (typeof value !== "object" || value === null) return "malformed";
  if ("promptFeedback" in value && typeof value.promptFeedback === "object" && value.promptFeedback !== null && "blockReason" in value.promptFeedback && value.promptFeedback.blockReason) return "blocked";
  if ("candidates" in value && Array.isArray(value.candidates)) {
    const candidate: unknown = value.candidates[0];
    if (typeof candidate === "object" && candidate !== null && "finishReason" in candidate) {
      if (candidate.finishReason === "MAX_TOKENS") return "truncated";
      if (["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII"].includes(String(candidate.finishReason))) return "blocked";
    }
  }
  return "malformed";
}

/**
 * One Gemini route (one model on one key).
 * `attemptTimeoutMs` bounds this single attempt so a hung request still leaves time for the next key or model.
 * `downModels` is shared by the routes of one request: once a model answers 503 (overloaded) or 404 (unknown),
 * the same model on the other keys is skipped, because a different account will not fix that.
 */
export function nativeGeminiProvider(config: Config, attemptTimeoutMs?: number, downModels?: Set<string>): AiProvider {
  return { kind: "gemini_native", model: config.model, recipientOrigin: "https://generativelanguage.googleapis.com", ...(downModels ? { skip: () => downModels.has(config.model) } : {}), generate: async (request, options): Promise<AiResult> => {
    const started = Date.now();
    const metadata: AiTransportMetadata = { httpStatus: null, headersMs: null, firstByteMs: null, latencyMs: 0 };
    const signal = attemptTimeoutMs ? AbortSignal.any([options.signal, AbortSignal.timeout(attemptTimeoutMs)]) : options.signal;
    try {
      if (signal.aborted) return { kind: "unavailable", reason: "timeout" };
      const response = await fetch(config.url, { method: "POST", redirect: "error", headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey }, signal, body: JSON.stringify(geminiRequestBody(config.model, request)) });
      metadata.httpStatus = response.status; metadata.headersMs = Date.now() - started;
      options.onMetadata({ ...metadata });
      if (signal.aborted) { await response.body?.cancel(); return { kind: "unavailable", reason: "timeout" }; }
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 503 || response.status === 404) downModels?.add(config.model);
        return { kind: "unavailable", reason: response.status === 429 ? "rate_limited" : "provider_failed" };
      }
      const raw = await boundedResponseText(response, () => {
        if (metadata.firstByteMs === null) { metadata.firstByteMs = Date.now() - started; options.onMetadata({ ...metadata }); }
      }, signal);
      if (signal.aborted) return { kind: "unavailable", reason: "timeout" };
      if (raw === null) return { kind: "unavailable", reason: "response_too_large" };
      const parsed: unknown = JSON.parse(raw);
      const text = extractGeminiContent(parsed)?.trim();
      return text && text.length <= request.maxReplyChars ? { kind: "reply", text } : { kind: "unavailable", reason: text ? "truncated" : failureReason(parsed) };
    } catch (error) {
      return { kind: "unavailable", reason: signal.aborted ? "timeout" : error instanceof SyntaxError ? "malformed" : "provider_failed" };
    } finally { metadata.latencyMs = Date.now() - started; options.onMetadata(metadata); }
  } };
}
