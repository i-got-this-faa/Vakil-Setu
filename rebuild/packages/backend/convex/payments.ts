import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currentAccount, requireAccount } from "./lib/access";
import { CONSULTATION_FEE_INR, demoPaymentsEnabled, recordDemoPayment } from "./lib/demoPayment";

// Consultation fee screen. DEMO ONLY (PAYMENTS_MODE=demo): records a test payment, no money moves.

/** The fee for one of the person's own appointments, and whether it is paid. null if not theirs. */
export const forBooking = query({ args: { bookingId: v.id("bookings") }, handler: async (ctx, args) => {
  const account = await currentAccount(ctx).catch(() => null);
  const booking = await ctx.db.get(args.bookingId);
  if (!account || !booking || booking.userId !== account._id) return null;
  const advocate = await ctx.db.get(booking.advocateId);
  return {
    enabled: demoPaymentsEnabled(process.env), demo: true,
    advocateName: advocate?.displayName ?? "", start: booking.start, state: booking.state,
    fee: booking.payment?.amount ?? CONSULTATION_FEE_INR, payment: booking.payment ?? null,
  };
} });

export const payDemo = mutation({
  args: { bookingId: v.id("bookings"), method: v.union(v.literal("upi"), v.literal("card"), v.literal("net")) },
  handler: async (ctx, args) => await recordDemoPayment(ctx, await requireAccount(ctx, "user"), args.bookingId, args.method),
});
