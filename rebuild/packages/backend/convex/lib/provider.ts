import { isLegalDomain, isPilotLocale, isUrgency, LEGAL_DOMAINS, URGENCIES, LIMITS } from "@vakil/domain";
import type { PilotLocale } from "@vakil/domain";

export type UnavailableReason = "not_configured" | "invalid_config" | "provider_failed" | "invalid_result";
type ProviderConfig = { kind: "configured"; url: string; model: string; apiKey: string } | { kind: "unavailable"; reason: UnavailableReason };

// Only server actions call this function. No environment value is sent to clients.
export function geminiConfig(env: Record<string, string | undefined>): ProviderConfig {
  const key = env.GEMINI_API_KEY?.trim();
  if (!key) return { kind: "unavailable", reason: "not_configured" };
  const model = env.GEMINI_MODEL?.trim() ?? "gemini-3.8-flash";
  if (/\s/u.test(key) || model.length > 100 || !/^gemini-[A-Za-z0-9._-]+$/u.test(model)) return { kind: "unavailable", reason: "invalid_config" };
  return { kind: "configured", url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, model, apiKey: key };
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
export async function boundedResponseText(response: Response) {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = "";
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 64 * 1024) { await reader.cancel(); return null; }
      result += decoder.decode(chunk.value, { stream: true });
    }
    return result + decoder.decode();
  } finally { reader.releaseLock(); }
}
