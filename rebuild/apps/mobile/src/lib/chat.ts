import type { DraftBundle } from "@legal-setu/i18n";

export type ChatErrorCopy = DraftBundle["chatCopy"]["errors"];

/** Reasons where the server did not start or finish a reply and a fresh attempt may be offered. */
export const RESTORABLE_CHAT_REASONS: readonly string[] = [
  "timeout",
  "provider_failed",
  "rate_limited",
  "truncated",
  "malformed",
  "response_too_large",
  "state_changed",
];

/**
 * Only an in-progress result keeps the held request for an identical replay.
 * Every other acknowledged unavailable result needs a new consented request ID.
 */
export function keepsHeldChatRequest(reason: string): boolean {
  return reason === "in_progress";
}

export function chatReasonMessage(reason: string, errors: ChatErrorCopy): string {
  switch (reason) {
    case "timeout":
    case "in_progress":
    case "rate_limited":
    case "limit_exceeded":
    case "provider_failed":
    case "response_too_large":
    case "truncated":
    case "blocked":
    case "malformed":
    case "state_changed":
      return errors[reason];
    default:
      return `${errors.generic} (${reason})`;
  }
}
