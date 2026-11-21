import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { fail } from "./access";
import { notify } from "./notifications";

/**
 * Consultation fees, DEMO ONLY. Real payments are not built: with PAYMENTS_MODE=demo the fee is recorded as a
 * test payment on the booking (no money moves, no card or UPI details are collected, no payment company is called).
 * Without that setting there is no payment step at all.
 */
export const CONSULTATION_FEE_INR = 500;

export function demoPaymentsEnabled(env: Record<string, string | undefined>) {
  return env.PAYMENTS_MODE?.trim() === "demo";
}

export type PaymentMethod = "upi" | "card" | "net";

/** Records the fee for the person's own live booking as a test payment. Paying twice returns the first receipt. */
export async function recordDemoPayment(ctx: MutationCtx, account: Doc<"accounts">, bookingId: Id<"bookings">, method: PaymentMethod) {
  if (!demoPaymentsEnabled(process.env)) fail("FORBIDDEN", "Payments are not available.");
  const booking = await ctx.db.get(bookingId);
  if (!booking || booking.userId !== account._id) fail("NOT_FOUND", "Booking not found.");
  if (booking.payment) return booking.payment;
  if (booking.state !== "pending" && booking.state !== "accepted") fail("CONFLICT", "This appointment can no longer be paid for.");
  const now = Date.now();
  const payment = {
    status: "paid" as const, test: true as const, amount: CONSULTATION_FEE_INR, currency: "INR" as const, method,
    // TEST- makes it obvious on any receipt that this is not a real transaction.
    reference: `TEST-${booking._id.slice(-6).toUpperCase()}${String(now % 1000).padStart(3, "0")}`, paidAt: now,
  };
  await ctx.db.patch(booking._id, { payment });
  await notify(ctx, account._id, "booking_changed", `Test payment of ₹${CONSULTATION_FEE_INR} recorded (no money charged).`, booking._id);
  return payment;
}
