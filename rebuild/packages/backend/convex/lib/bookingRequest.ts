import { overlaps, pendingDeadline } from "@legal-setu/domain";
import type { Infer } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { approvedAdvocate, fail } from "./access";
import { boundedText, integer } from "./input";
import { recordBookingEvent, terminateBooking } from "./lifecycle";
import { notify } from "./notifications";
import type { consent } from "./validators";

export type BookingRequest = { slotId: Id<"slots">; caseId: Id<"cases">; summaryVersion: number; idempotencyKey: string; consent: Infer<typeof consent> };

/**
 * Every rule for asking a lawyer for a consultation, shared by the booking screen and by voice booking:
 * consent to the exact summary and lawyer, own case, slot still free and offered, lawyer still approved, no overlap.
 * `account` must already be checked to be the signed-in user.
 */
export async function requestBooking(ctx: MutationCtx, account: Doc<"accounts">, args: BookingRequest): Promise<Id<"bookings">> {
  if (account.role !== "user" || account.disabled) fail("FORBIDDEN", "This account cannot perform that action.");
  const key = boundedText(args.idempotencyKey, "Idempotency key", 100);
  const version = integer(args.summaryVersion, "Summary version", 1, 100);
  if (args.consent.summaryVersion !== version) fail("CONSENT_REQUIRED", "Consent must identify the exact shared summary version.");
  const replay = await ctx.db.query("bookings").withIndex("by_idempotency", (q) => q.eq("userId", account._id).eq("idempotencyKey", key)).unique();
  if (replay) {
    if (replay.slotId !== args.slotId || replay.caseId !== args.caseId || replay.summaryVersion !== version || replay.advocateId !== args.consent.recipientAdvocateId) fail("CONFLICT", "Idempotency key was used for a different request.");
    return replay._id;
  }
  const legalCase = await ctx.db.get(args.caseId);
  if (!legalCase || legalCase.ownerId !== account._id) fail("NOT_FOUND", "Case not found.");
  if (legalCase.summaryVersion !== version) fail("CONFLICT", "Review and consent to the latest summary before booking.");
  const summary = await ctx.db.query("caseSummaries").withIndex("by_case_version", (q) => q.eq("caseId", legalCase._id).eq("version", version)).unique();
  if (!summary) fail("NOT_FOUND", "Summary not found.");
  const slot = await ctx.db.get(args.slotId);
  const now = Date.now();
  if (!slot || slot.start <= now) fail("SLOT_UNAVAILABLE", "This slot is no longer available.");
  if (slot.advocateId !== args.consent.recipientAdvocateId) fail("CONSENT_REQUIRED", "Consent must identify the recipient advocate.");
  const advocate = await approvedAdvocate(ctx, slot.advocateId);
  if (!advocate) fail("NOT_APPROVED", "This advocate is unavailable for new requests.");
  if (!advocate.consultationModes.includes(slot.consultationMode)) fail("SLOT_UNAVAILABLE", "This slot mode is no longer offered by the reviewed profile.");
  if (slot.reservation.kind === "reserved") {
    const prior = await ctx.db.get(slot.reservation.bookingId);
    if (prior?.state === "pending" && prior.expiresAt <= now) await terminateBooking(ctx, prior, "expired", "Request deadline passed.");
    else fail("SLOT_UNAVAILABLE", "This slot has already been reserved.");
  }
  for (const state of ["pending", "accepted"] as const) {
    const live = await ctx.db.query("bookings").withIndex("by_user_state", (q) => q.eq("userId", account._id).eq("state", state)).collect();
    for (const booking of live) {
      if (booking.state === "pending" && booking.expiresAt <= now) await terminateBooking(ctx, booking, "expired", "Request deadline passed.");
      else if (overlaps(booking, slot)) fail("CONFLICT", "This request overlaps another live consultation.");
    }
  }
  const expiresAt = pendingDeadline(slot.start, now);
  const bookingId = await ctx.db.insert("bookings", { userId: account._id, advocateId: advocate._id, advocateAccountId: advocate.accountId, slotId: slot._id, caseId: legalCase._id, summaryVersion: version, summarySnapshot: summary.summary, summarySource: summary.source, consent: { ...args.consent, grantedAt: now, grantedBy: account._id }, idempotencyKey: key, start: slot.start, end: slot.end, consultationMode: slot.consultationMode, requestedAt: now, expiresAt, state: "pending", stateChangedAt: now });
  await recordBookingEvent(ctx, bookingId, { kind: "user", accountId: account._id }, { kind: "requested", state: "pending" });
  await ctx.db.patch(slot._id, { reservation: { kind: "reserved", bookingId } });
  await ctx.db.patch(legalCase._id, { state: "shared" });
  await ctx.scheduler.runAt(expiresAt, internal.bookings.expire, { bookingId });
  await notify(ctx, advocate.accountId, "booking_requested", "New consultation request. Review the shared summary before accepting.", bookingId);
  await notify(ctx, account._id, "booking_requested", "Consultation requested; advocate acceptance is pending.", bookingId);
  return bookingId;
}
