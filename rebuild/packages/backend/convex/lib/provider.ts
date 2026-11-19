import { vertexConfig } from "./vertexConfig";
import { isLegalDomain, isPilotLocale, isUrgency, LEGAL_DOMAINS, URGENCIES, LIMITS, LOCALES } from "@legal-setu/domain";
import type { PilotLocale } from "@legal-setu/domain";

export type UnavailableReason = "not_configured" | "invalid_config" | "provider_failed" | "invalid_result" | "unsupported_language";
type ProviderConfig = { kind: "configured"; url: string; model: string; apiKey: string } | { kind: "unavailable"; reason: UnavailableReason };

// Server functions only. Never return this private config to clients.
export function geminiConfig(env: Record<string, string | undefined>): ProviderConfig {
  const key = env.GEMINI_API_KEY?.trim();
  if (!key) return { kind: "unavailable", reason: "not_configured" };
  const model = env.GEMINI_MODEL?.trim() ?? "gemini-3.6-flash";
  if (/\s/u.test(key) || model.length > 100 || !/^gemini-[A-Za-z0-9._-]+$/u.test(model)) return { kind: "unavailable", reason: "invalid_config" };
  return { kind: "configured", url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, model, apiKey: key };
}

/** Every Gemini key: GEMINI_API_KEY first, then the comma-separated GEMINI_API_KEYS (extra accounts), without duplicates. */
export function geminiKeys(env: Record<string, string | undefined>): string[] {
  const keys = [env.GEMINI_API_KEY, ...(env.GEMINI_API_KEYS ?? "").split(",")].map(key => key?.trim() ?? "").filter(Boolean);
  return [...new Set(keys)];
}

/**
 * Every Gemini route to try, in order: each model (GEMINI_MODEL, then GEMINI_FALLBACK_MODELS) on each key.
 * Keys start at a random account so traffic spreads over all of them, unless GEMINI_KEY_ORDER=in_order: then
 * GEMINI_API_KEY is always tried first and the GEMINI_API_KEYS accounts are only backups, in the order listed
 * (e.g. a demo account first, an older account only once the demo account's quota runs out).
 * Invalid extra entries fail closed like the primary.
 */
export function geminiConfigs(env: Record<string, string | undefined>, random: () => number = Math.random): Extract<ProviderConfig, { kind: "configured" }>[] | Extract<ProviderConfig, { kind: "unavailable" }> {
  const primary = geminiConfig(env);
  if (primary.kind === "unavailable") return primary;
  const keys = geminiKeys(env);
  const models = [...new Set([primary.model, ...(env.GEMINI_FALLBACK_MODELS ?? "").split(",").map(model => model.trim()).filter(Boolean)])];
  const order = env.GEMINI_KEY_ORDER?.trim() || "rotate";
  if (keys.length > 20 || models.length > 5 || keys.some(key => /\s/u.test(key)) || models.some(model => model.length > 100 || !/^gemini-[A-Za-z0-9._-]+$/u.test(model)) || !["rotate", "in_order"].includes(order)) return { kind: "unavailable", reason: "invalid_config" };
  const start = order === "in_order" ? 0 : Math.floor(random() * keys.length) % keys.length;
  const rotated = [...keys.slice(start), ...keys.slice(0, start)];
  return models.flatMap(model => rotated.map(apiKey => ({ kind: "configured" as const, url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, model, apiKey })));
}

// Operator permission, not a translation or legal-quality certification.
export function aiAllowedLanguages(env: Record<string, string | undefined>): string[] {
  if (env.AI_CHAT_LOCALES === undefined) return ["en", "hi", "pa"];
  const values = env.AI_CHAT_LOCALES.split(",").map(value => value.trim());
  if (values.length === 1 && values[0] === "") return [];
  // Unknown codes fail closed rather than silently broadening provider access.
  if (values.some(value => !LOCALES.some(locale => locale === value))) return [];
  return [...new Set(values)];
}

export function aiCapabilities(env: Record<string, string | undefined>) {
  const config = geminiConfig(env);
  const vertex = vertexConfig(env);
  return { configured: config.kind === "configured", ...(config.kind === "configured" && vertex.kind === "configured" ? { vertexFallback: true } : {}), locales: aiAllowedLanguages(env), provider: "gemini_native", evidence: env.AI_CHAT_LOCALES === undefined ? "observed_runtime_only_not_quality_validated" : "operator_allowlist_not_quality_validated", ...(config.kind === "unavailable" ? { reason: config.reason } : {}) };
}

export function geminiResponseSchema(locale: PilotLocale) {
  return { type: "object", properties: {
    locale: { type: "string", enum: [locale] },
    domain: { type: "string", enum: [...LEGAL_DOMAINS] },
    urgency: { type: "string", enum: [...URGENCIES] },
    summary: { type: "string" },
    actions: { type: "array", maxItems: LIMITS.actions, items: { type: "string" } },
  }, required: ["locale", "domain", "urgency", "summary", "actions"] };
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function parseProviderResult(value: unknown, requestedLocale: PilotLocale) {
  if (!isRecord(value) || !isPilotLocale(value.locale) || value.locale !== requestedLocale || !isLegalDomain(value.domain) || !isUrgency(value.urgency) || typeof value.summary !== "string" || !value.summary.trim() || value.summary.length > LIMITS.summaryText || !Array.isArray(value.actions) || value.actions.length > LIMITS.actions) return null;
  const actions: string[] = [];
  for (const action of value.actions) {
    if (typeof action !== "string" || !action.trim() || action.length > LIMITS.actionText) return null;
    actions.push(action.trim());
  }
  return { locale: value.locale, domain: value.domain, urgency: value.urgency, text: value.summary.trim(), actions };
}
export function extractGeminiContent(value: unknown): string | null {
  if (!isRecord(value)) return null;
  if (isRecord(value.promptFeedback) && value.promptFeedback.blockReason) return null;
  if (!Array.isArray(value.candidates) || value.candidates.length !== 1) return null;
  const candidate: unknown = value.candidates[0];
  if (!isRecord(candidate) || candidate.finishReason !== "STOP" || !isRecord(candidate.content) || !Array.isArray(candidate.content.parts)) return null;
  let text = "";
  for (const part of candidate.content.parts) {
    if (!isRecord(part)) return null;
    if (part.thought === true) continue;
    if (typeof part.text !== "string") return null;
    text += part.text;
  }
  return text || null;
}
export async function boundedResponseText(response: Response, onFirstByte?: () => void, signal?: AbortSignal) {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener("abort", cancel, { once: true });
  const decoder = new TextDecoder();
  let result = "";
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      onFirstByte?.();
      size += chunk.value.byteLength;
      if (size > 64 * 1024) { await reader.cancel(); return null; }
      result += decoder.decode(chunk.value, { stream: true });
    }
    return result + decoder.decode();
  } finally { signal?.removeEventListener("abort", cancel); reader.releaseLock(); }
}
