export const PILOT_LOCALES = ["en", "hi", "pa"] as const;
export type PilotLocale = (typeof PILOT_LOCALES)[number];
export const LEGAL_DOMAINS = ["criminal", "civil", "family", "property", "employment", "consumer", "other", "unknown"] as const;
export type LegalDomain = (typeof LEGAL_DOMAINS)[number];
export const URGENCIES = ["low", "medium", "high", "emergency", "unknown"] as const;
export type Urgency = (typeof URGENCIES)[number];
export const CONSULTATION_MODES = ["phone", "video", "in_person"] as const;
export type ConsultationMode = (typeof CONSULTATION_MODES)[number];
export const ACCOUNT_ROLES = ["user", "advocate", "admin"] as const;
export const BOOKING_STATES = ["pending", "accepted", "declined", "cancelled", "completed", "expired"] as const;
export type BookingState = (typeof BOOKING_STATES)[number];
export type BookingAction = "accept" | "decline" | "cancel" | "complete";
export const ERROR_CODES = ["UNAUTHENTICATED", "ONBOARDING_REQUIRED", "ACCOUNT_DISABLED", "FORBIDDEN", "NOT_FOUND", "INVALID_INPUT", "CONFLICT", "NOT_APPROVED", "SLOT_UNAVAILABLE", "CONSENT_REQUIRED", "RATE_LIMITED", "LIMIT_EXCEEDED"] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
export const CHAT_LIMITS = {
  turns: 100, messageChars: 4000, replyChars: 8000, historyTurns: 10,
  attemptsPerHour: 20, timeoutMs: 60_000, leaseMs: 75_000,
  documentBytes: 3 * 1024 * 1024, documentsPerCase: 5,
  attachments: 3, attachmentBytes: 6 * 1024 * 1024,
} as const;
export const LIMITS = {
  intakeText: 10_000, contextMessages: 10, contextMessage: 2_000, contextTotal: 10_000,
  summaryText: 4_000, actions: 8, actionText: 300, credentialBytes: 5 * 1024 * 1024,
  credentialsPerAdvocate: 5, pageSize: 50, slotsPerPublication: 20, futureSlots: 20,
  aiAttemptsPerHour: 5, hourMs: 60 * 60 * 1000, pendingMs: 24 * 60 * 60 * 1000,
  slotHorizonMs: 90 * 24 * 60 * 60 * 1000, discoveryCandidates: 500,
} as const;

export function isPilotLocale(value: unknown): value is PilotLocale {
  return value === "en" || value === "hi" || value === "pa";
}
export function isLegalDomain(value: unknown): value is LegalDomain {
  return typeof value === "string" && LEGAL_DOMAINS.some((domain) => domain === value);
}
export function isUrgency(value: unknown): value is Urgency {
  return typeof value === "string" && URGENCIES.some((urgency) => urgency === value);
}
export function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end;
}
export function isLiveBooking(state: BookingState): boolean {
  return state === "pending" || state === "accepted";
}
export function pendingDeadline(start: number, requestedAt: number): number {
  return Math.min(start, requestedAt + LIMITS.pendingMs);
}
export function nextBookingState({ state, action, actor, now, start, end }: { state: BookingState; action: BookingAction; actor: "user" | "advocate"; now: number; start: number; end: number }): BookingState | null {
  switch (action) {
    case "accept": return state === "pending" && actor === "advocate" ? "accepted" : null;
    case "decline": return state === "pending" && actor === "advocate" ? "declined" : null;
    case "cancel": return isLiveBooking(state) && now < start ? "cancelled" : null;
    case "complete": return state === "accepted" && actor === "advocate" && now >= end ? "completed" : null;
    default: { const exhaustive: never = action; return exhaustive; }
  }
}
