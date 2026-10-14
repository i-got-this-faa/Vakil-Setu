import { LIMITS } from "@vakil/domain";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { consultationMode, domain, locale } from "./lib/validators";
import { approvedAdvocate, fail, requireAccount } from "./lib/access";
import { boundedText, integer, page } from "./lib/input";
import { publicProfile } from "./lib/discovery";
import { discoveryCursor, discoveryOffset } from "./lib/discoveryPagination";
import { revokeAdvocateBookings } from "./lib/lifecycle";

export const myProfile = query({ args: {}, handler: async (ctx) => {
  const account = await requireAccount(ctx, "advocate");
  return await ctx.db.query("advocates").withIndex("by_account", (q) => q.eq("accountId", account._id)).unique();
} });
export const upsert = mutation({
  args: { displayName: v.string(), city: v.string(), bio: v.string(), barRegistration: v.string(), yearsExperience: v.number(), domains: v.array(domain), locales: v.array(locale), consultationModes: v.array(consultationMode) },
  handler: async (ctx, args) => {
    const account = await requireAccount(ctx, "advocate");
    if (args.domains.length < 1 || args.domains.length > 8 || args.domains.includes("unknown") || new Set(args.domains).size !== args.domains.length) fail("INVALID_INPUT", "Choose distinct supported practice domains.");
    if (args.locales.length < 1 || args.locales.length > 3 || new Set(args.locales).size !== args.locales.length) fail("INVALID_INPUT", "Choose distinct pilot languages.");
    if (args.consultationModes.length < 1 || args.consultationModes.length > 3 || new Set(args.consultationModes).size !== args.consultationModes.length) fail("INVALID_INPUT", "Choose distinct consultation modes.");
    const city = boundedText(args.city, "City", 100);
    const profile = { displayName: boundedText(args.displayName, "Display name", 100), city, cityKey: city.toLocaleLowerCase("en-IN"), bio: boundedText(args.bio, "Bio", 2000), barRegistration: boundedText(args.barRegistration, "Bar registration", 100), yearsExperience: integer(args.yearsExperience, "Experience", 0, 80), domains: args.domains, locales: args.locales, consultationModes: args.consultationModes };
    const existing = await ctx.db.query("advocates").withIndex("by_account", (q) => q.eq("accountId", account._id)).unique();
    if (!existing) return await ctx.db.insert("advocates", { ...profile, accountId: account._id, revision: 1, application: { kind: "pending" } });
    await ctx.db.patch(existing._id, { ...profile, revision: existing.revision + 1, application: existing.application.kind === "suspended" ? existing.application : { kind: "pending" } });
    await revokeAdvocateBookings(ctx, account._id, "Advocate profile requires review again.");
    return existing._id;
  },
});
export const getPublic = query({ args: { advocateId: v.id("advocates") }, handler: async (ctx, args) => {
  const advocate = await approvedAdvocate(ctx, args.advocateId);
  return advocate ? await publicProfile(ctx, advocate) : null;
} });
export const resolvePublic = query({ args: { routeId: v.string() }, handler: async (ctx, args) => {
  if (args.routeId.length < 1 || args.routeId.length > 128) return null;
  const advocateId = ctx.db.normalizeId("advocates", args.routeId);
  return advocateId && await approvedAdvocate(ctx, advocateId) ? advocateId : null;
} });
export const listPublic = query({
  args: { domain: v.optional(domain), locale: v.optional(locale), city: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const cityKey = args.city === undefined ? undefined : boundedText(args.city, "City", 100).toLocaleLowerCase("en-IN");
    const options = page(args.paginationOpts);
    const filters = { domain: args.domain, locale: args.locale, city: cityKey };
    const offset = discoveryOffset(options.cursor, filters);
    const candidates = await ctx.db.query("advocates").withIndex("by_status_city", (q) => cityKey === undefined ? q.eq("application.kind", "approved") : q.eq("application.kind", "approved").eq("cityKey", cityKey)).take(LIMITS.discoveryCandidates + 1);
    if (candidates.length > LIMITS.discoveryCandidates) fail("LIMIT_EXCEEDED", "Discovery exceeds the pilot cohort limit. Choose a city or ask the operator to upgrade the discovery index.");
    const profiles = [];
    for (const advocate of candidates) {
      if (args.domain && !advocate.domains.includes(args.domain)) continue;
      if (args.locale && !advocate.locales.includes(args.locale)) continue;
      if (await approvedAdvocate(ctx, advocate._id)) profiles.push(await publicProfile(ctx, advocate));
    }
    // Required expertise/language filters are applied before global availability ranking.
    profiles.sort((a, b) => (a.slots[0]?.start ?? Infinity) - (b.slots[0]?.start ?? Infinity)
      || a.displayName.localeCompare(b.displayName, "en-IN") || a._id.localeCompare(b._id));
    const nextOffset = Math.min(offset + options.numItems, profiles.length);
    return { page: profiles.slice(offset, nextOffset), isDone: nextOffset >= profiles.length, continueCursor: discoveryCursor(nextOffset, filters) };
  },
});
