import { isLiveBooking } from "@vakil/domain";
import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { notifyBooking } from "./notifications";

export async function recordBookingEvent(ctx: MutationCtx, bookingId: Id<"bookings">, actor: Doc<"bookingEvents">["actor"], event: Doc<"bookingEvents">["event"]) {
  await ctx.db.insert("bookingEvents", { bookingId, actor, event, at: Date.now() });
}
export async function releaseSlot(ctx: MutationCtx, booking: Doc<"bookings">) {
  const slot = await ctx.db.get(booking.slotId);
  if (slot?.reservation.kind === "reserved" && slot.reservation.bookingId === booking._id) {
    await ctx.db.patch(slot._id, { reservation: { kind: "free" } });
  }
}
export async function terminateBooking(ctx: MutationCtx, booking: Doc<"bookings">, state: "cancelled" | "expired", reason: string, actor: Doc<"bookingEvents">["actor"] = { kind: "system" }) {
  if (!isLiveBooking(booking.state)) return;
  await ctx.db.patch(booking._id, { state, stateChangedAt: Date.now(), reason, adminHandling: undefined });
  await recordBookingEvent(ctx, booking._id, actor, { kind: "state_changed", from: booking.state, to: state, reason });
  await releaseSlot(ctx, booking);
  await notifyBooking(ctx, booking, state === "expired" ? "Consultation request expired." : `Consultation cancelled: ${reason}`);
}
// Approval loss closes requests but preserves accepted reservations for a recorded decision.
export async function affectBooking(ctx: MutationCtx, booking: Doc<"bookings">, reason: string) {
  if (booking.state === "pending") return await terminateBooking(ctx, booking, "cancelled", reason);
  if (booking.state !== "accepted" || booking.adminHandling?.kind === "pending") return;
  await ctx.db.patch(booking._id, { adminHandling: { kind: "pending", reason, flaggedAt: Date.now() } });
  await recordBookingEvent(ctx, booking._id, { kind: "system" }, { kind: "affected", reason });
  await notifyBooking(ctx, booking, "Accepted consultation requires administrator handling because a participant or profile is unavailable.");
}
export async function revokeAdvocateBookings(ctx: MutationCtx, advocateAccountId: Id<"accounts">, reason: string) {
  for (const state of ["pending", "accepted"] as const) {
    const bookings = await ctx.db.query("bookings").withIndex("by_advocate_state", (q) => q.eq("advocateAccountId", advocateAccountId).eq("state", state)).collect();
    for (const booking of bookings) await affectBooking(ctx, booking, reason);
  }
}
export async function invalidateApproval(ctx: MutationCtx, advocate: Doc<"advocates">, reason: string) {
  if (advocate.application.kind === "approved") {
    await ctx.db.patch(advocate._id, { application: { kind: "pending" }, revision: advocate.revision + 1 });
    await revokeAdvocateBookings(ctx, advocate.accountId, reason);
  }
}
