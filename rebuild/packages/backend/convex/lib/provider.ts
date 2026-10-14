import { isLegalDomain, isPilotLocale, isUrgency, LIMITS } from "@vakil/domain";
import type { PilotLocale } from "@vakil/domain";

export type UnavailableReason = "not_configured" | "unsupported_provider" | "invalid_config" | "provider_failed" | "invalid_result";
type ProviderConfig = { kind: "configured"; url: string; model: string; header: string; authorization: string } | { kind: "unavailable"; reason: UnavailableReason };

// Only server actions call this function. No environment value is sent to clients.
export function gatewayConfig(env: Record<string, string | undefined>): ProviderConfig {
  const key = env.LLM_API_KEY?.trim();
  if (!key) return { kind: "unavailable", reason: "not_configured" };
  if ((env.LLM_PROVIDER ?? "gateway") !== "gateway") return { kind: "unavailable", reason: "unsupported_provider" };
  try {
    const path = env.LLM_API_URL ?? "/gateway/llm/chat";
    if (path.startsWith("//")) return { kind: "unavailable", reason: "invalid_config" };
    const url = path.startsWith("/") && env.GATEWAY_BASE_URL ? new URL(path, env.GATEWAY_BASE_URL) : new URL(path);
    const model = env.LLM_MODEL ?? "qwen3:latest";
    const header = env.LLM_API_KEY_HEADER ?? "Authorization";
    const prefix = env.LLM_API_KEY_PREFIX ?? "Bearer";
    if (url.protocol !== "https:" || url.username || url.password || model.length < 1 || model.length > 200 || !/^[A-Za-z0-9-]+$/u.test(header) || ["content-type", "host", "cookie", "content-length"].includes(header.toLowerCase()) || /[\r\n]/u.test(key + prefix)) return { kind: "unavailable", reason: "invalid_config" };
    return { kind: "configured", url: url.toString(), model, header, authorization: prefix ? `${prefix} ${key}` : key };
  } catch { return { kind: "unavailable", reason: "invalid_config" }; }
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function parseProviderResult(value: unknown, requestedLocale: PilotLocale) {
  if (!isRecord(value) || value.sourceMode !== "provider" || value.provider !== "gateway" || !isPilotLocale(value.locale) || value.locale !== requestedLocale || !isLegalDomain(value.domain) || !isUrgency(value.urgency) || typeof value.summary !== "string" || !value.summary.trim() || value.summary.length > LIMITS.summaryText || !Array.isArray(value.actions) || value.actions.length > LIMITS.actions) return null;
  const actions: string[] = [];
  for (const action of value.actions) {
    if (typeof action !== "string" || !action.trim() || action.length > LIMITS.actionText) return null;
    actions.push(action.trim());
  }
  return { locale: value.locale, domain: value.domain, urgency: value.urgency, text: value.summary.trim(), actions };
}
export function extractChatContent(value: unknown): string | null {
  if (!isRecord(value)) return null;
  if (Array.isArray(value.choices)) {
    const first: unknown = value.choices[0];
    if (isRecord(first) && isRecord(first.message) && typeof first.message.content === "string") return first.message.content;
  }
  if (isRecord(value.message) && typeof value.message.content === "string") return value.message.content;
  if (typeof value.response === "string") return value.response;
  return typeof value.output === "string" ? value.output : null;
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
