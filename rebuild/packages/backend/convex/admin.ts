import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { approvedAdvocate, fail, requireAccount } from "./lib/access";
import { boundedText, integer, page } from "./lib/input";
import { affectBooking, recordBookingEvent, revokeAdvocateBookings, terminateBooking } from "./lib/lifecycle";
import { notify, notifyBooking } from "./lib/notifications";

export const queue = query({ args: { paginationOpts: paginationOptsValidator, status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("suspended"))) }, handler: async (ctx, args) => {
  await requireAccount(ctx, "admin");
  const result = await ctx.db.query("advocates").withIndex("by_status_city", (q) => q.eq("application.kind", args.status ?? "pending")).paginate(page(args.paginationOpts));
  return { ...result, page: await Promise.all(result.page.map(async (advocate) => ({ advocate, credentials: (await ctx.db.query("credentials").withIndex("by_advocate", (q) => q.eq("advocateId", advocate._id)).collect()).map(({ storageId: _storageId, ...metadata }) => metadata) }))) };
} });
export const accounts = query({ args: { paginationOpts: paginationOptsValidator }, handler: async (ctx, args) => {
  await requireAccount(ctx, "admin");
  const result = await ctx.db.query("accounts").order("desc").paginate(page(args.paginationOpts));
  return { ...result, page: result.page.map(({ _id, displayName, role, locale, disabled }) => ({ _id, displayName, role, locale, disabled })) };
} });
export const affectedBookings = query({ args: { paginationOpts: paginationOptsValidator }, handler: async (ctx, args) => {
  await requireAccount(ctx, "admin");
  const result = await ctx.db.query("bookings").withIndex("by_admin_handling", (q) => q.eq("adminHandling.kind", "pending")).paginate(page(args.paginationOpts));
  // Administration receives operational metadata, never intake or shared summary content.
  return { ...result, page: result.page.map(({ _id, userId, advocateId, start, end, consultationMode, state, adminHandling }) => ({ _id, userId, advocateId, start, end, consultationMode, state, adminHandling })) };
} });
export const handleAffectedBooking = mutation({ args: { bookingId: v.id("bookings"), action: v.union(v.literal("cancel"), v.literal("retain")), reason: v.string() }, handler: async (ctx, args) => {
  const admin = await requireAccount(ctx, "admin");
  const booking = await ctx.db.get(args.bookingId);
  if (!booking) fail("NOT_FOUND", "Booking not found.");
  if (booking.state !== "accepted" || booking.adminHandling?.kind !== "pending") fail("CONFLICT", "This booking no longer requires administrator handling.");
  const reason = boundedText(args.reason, "Handling reason", 1000);
  if (args.action === "retain") {
    const user = await ctx.db.get(booking.userId);
    if (!user || user.disabled || !(await approvedAdvocate(ctx, booking.advocateId))) fail("NOT_APPROVED", "Reactivate the user and explicitly approve the advocate before retaining this consultation.");
    await notifyBooking(ctx, booking, "Administrator retained the accepted consultation after review.");
  } else {
    await terminateBooking(ctx, booking, "cancelled", reason, { kind: "admin", accountId: admin._id });
  }
  await ctx.db.patch(booking._id, { adminHandling: { kind: "resolved", action: args.action, reason, adminId: admin._id, handledAt: Date.now() } });
  await recordBookingEvent(ctx, booking._id, { kind: "admin", accountId: admin._id }, { kind: "admin_handled", action: args.action, reason });
  return null;
} });
export const review = mutation({
  args: { advocateId: v.id("advocates"), revision: v.number(), decision: v.union(v.literal("approve"), v.literal("reject"), v.literal("suspend")), reason: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAccount(ctx, "admin");
    const advocate = await ctx.db.get(args.advocateId);
    if (!advocate) fail("NOT_FOUND", "Application not found.");
    if (advocate.revision !== integer(args.revision, "Application revision", 1, Number.MAX_SAFE_INTEGER)) fail("CONFLICT", "Application changed since review began.");
    const reason = boundedText(args.reason, "Review reason", 1000);
    const account = await ctx.db.get(advocate.accountId);
    if (args.decision === "approve") {
      if (!account || account.disabled) fail("ACCOUNT_DISABLED", "Cannot approve a disabled account.");
      const credentials = await ctx.db.query("credentials").withIndex("by_advocate", (q) => q.eq("advocateId", advocate._id)).collect();
      if (!credentials.some((credential) => credential.review.kind === "valid")) fail("INVALID_INPUT", "Review at least one valid private credential before approval.");
    }
    const kind = args.decision === "approve" ? "approved" : args.decision === "reject" ? "rejected" : "suspended";
    await ctx.db.patch(advocate._id, { application: { kind, reviewerId: admin._id, reviewedAt: Date.now(), reason } });
    await ctx.db.insert("advocateReviews", { advocateId: advocate._id, revision: advocate.revision, decision: args.decision, reviewerId: admin._id, reason, at: Date.now() });
    if (kind !== "approved") await revokeAdvocateBookings(ctx, advocate.accountId, "Advocate approval withdrawn.");
    await notify(ctx, advocate.accountId, "application_reviewed", `Application ${kind}.`);
    return null;
  },
});
export const setDisabled = mutation({
  args: { accountId: v.id("accounts"), disabled: v.boolean(), reason: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAccount(ctx, "admin");
    const account = await ctx.db.get(args.accountId);
    if (!account) fail("NOT_FOUND", "Account not found.");
    if (account._id === admin._id && args.disabled) fail("FORBIDDEN", "Administrator cannot disable their own account.");
    const reason = boundedText(args.reason, "Account status reason", 1000);
    await ctx.db.patch(account._id, { disabled: args.disabled });
    await ctx.db.insert("accountAudits", { accountId: account._id, adminId: admin._id, disabled: args.disabled, reason, at: Date.now() });
    if (args.disabled) {
      await revokeAdvocateBookings(ctx, account._id, "Advocate account disabled.");
      for (const state of ["pending", "accepted"] as const) {
        const bookings = await ctx.db.query("bookings").withIndex("by_user_state", (q) => q.eq("userId", account._id).eq("state", state)).collect();
        for (const booking of bookings) await affectBooking(ctx, booking, "User account disabled.");
      }
      const advocate = await ctx.db.query("advocates").withIndex("by_account", (q) => q.eq("accountId", account._id)).unique();
      if (advocate) await ctx.db.patch(advocate._id, { application: { kind: "suspended", reviewerId: admin._id, reviewedAt: Date.now(), reason } });
    }
    await notify(ctx, account._id, "account_changed", args.disabled ? "Account disabled." : "Account reactivated; advocate approval still requires review.");
    return null;
  },
});
