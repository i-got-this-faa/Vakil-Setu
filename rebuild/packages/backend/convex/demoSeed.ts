import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { consultationMode, domain, locale } from "./lib/validators";

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
