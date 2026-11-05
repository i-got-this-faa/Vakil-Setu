import { nextBookingState, overlaps, pendingDeadline } from "@vakil/domain";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { consent } from "./lib/validators";
import { approvedAdvocate, fail, ownCase, requireAccount } from "./lib/access";
import { boundedText, integer, page } from "./lib/input";
import { recordBookingEvent, releaseSlot, terminateBooking } from "./lib/lifecycle";
import { notify, notifyBooking } from "./lib/notifications";

export const mine = query({ args: { paginationOpts: paginationOptsValidator }, handler: async (ctx, args) => {
  const account = await requireAccount(ctx);
  if (account.role === "admin") fail("FORBIDDEN", "Private bookings are visible only to their participants.");
  const options = page(args.paginationOpts);
  return account.role === "user"
    ? await ctx.db.query("bookings").withIndex("by_user", (q) => q.eq("userId", account._id)).order("desc").paginate(options)
    : await ctx.db.query("bookings").withIndex("by_advocate_account", (q) => q.eq("advocateAccountId", account._id)).order("desc").paginate(options);
} });
export const history = query({ args: { bookingId: v.id("bookings"), paginationOpts: paginationOptsValidator }, handler: async (ctx, args) => {
  const account = await requireAccount(ctx);
  const booking = await ctx.db.get(args.bookingId);
  if (!booking || (booking.userId !== account._id && booking.advocateAccountId !== account._id && !(account.role === "admin" && booking.adminHandling))) fail("NOT_FOUND", "Booking not found.");
  return await ctx.db.query("bookingEvents").withIndex("by_booking", (q) => q.eq("bookingId", booking._id)).order("asc").paginate(page(args.paginationOpts));
} });
export const request = mutation({
  args: { slotId: v.id("slots"), caseId: v.id("cases"), summaryVersion: v.number(), idempotencyKey: v.string(), consent },
  handler: async (ctx, args) => {
    const account = await requireAccount(ctx, "user");
    const key = boundedText(args.idempotencyKey, "Idempotency key", 100);
    const version = integer(args.summaryVersion, "Summary version", 1, 100);
    if (args.consent.summaryVersion !== version) fail("CONSENT_REQUIRED", "Consent must identify the exact shared summary version.");
    const replay = await ctx.db.query("bookings").withIndex("by_idempotency", (q) => q.eq("userId", account._id).eq("idempotencyKey", key)).unique();
    if (replay) {
      if (replay.slotId !== args.slotId || replay.caseId !== args.caseId || replay.summaryVersion !== version || replay.advocateId !== args.consent.recipientAdvocateId) fail("CONFLICT", "Idempotency key was used for a different request.");
      return replay._id;
    }
    const { legalCase } = await ownCase(ctx, args.caseId);
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
  },
});
export const transition = mutation({
  args: { bookingId: v.id("bookings"), action: v.union(v.literal("accept"), v.literal("decline"), v.literal("cancel"), v.literal("complete")), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const account = await requireAccount(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || (booking.userId !== account._id && booking.advocateAccountId !== account._id)) fail("NOT_FOUND", "Booking not found.");
    const actor = booking.advocateAccountId === account._id ? "advocate" : "user";
    const now = Date.now();
    if (booking.state === "pending" && booking.expiresAt <= now) {
      await terminateBooking(ctx, booking, "expired", "Request deadline passed.");
      return null;
    }
    if (args.action === "accept" && !(await approvedAdvocate(ctx, booking.advocateId))) fail("NOT_APPROVED", "Approval is required to accept this request.");
    if (args.action === "complete" && booking.adminHandling?.kind === "pending") fail("CONFLICT", "Administrator handling is required before completion.");
    const state = nextBookingState({ state: booking.state, action: args.action, actor, now, start: booking.start, end: booking.end });
    if (!state) fail("CONFLICT", "This booking transition is not allowed.");
    const reason = args.reason === undefined ? undefined : boundedText(args.reason, "Transition reason", 1000);
    if (args.action === "cancel" && actor === "advocate" && reason === undefined) fail("INVALID_INPUT", "Advocate cancellation requires a reason.");
    await ctx.db.patch(booking._id, { state, stateChangedAt: now, reason, ...(state === "accepted" ? {} : { adminHandling: undefined }) });
    await recordBookingEvent(ctx, booking._id, { kind: actor, accountId: account._id }, { kind: "state_changed", from: booking.state, to: state, ...(reason === undefined ? {} : { reason }) });
    if (state !== "accepted") await releaseSlot(ctx, booking);
    await notifyBooking(ctx, booking, `Consultation ${state}.`);
    return null;
  },
});
export const expire = internalMutation({ args: { bookingId: v.id("bookings") }, handler: async (ctx, args) => {
  const booking = await ctx.db.get(args.bookingId);
  if (booking?.state === "pending" && booking.expiresAt <= Date.now()) await terminateBooking(ctx, booking, "expired", "Request deadline passed.");
  return null;
} });
