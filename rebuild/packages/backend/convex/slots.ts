import { LIMITS, overlaps } from "@vakil/domain";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { approvedAdvocate, fail, ownAdvocate } from "./lib/access";
import { integer } from "./lib/input";
import { publicSlots } from "./lib/discovery";
import { consultationMode } from "./lib/validators";

export const listPublic = query({ args: { advocateId: v.id("advocates") }, handler: async (ctx, args) => {
  const advocate = await approvedAdvocate(ctx, args.advocateId);
  return advocate ? await publicSlots(ctx, advocate) : [];
} });
export const mine = query({ args: {}, handler: async (ctx) => {
  const { advocate } = await ownAdvocate(ctx);
  return await ctx.db.query("slots").withIndex("by_advocate_start", (q) => q.eq("advocateId", advocate._id).gt("start", Date.now() - LIMITS.pendingMs)).order("asc").take(250);
} });
export const publish = mutation({ args: { slots: v.array(v.object({ start: v.number(), durationMinutes: v.number(), consultationMode })) }, handler: async (ctx, args) => {
  const { advocate } = await ownAdvocate(ctx);
  if (advocate.application.kind !== "approved") fail("NOT_APPROVED", "Approval is required before publishing slots.");
  if (args.slots.length < 1 || args.slots.length > LIMITS.slotsPerPublication) fail("INVALID_INPUT", "Publish 1–20 slots at a time.");
  const now = Date.now();
  const proposed = args.slots.map((slot) => {
    const start = integer(slot.start, "Slot start", now + 1, now + LIMITS.slotHorizonMs);
    const durationMinutes = integer(slot.durationMinutes, "Slot duration", 15, 120);
    if (!advocate.consultationModes.includes(slot.consultationMode)) fail("INVALID_INPUT", "Slot mode must be offered by the reviewed profile.");
    return { start, durationMinutes, end: start + durationMinutes * 60_000, consultationMode: slot.consultationMode };
  }).sort((a, b) => a.start - b.start);
  const first = proposed[0];
  if (!first) fail("INVALID_INPUT", "Publish at least one slot.");
  const existing = await ctx.db.query("slots").withIndex("by_advocate_end", (q) => q.eq("advocateId", advocate._id).gt("end", now)).collect();
  if (existing.length + proposed.length > 200) fail("LIMIT_EXCEEDED", "At most 200 future slots are allowed.");
  for (let index = 0; index < proposed.length; index++) {
    const current = proposed[index];
    if (!current) continue;
    const previous = proposed[index - 1];
    if ((previous && overlaps(previous, current)) || existing.some((slot) => overlaps(slot, current))) fail("CONFLICT", "Slot publication overlaps an existing or proposed slot.");
  }
  const ids = [];
  for (const slot of proposed) ids.push(await ctx.db.insert("slots", { ...slot, advocateId: advocate._id, reservation: { kind: "free" } }));
  return ids;
} });
export const remove = mutation({ args: { slotId: v.id("slots") }, handler: async (ctx, args) => {
  const { advocate } = await ownAdvocate(ctx);
  const slot = await ctx.db.get(args.slotId);
  if (!slot || slot.advocateId !== advocate._id) fail("NOT_FOUND", "Slot not found.");
  if (slot.reservation.kind !== "free") fail("CONFLICT", "A reserved slot cannot be removed.");
  await ctx.db.delete(slot._id);
  return null;
} });
