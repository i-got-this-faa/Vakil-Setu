import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { consultationMode, domain, locale } from "./lib/validators";
import { terminateBooking } from "./lib/lifecycle";

// DEMO ONLY. Loads a scraped public roster into a development deployment for a presentation.
// Internal: callable only with `npx convex run` by a deployment admin, never from the app.
// Each lawyer gets a placeholder account that no one can sign in to, so booking requests reach nobody outside.
const SUBJECT_PREFIX = "demo-roster:";
const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const rosterEntry = v.object({
  key: v.string(),
  displayName: v.string(),
  city: v.string(),
  bio: v.string(),
  barRegistration: v.string(),
  yearsExperience: v.number(),
  domains: v.array(domain),
  locales: v.array(locale),
  consultationModes: v.array(consultationMode),
});

export const importRoster = internalMutation({
  args: { advocates: v.array(rosterEntry), slotDays: v.number() },
  returns: v.object({ created: v.number(), updated: v.number(), slotsPerLawyer: v.number() }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const reviewer = await upsertAccount(ctx, `${SUBJECT_PREFIX}reviewer`, "Demo roster import", "admin");
    // Slots at 11:00 and 16:00 IST on each of the next `slotDays` days.
    const istMidnight = Math.floor((now + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
    const starts: number[] = [];
    for (let day = 1; day <= args.slotDays; day += 1) for (const hour of [11, 16]) starts.push(istMidnight + day * DAY_MS + hour * 60 * 60 * 1000);

    let created = 0;
    let updated = 0;
    for (const entry of args.advocates) {
      const accountId = await upsertAccount(ctx, `${SUBJECT_PREFIX}${entry.key}`, entry.displayName, "advocate");
      const fields = {
        displayName: entry.displayName,
        city: entry.city,
        cityKey: entry.city.trim().toLocaleLowerCase("en-IN"),
        bio: entry.bio,
        barRegistration: entry.barRegistration,
        yearsExperience: entry.yearsExperience,
        domains: entry.domains.length ? entry.domains : ["other" as const],
        locales: entry.locales.length ? entry.locales : ["en" as const],
        consultationModes: entry.consultationModes.length ? entry.consultationModes : ["video" as const],
        application: { kind: "approved" as const, reviewerId: reviewer, reviewedAt: now, reason: "Demo roster import for a presentation" },
      };
      const existing = await ctx.db.query("advocates").withIndex("by_account", (q) => q.eq("accountId", accountId)).unique();
      let advocateId;
      if (existing) {
        await ctx.db.patch(existing._id, { ...fields, revision: existing.revision + 1 });
        advocateId = existing._id;
        updated += 1;
      } else {
        advocateId = await ctx.db.insert("advocates", { accountId, revision: 1, ...fields });
        created += 1;
      }
      const mode = fields.consultationModes.includes("video") ? "video" : (fields.consultationModes[0] ?? "video");
      for (const start of starts) {
        const taken = await ctx.db.query("slots").withIndex("by_advocate_start", (q) => q.eq("advocateId", advocateId).eq("start", start)).first();
        if (!taken) await ctx.db.insert("slots", { advocateId, start, durationMinutes: 30, end: start + 30 * 60 * 1000, consultationMode: mode, reservation: { kind: "free" } });
      }
    }
    return { created, updated, slotsPerLawyer: starts.length };
  },
});

// Removes every demo lawyer, their placeholder accounts and their free slots.
// Operator-only: keeps the demo lawyers bookable by adding 11:00 and 16:00 IST slots for the next `days` days.
// Safe to run again: existing slots are left alone.
export const extendSlots = internalMutation({
  args: { days: v.number() },
  returns: v.object({ lawyers: v.number(), added: v.number() }),
  handler: async (ctx, args) => {
    if (!Number.isInteger(args.days) || args.days < 1 || args.days > 14) throw new Error("days must be 1 to 14");
    const now = Date.now();
    const istMidnight = Math.floor((now + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
    const starts: number[] = [];
    for (let day = 1; day <= args.days; day += 1) for (const hour of [11, 16]) starts.push(istMidnight + day * DAY_MS + hour * 60 * 60 * 1000);
    let lawyers = 0;
    let added = 0;
    for (const advocate of await ctx.db.query("advocates").withIndex("by_status_city", (q) => q.eq("application.kind", "approved")).take(500)) {
      const account = await ctx.db.get(advocate.accountId);
      if (!account?.clerkSubject.startsWith(SUBJECT_PREFIX)) continue;
      lawyers += 1;
      const mode = advocate.consultationModes.includes("video") ? "video" : (advocate.consultationModes[0] ?? "video");
      for (const start of starts) {
        const taken = await ctx.db.query("slots").withIndex("by_advocate_start", (q) => q.eq("advocateId", advocate._id).eq("start", start)).first();
        if (!taken) {
          await ctx.db.insert("slots", { advocateId: advocate._id, start, durationMinutes: 30, end: start + 30 * 60 * 1000, consultationMode: mode, reservation: { kind: "free" } });
          added += 1;
        }
      }
    }
    return { lawyers, added };
  },
});

// Operator-only, for demo retakes: gives one test account a clean start. Cancels its live bookings (freeing the
// lawyers' slots), then deletes all its bookings with their events, reviews and notifications (both sides), and its
// voice conversations with their messages and attached files. Cannot be undone.
export const resetUser = internalMutation({
  args: { accountId: v.id("accounts") },
  returns: v.object({ conversations: v.number(), turns: v.number(), bookingsCancelled: v.number(), bookingsDeleted: v.number() }),
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account || account.role !== "user") throw new Error("Only a user account can be reset.");
    let bookingsCancelled = 0;
    for (const state of ["pending", "accepted"] as const) {
      for (const booking of await ctx.db.query("bookings").withIndex("by_user_state", (q) => q.eq("userId", account._id).eq("state", state)).take(100)) {
        await terminateBooking(ctx, booking, "cancelled", "Demo reset", { kind: "user", accountId: account._id });
        bookingsCancelled += 1;
      }
    }
    let bookingsDeleted = 0;
    for (const booking of await ctx.db.query("bookings").withIndex("by_user", (q) => q.eq("userId", account._id)).take(200)) {
      for (const event of await ctx.db.query("bookingEvents").withIndex("by_booking", (q) => q.eq("bookingId", booking._id)).take(200)) await ctx.db.delete(event._id);
      for (const review of (await ctx.db.query("reviews").take(1000)).filter((r) => r.bookingId === booking._id)) await ctx.db.delete(review._id);
      for (const owner of [account._id, booking.advocateAccountId]) {
        for (const note of await ctx.db.query("notifications").withIndex("by_account", (q) => q.eq("accountId", owner)).take(1000)) {
          if (note.bookingId === booking._id) await ctx.db.delete(note._id);
        }
      }
      // A slot never points at a deleted booking.
      const slot = await ctx.db.get(booking.slotId);
      if (slot?.reservation.kind === "reserved" && slot.reservation.bookingId === booking._id) await ctx.db.patch(slot._id, { reservation: { kind: "free" } });
      await ctx.db.delete(booking._id);
      bookingsDeleted += 1;
    }
    let conversations = 0;
    let turns = 0;
    for (const conversation of await ctx.db.query("conversations").withIndex("by_account_updated", (q) => q.eq("accountId", account._id)).take(200)) {
      for (const turn of await ctx.db.query("conversationTurns").withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id)).take(500)) {
        if (turn.attachment) await ctx.storage.delete(turn.attachment.storageId);
        await ctx.db.delete(turn._id);
        turns += 1;
      }
      await ctx.db.delete(conversation._id);
      conversations += 1;
    }
    return { conversations, turns, bookingsCancelled, bookingsDeleted };
  },
});

export const removeRoster = internalMutation({
  args: {},
  returns: v.object({ removed: v.number() }),
  handler: async (ctx) => {
    let removed = 0;
    const accounts = await ctx.db.query("accounts").withIndex("by_subject", (q) => q.gte("clerkSubject", SUBJECT_PREFIX).lt("clerkSubject", `${SUBJECT_PREFIX}\uffff`)).take(1000);
    for (const account of accounts) {
      const advocate = await ctx.db.query("advocates").withIndex("by_account", (q) => q.eq("accountId", account._id)).unique();
      if (advocate) {
        for (const slot of await ctx.db.query("slots").withIndex("by_advocate_start", (q) => q.eq("advocateId", advocate._id)).collect()) {
          if (slot.reservation.kind === "free") await ctx.db.delete(slot._id);
        }
        await ctx.db.patch(advocate._id, { application: { kind: "suspended", reviewerId: account._id, reviewedAt: Date.now(), reason: "Demo roster removed" } });
        removed += 1;
      }
      await ctx.db.patch(account._id, { disabled: true });
    }
    return { removed };
  },
});

async function upsertAccount(ctx: MutationCtx, clerkSubject: string, displayName: string, role: "advocate" | "admin") {
  const existing = await ctx.db.query("accounts").withIndex("by_subject", (q) => q.eq("clerkSubject", clerkSubject)).unique();
  if (existing) return existing._id;
  return await ctx.db.insert("accounts", { clerkSubject, role, displayName, locale: "en", disabled: false });
}
