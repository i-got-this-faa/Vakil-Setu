import { nextBookingState, type BookingAction, type BookingState } from "@legal-setu/domain";

/** Actions a consultation participant may take, evaluated by the same domain rules the server enforces. */
export function participantBookingActions(input: {
  readonly state: BookingState;
  readonly start: number;
  readonly end: number;
  readonly now: number;
}): readonly BookingAction[] {
  const candidates: readonly BookingAction[] = ["cancel"];
  return candidates.filter((action) =>
    nextBookingState({ ...input, action, actor: "user" }) !== null,
  );
}

/** A pending request is expired at its deadline (earlier of slot start and 24 hours). */
export function pendingRequestExpired(expiresAt: number, now: number): boolean {
  return now >= expiresAt;
}

export function consultationDurationMinutes(start: number, end: number): number {
  return Math.round((end - start) / 60_000);
}
