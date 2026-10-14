import { ConvexError } from "convex/values";
import type { ErrorCode } from "@vakil/domain";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

type ReadCtx = QueryCtx | MutationCtx;
export function fail(code: ErrorCode, message: string): never { throw new ConvexError({ code, message }); }
export async function currentAccount(ctx: ReadCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) fail("UNAUTHENTICATED", "Sign in to continue.");
  const account = await ctx.db.query("accounts").withIndex("by_subject", (q) => q.eq("clerkSubject", identity.subject)).unique();
  if (account?.disabled) fail("ACCOUNT_DISABLED", "This account is disabled.");
  return account;
}
export async function requireAccount(ctx: ReadCtx, role?: Doc<"accounts">["role"]) {
  const account = await currentAccount(ctx);
  if (!account) fail("ONBOARDING_REQUIRED", "Complete account onboarding.");
  if (role && account.role !== role) fail("FORBIDDEN", "This account cannot perform that action.");
  return account;
}
export async function ownAdvocate(ctx: ReadCtx) {
  const account = await requireAccount(ctx, "advocate");
  const advocate = await ctx.db.query("advocates").withIndex("by_account", (q) => q.eq("accountId", account._id)).unique();
  if (!advocate) fail("NOT_FOUND", "Complete the advocate application first.");
  return { account, advocate };
}
export async function approvedAdvocate(ctx: ReadCtx, advocateId: Id<"advocates">) {
  const advocate = await ctx.db.get(advocateId);
  if (!advocate || advocate.application.kind !== "approved") return null;
  const account = await ctx.db.get(advocate.accountId);
  return account && !account.disabled && account.role === "advocate" ? advocate : null;
}
export async function ownCase(ctx: ReadCtx, caseId: Id<"cases">) {
  const account = await requireAccount(ctx, "user");
  const legalCase = await ctx.db.get(caseId);
  if (!legalCase || legalCase.ownerId !== account._id) fail("NOT_FOUND", "Case not found.");
  return { account, legalCase };
}
