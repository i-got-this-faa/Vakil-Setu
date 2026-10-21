// Provider-neutral contract. Credentials and native wire objects stay in the adapter.
export type AiPart = { kind: "text"; text: string } | { kind: "file"; mimeType: string; dataBase64: string };
export type AiMessage = { role: "user" | "assistant"; parts: AiPart[] };
export type AiRequest = {
  systemInstruction: string;
  messages: AiMessage[];
  maxOutputTokens: number;
  maxReplyChars: number;
  output: { kind: "text" } | { kind: "json"; schema: Record<string, unknown> };
};
export type AiFailureReason = "timeout" | "rate_limited" | "provider_failed" | "response_too_large" | "blocked" | "truncated" | "malformed";
export type AiResult = { kind: "reply"; text: string } | { kind: "unavailable"; reason: AiFailureReason };
export type AiTransportMetadata = { httpStatus: number | null; headersMs: number | null; firstByteMs: number | null; latencyMs: number };
export type AiProvider = {
  kind: "gemini_native";
  model: string;
  recipientOrigin: string;
  generate: (request: AiRequest, options: { signal: AbortSignal; onMetadata: (metadata: AiTransportMetadata) => void }) => Promise<AiResult>;
};

export class AiDeadlineError extends Error {
  constructor() { super("AI deadline exceeded"); this.name = "AiDeadlineError"; }
}

// Abort the network AND settle the action even if an upstream task ignores abort.
export async function withAiDeadline<T>(timeoutMs: number, task: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new AiDeadlineError()); }, timeoutMs);
  });
  try { return await Promise.race([task(controller.signal), deadline]); }
  finally { clearTimeout(timer); }
}

// Fixed reason/status/timing metadata only: never errors, IDs or case data.
export function logAiDiagnostic(value: { operation: "chat" | "triage"; phase: "context" | "attachments" | "consent" | "provider" | "persist"; reason: string; latencyMs: number; transport: AiTransportMetadata | null }) {
  const reasons = ["complete", "timeout", "rate_limited", "provider_failed", "response_too_large", "blocked", "truncated", "malformed", "unsupported_language", "document_unavailable", "state_changed", "invalid_result", "not_configured", "invalid_config"];
  const transport = value.transport;
  console.info("ai_provider_diagnostic", {
    operation: value.operation, phase: value.phase, reason: reasons.includes(value.reason) ? value.reason : "provider_failed", latencyMs: value.latencyMs,
    transport: transport === null ? null : { httpStatus: transport.httpStatus, headersMs: transport.headersMs, firstByteMs: transport.firstByteMs, latencyMs: transport.latencyMs },
  });
}
