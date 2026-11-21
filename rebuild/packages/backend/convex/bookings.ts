import { nextBookingState } from "@legal-setu/domain";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { consent } from "./lib/validators";
import { approvedAdvocate, fail, requireAccount } from "./lib/access";
import { boundedText, page } from "./lib/input";
import { recordBookingEvent, releaseSlot, terminateBooking } from "./lib/lifecycle";
import { notifyBooking } from "./lib/notifications";
import { requestBooking } from "./lib/bookingRequest";

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
  handler: async (ctx, args) => await requestBooking(ctx, await requireAccount(ctx, "user"), args),
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
