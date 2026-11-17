import type { AiProvider, AiRequest, AiResult, AiTransportMetadata } from "./ai";
import { boundedResponseText } from "./provider";

// MIET DGX gateway (Ollama-style chat API, models hosted on the college's own GPU server).
// Server functions only. Never return this private config to clients.
export const DGX_DEFAULT_URL = "https://ai-services.mietjmu.in/gateway/llm/chat";
export const DGX_DEFAULT_MODELS = ["qwen3.6:35b", "gemma3:27b"];
// Small, fast model that only writes the law search phrase. DGX_QUERY_MODEL=none turns the single-call path off.
export const DGX_DEFAULT_QUERY_MODEL = "qwen3.5:9b";
// Ask the GPU server to keep models loaded between messages (a reload costs ~10 s).
const DGX_KEEP_ALIVE = "30m";
const DGX_DEFAULT_TIMEOUT_MS = 30_000;

export type DgxConfig = { kind: "configured"; url: string; origin: string; models: string[]; queryModel: string | null; apiKey: string; timeoutMs: number } | { kind: "unavailable"; reason: "not_configured" | "invalid_config" };

export function dgxConfig(env: Record<string, string | undefined>): DgxConfig {
  const apiKey = env.DGX_API_KEY?.trim();
  if (!apiKey) return { kind: "unavailable", reason: "not_configured" };
  const url = env.DGX_URL?.trim() || DGX_DEFAULT_URL;
  // First model is tried first; later ones are used only if an earlier one is down, busy or too slow.
  const models = env.DGX_MODELS?.trim() ? env.DGX_MODELS.split(",").map(model => model.trim()).filter(Boolean) : DGX_DEFAULT_MODELS;
  const query = env.DGX_QUERY_MODEL?.trim() || DGX_DEFAULT_QUERY_MODEL;
  const queryModel = query === "none" ? null : query;
  const timeoutMs = env.DGX_TIMEOUT_MS?.trim() ? Number(env.DGX_TIMEOUT_MS) : DGX_DEFAULT_TIMEOUT_MS;
  let origin: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return { kind: "unavailable", reason: "invalid_config" };
    origin = parsed.origin;
  } catch { return { kind: "unavailable", reason: "invalid_config" }; }
  if (/\s/u.test(apiKey) || !models.length || models.length > 5 || [...models, ...(queryModel ? [queryModel] : [])].some(model => model.length > 100 || !/^[A-Za-z0-9._:/-]+$/u.test(model))) return { kind: "unavailable", reason: "invalid_config" };
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000) return { kind: "unavailable", reason: "invalid_config" };
  return { kind: "configured", url, origin, models, queryModel, apiKey, timeoutMs };
}

export function dgxRequestBody(model: string, request: AiRequest) {
  // The gateway does not always pass `format` on to the model (gemma ignores it), so the shape is spelled out too.
  const shape = request.output.kind === "json"
    ? `\n\nReply with ONLY one JSON object (no other text, no code fences) matching this JSON schema:\n${JSON.stringify(request.output.schema)}`
    : "";
  const messages = [{ role: "system", content: request.systemInstruction + shape }];
  for (const message of request.messages) {
    // Callers only route text to DGX (see `acceptsFiles`); file parts never reach this point.
    messages.push({ role: message.role, content: message.parts.map(part => part.kind === "text" ? part.text : "").filter(Boolean).join("\n\n") });
  }
  return {
    model, stream: false, think: false, keep_alive: DGX_KEEP_ALIVE, messages,
    options: { num_predict: request.maxOutputTokens, temperature: 0.3 },
    ...(request.output.kind === "json" ? { format: request.output.schema } : {}),
  };
}

/** The model's answer text: hidden reasoning and ```json fences removed; for JSON requests, just the object. */
export function dgxContent(value: unknown, json: boolean): string | null {
  if (typeof value !== "object" || value === null || !("message" in value)) return null;
  if ("success" in value && value.success === false) return null;
  const message = value.message;
  if (typeof message !== "object" || message === null || !("content" in message) || typeof message.content !== "string") return null;
  let text = message.content.replace(/<think>[\s\S]*?<\/think>/gu, "").trim();
  if (!json) return text || null;
  text = text.replace(/^```(?:json)?\s*/u, "").replace(/\s*```$/u, "");
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  text = text.slice(start, end + 1);
  try { JSON.parse(text); } catch { return null; }
  return text;
}

export function dgxProvider(config: Extract<DgxConfig, { kind: "configured" }>, model: string, timeoutMs = config.timeoutMs): AiProvider {
  return { kind: "dgx", model, recipientOrigin: config.origin, acceptsFiles: false, generate: async (request, options): Promise<AiResult> => {
    const started = Date.now();
    const metadata: AiTransportMetadata = { httpStatus: null, headersMs: null, firstByteMs: null, latencyMs: 0 };
    // Each model gets its own time limit so a slow server still leaves time for the next one.
    const signal = AbortSignal.any([options.signal, AbortSignal.timeout(timeoutMs)]);
    try {
      if (request.messages.some(message => message.parts.some(part => part.kind === "file"))) return { kind: "unavailable", reason: "provider_failed" };
      if (signal.aborted) return { kind: "unavailable", reason: "timeout" };
      const response = await fetch(config.url, { method: "POST", redirect: "error", headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` }, signal, body: JSON.stringify(dgxRequestBody(model, request)) });
      metadata.httpStatus = response.status; metadata.headersMs = Date.now() - started;
      options.onMetadata({ ...metadata });
      if (!response.ok) { await response.body?.cancel(); return { kind: "unavailable", reason: response.status === 429 ? "rate_limited" : "provider_failed" }; }
      const raw = await boundedResponseText(response, () => {
        if (metadata.firstByteMs === null) { metadata.firstByteMs = Date.now() - started; options.onMetadata({ ...metadata }); }
      }, signal);
      if (signal.aborted) return { kind: "unavailable", reason: "timeout" };
      if (raw === null) return { kind: "unavailable", reason: "response_too_large" };
      const text = dgxContent(JSON.parse(raw), request.output.kind === "json");
      if (!text) return { kind: "unavailable", reason: "malformed" };
      return text.length <= request.maxReplyChars ? { kind: "reply", text } : { kind: "unavailable", reason: "truncated" };
    } catch (error) {
      return { kind: "unavailable", reason: signal.aborted ? "timeout" : error instanceof SyntaxError ? "malformed" : "provider_failed" };
    } finally { metadata.latencyMs = Date.now() - started; options.onMetadata(metadata); }
  } };
}
