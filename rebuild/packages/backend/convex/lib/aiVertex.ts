"use node";

import { createHash, createPrivateKey, sign } from "node:crypto";
import type { AiFailureReason, AiProvider, AiRequest, AiResult, AiTransportMetadata } from "./ai";
import { geminiThinkingConfig } from "./aiGemini";
import { boundedResponseText, extractGeminiContent } from "./provider";
import { vertexConfig, VERTEX_TOKEN_URL } from "./vertexConfig";
export { vertexConfig } from "./vertexConfig";

type Config = Extract<ReturnType<typeof vertexConfig>, { kind: "configured" }>;
const tokenCache = new Map<string, { accessToken: string; expiresAt: number }>();
const TOKEN_SAFETY_MS = 60_000;
const TOKEN_TIMEOUT_MS = 10_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Settle promptly even when a transport ignores cancellation. Never cache late auth.
function abortable<T>(signal: AbortSignal, task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error("AI request aborted"));
    if (signal.aborted) { abort(); return; }
    signal.addEventListener("abort", abort, { once: true });
    void task().then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

async function accessToken(config: Config, signal: AbortSignal, recordStatus: (response: Response) => void): Promise<{ kind: "token"; token: string } | { kind: "unavailable"; reason: AiFailureReason }> {
  const cacheKey = createHash("sha256").update(JSON.stringify([config.projectId, config.clientEmail, config.privateKey])).digest("hex");
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + TOKEN_SAFETY_MS) return { kind: "token", token: cached.accessToken };
  tokenCache.delete(cacheKey);
  const controller = new AbortController();
  const combined = AbortSignal.any([signal, controller.signal]);
  const timer = setTimeout(() => controller.abort(), TOKEN_TIMEOUT_MS);
  try {
    return await abortable(combined, async () => {
      const key = createPrivateKey(config.privateKey);
      if (key.asymmetricKeyType !== "rsa" || (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) return { kind: "unavailable", reason: "provider_failed" };
      const issued = Math.floor(Date.now() / 1000);
      const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
      const claims = Buffer.from(JSON.stringify({ iss: config.clientEmail, scope: "https://www.googleapis.com/auth/cloud-platform", aud: VERTEX_TOKEN_URL, iat: issued, exp: issued + 3600 })).toString("base64url");
      const unsigned = `${header}.${claims}`;
      const assertion = `${unsigned}.${sign("RSA-SHA256", Buffer.from(unsigned), key).toString("base64url")}`;
      const started = Date.now();
      const response = await fetch(VERTEX_TOKEN_URL, { method: "POST", redirect: "error", signal: combined, headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString() });
      if (combined.aborted) { void response.body?.cancel().catch(() => {}); return { kind: "unavailable", reason: "timeout" }; }
      recordStatus(response);
      if (!response.ok) { void response.body?.cancel().catch(() => {}); return { kind: "unavailable", reason: response.status === 429 ? "rate_limited" : "provider_failed" }; }
      const raw = await boundedResponseText(response, undefined, combined);
      if (combined.aborted) return { kind: "unavailable", reason: "timeout" };
      if (raw === null) return { kind: "unavailable", reason: "response_too_large" };
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed) || typeof parsed.access_token !== "string" || parsed.access_token.length > 16_384 || !/^[A-Za-z0-9._~+/-]+=*$/u.test(parsed.access_token)
        || typeof parsed.token_type !== "string" || parsed.token_type.toLowerCase() !== "bearer" || typeof parsed.expires_in !== "number" || !Number.isFinite(parsed.expires_in) || parsed.expires_in <= 0 || parsed.expires_in > 3600) return { kind: "unavailable", reason: "malformed" };
      const expiresAt = started + parsed.expires_in * 1000;
      if (expiresAt <= Date.now()) return { kind: "unavailable", reason: "provider_failed" };
      for (const [key, token] of tokenCache) if (token.expiresAt <= Date.now() + TOKEN_SAFETY_MS) tokenCache.delete(key);
      if (tokenCache.size >= 32) tokenCache.clear();
      if (expiresAt > Date.now() + TOKEN_SAFETY_MS) tokenCache.set(cacheKey, { accessToken: parsed.access_token, expiresAt });
      return { kind: "token", token: parsed.access_token };
    });
  } catch (error) {
    return { kind: "unavailable", reason: combined.aborted ? "timeout" : error instanceof SyntaxError ? "malformed" : "provider_failed" };
  } finally { clearTimeout(timer); }
}

function requestBody(model: string, request: AiRequest) {
  return {
    systemInstruction: { parts: [{ text: request.systemInstruction }] },
    contents: request.messages.map(message => ({ role: message.role === "assistant" ? "model" : "user", parts: message.parts.map(part => part.kind === "text" ? { text: part.text } : { inlineData: { mimeType: part.mimeType, data: part.dataBase64 } }) })),
    // Vertex v1 accepts JSON Schema here, unlike the native Gemini responseFormat.
    generationConfig: { candidateCount: 1, maxOutputTokens: request.maxOutputTokens, ...geminiThinkingConfig(model), ...(request.output.kind === "json" ? { responseMimeType: "application/json", responseJsonSchema: request.output.schema } : {}) },
  };
}

function failureReason(value: unknown): AiFailureReason {
  if (!isRecord(value)) return "malformed";
  if (isRecord(value.promptFeedback) && value.promptFeedback.blockReason) return "blocked";
  const candidate: unknown = Array.isArray(value.candidates) ? value.candidates[0] : undefined;
  if (isRecord(candidate)) {
    if (candidate.finishReason === "MAX_TOKENS") return "truncated";
    if (typeof candidate.finishReason === "string" && ["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "MODEL_ARMOR", "IMAGE_SAFETY"].includes(candidate.finishReason)) return "blocked";
  }
  return "malformed";
}

export function nativeVertexProvider(config: Config): AiProvider {
  return { kind: "vertex_native", model: config.model, recipientOrigin: new URL(config.url).origin, generate: async (request, options): Promise<AiResult> => {
    const started = Date.now();
    const metadata: AiTransportMetadata = { httpStatus: null, headersMs: null, firstByteMs: null, latencyMs: 0 };
    const recordStatus = (response: Response) => { metadata.httpStatus = response.status; metadata.headersMs = Date.now() - started; options.onMetadata({ ...metadata }); };
    try {
      return await abortable(options.signal, async () => {
        const auth = await accessToken(config, options.signal, recordStatus);
        if (options.signal.aborted) return { kind: "unavailable", reason: "timeout" };
        if (auth.kind === "unavailable") return auth;
        // Reset auth status so generation network failures do not look like HTTP 200.
        metadata.httpStatus = null; metadata.headersMs = null;
        const response = await fetch(config.url, { method: "POST", redirect: "error", headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` }, signal: options.signal, body: JSON.stringify(requestBody(config.model, request)) });
        if (options.signal.aborted) { void response.body?.cancel().catch(() => {}); return { kind: "unavailable", reason: "timeout" }; }
        recordStatus(response);
        if (!response.ok) { void response.body?.cancel().catch(() => {}); return { kind: "unavailable", reason: response.status === 429 ? "rate_limited" : "provider_failed" }; }
        const raw = await boundedResponseText(response, () => { if (metadata.firstByteMs === null) { metadata.firstByteMs = Date.now() - started; options.onMetadata({ ...metadata }); } }, options.signal);
        if (options.signal.aborted) return { kind: "unavailable", reason: "timeout" };
        if (raw === null) return { kind: "unavailable", reason: "response_too_large" };
        const parsed: unknown = JSON.parse(raw);
        const text = extractGeminiContent(parsed)?.trim();
        if (!text) return { kind: "unavailable", reason: failureReason(parsed) };
        if (text.length > request.maxReplyChars) return { kind: "unavailable", reason: "truncated" };
        if (request.output.kind === "json") JSON.parse(text);
        return { kind: "reply", text };
      });
    } catch (error) {
      return { kind: "unavailable", reason: options.signal.aborted ? "timeout" : error instanceof SyntaxError ? "malformed" : "provider_failed" };
    } finally { metadata.latencyMs = Date.now() - started; options.onMetadata({ ...metadata }); }
  } };
}
