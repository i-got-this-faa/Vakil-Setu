import { LIMITS } from "@vakil/domain";
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { fail, ownCase } from "./lib/access";
import { integer } from "./lib/input";

export const consume = internalMutation({ args: { caseId: v.id("cases"), expectedVersion: v.number(), expectedContextRevision: v.number() }, handler: async (ctx, args) => {
  const { account, legalCase } = await ownCase(ctx, args.caseId);
  if (legalCase.summaryVersion !== integer(args.expectedVersion, "Summary version", 0, 100)) fail("CONFLICT", "Summary changed. Review the latest version.");
  if (legalCase.contextRevision !== integer(args.expectedContextRevision, "Context revision", 0, Number.MAX_SAFE_INTEGER)) fail("CONFLICT", "Follow-up context changed. Review the latest context.");
  const now = Date.now();
  const cutoff = now - LIMITS.hourMs;
  const attempts = await ctx.db.query("aiAttempts").withIndex("by_account_at", (q) => q.eq("accountId", account._id).gt("at", cutoff)).take(LIMITS.aiAttemptsPerHour);
  if (attempts.length >= LIMITS.aiAttemptsPerHour) fail("RATE_LIMITED", "Analysis is limited to five attempts per hour. Manual summaries remain available.");
  const old = await ctx.db.query("aiAttempts").withIndex("by_account_at", (q) => q.eq("accountId", account._id).lte("at", cutoff)).collect();
  for (const attempt of old) await ctx.db.delete(attempt._id);
  await ctx.db.insert("aiAttempts", { accountId: account._id, at: now });
  return null;
} });
