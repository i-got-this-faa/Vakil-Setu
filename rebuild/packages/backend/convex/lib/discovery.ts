import { LIMITS } from "@vakil/domain";
import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { publicRating } from "./reviews";

export async function publicSlots(ctx: QueryCtx, advocate: Doc<"advocates">) {
  const slots = await ctx.db.query("slots").withIndex("by_advocate_start", (q) => q.eq("advocateId", advocate._id).gt("start", Date.now())).filter((q) => q.and(q.eq(q.field("reservation.kind"), "free"), q.or(...advocate.consultationModes.map((mode) => q.eq(q.field("consultationMode"), mode))))).take(LIMITS.futureSlots);
  return slots.map(({ _id, start, end, durationMinutes, consultationMode }) => ({ _id, start, end, durationMinutes, consultationMode }));
}
export async function publicProfile(ctx: QueryCtx, advocate: Doc<"advocates">) {
  return { _id: advocate._id, displayName: advocate.displayName, city: advocate.city, bio: advocate.bio, yearsExperience: advocate.yearsExperience, domains: advocate.domains, locales: advocate.locales, consultationModes: advocate.consultationModes, slots: await publicSlots(ctx, advocate), rating: await publicRating(ctx, advocate) };
}
