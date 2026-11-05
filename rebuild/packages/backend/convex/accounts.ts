import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { locale } from "./lib/validators";
import { currentAccount, fail } from "./lib/access";
import { boundedText } from "./lib/input";

export const me = query({ args: {}, handler: async (ctx) => {
  if (!(await ctx.auth.getUserIdentity())) return null;
  return await currentAccount(ctx);
} });
export const ensure = mutation({
  args: { role: v.union(v.literal("user"), v.literal("advocate")), displayName: v.string(), locale },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) fail("UNAUTHENTICATED", "Sign in to continue.");
    const displayName = boundedText(args.displayName, "Display name", 100);
    const account = await currentAccount(ctx);
    if (account) {
      if (account.role !== args.role) fail("CONFLICT", "An existing account role cannot be changed by onboarding.");
      return account._id;
    }
    return await ctx.db.insert("accounts", { clerkSubject: identity.subject, role: args.role, displayName, locale: args.locale, disabled: false });
  },
});
// Deployment operator only; the subject must be copied explicitly from Clerk.
export const bootstrapAdmin = internalMutation({
  args: { clerkSubject: v.string(), displayName: v.string(), locale },
  handler: async (ctx, args) => {
    const clerkSubject = boundedText(args.clerkSubject, "Clerk subject", 256);
    const displayName = boundedText(args.displayName, "Display name", 100);
    const existing = await ctx.db.query("accounts").withIndex("by_subject", (q) => q.eq("clerkSubject", clerkSubject)).unique();
    if (existing) {
      if (existing.role !== "admin") fail("CONFLICT", "Admin bootstrap requires a separate Clerk subject without an existing user or advocate account.");
      return existing._id;
    }
    return await ctx.db.insert("accounts", { clerkSubject, displayName, role: "admin", locale: args.locale, disabled: false });
  },
});
