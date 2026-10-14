import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export async function notify(ctx: MutationCtx, accountId: Id<"accounts">, kind: Doc<"notifications">["kind"], message: string, bookingId?: Id<"bookings">) {
  await ctx.db.insert("notifications", { accountId, kind, message, ...(bookingId ? { bookingId } : {}) });
}
export async function notifyBooking(ctx: MutationCtx, booking: Doc<"bookings">, message: string) {
  await notify(ctx, booking.userId, "booking_changed", message, booking._id);
  await notify(ctx, booking.advocateAccountId, "booking_changed", message, booking._id);
}
