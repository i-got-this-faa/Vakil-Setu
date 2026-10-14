import { LIMITS } from "@vakil/domain";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { contextMessage, locale, summary, summarySource } from "./lib/validators";
import { fail, ownCase, requireAccount } from "./lib/access";
import { boundedText, cleanContext, cleanSummary, integer, page } from "./lib/input";

export const create = mutation({ args: { title: v.string(), text: v.string(), locale, context: v.array(contextMessage) }, handler: async (ctx, args) => {
  const account = await requireAccount(ctx, "user");
  return await ctx.db.insert("cases", { ownerId: account._id, title: boundedText(args.title, "Title", 160), text: boundedText(args.text, "Intake text", LIMITS.intakeText), locale: args.locale, context: cleanContext(args.context), contextRevision: 0, state: "draft", summaryVersion: 0 });
} });
export const appendFollowUp = mutation({ args: { caseId: v.id("cases"), expectedVersion: v.number(), expectedContextRevision: v.number(), text: v.string(), reviewed: v.literal(true) }, handler: async (ctx, args) => {
  const { legalCase } = await ownCase(ctx, args.caseId);
  if (legalCase.summaryVersion !== integer(args.expectedVersion, "Summary version", 0, 100) || legalCase.contextRevision !== integer(args.expectedContextRevision, "Context revision", 0, Number.MAX_SAFE_INTEGER - 1)) fail("CONFLICT", "Case changed. Review the latest context before appending.");
  const content = boundedText(args.text, "Reviewed follow-up", LIMITS.contextMessage);
  const context = [...legalCase.context, { role: "user" as const, content }].slice(-LIMITS.contextMessages);
  while (context.reduce((length, message) => length + message.content.length, 0) > LIMITS.contextTotal) context.shift();
  const contextRevision = legalCase.contextRevision + 1;
  await ctx.db.patch(legalCase._id, { context, contextRevision });
  return contextRevision;
} });
export const listMine = query({ args: { paginationOpts: paginationOptsValidator }, handler: async (ctx, args) => {
  const account = await requireAccount(ctx, "user");
  return await ctx.db.query("cases").withIndex("by_owner", (q) => q.eq("ownerId", account._id)).order("desc").paginate(page(args.paginationOpts));
} });
export const resolveMine = query({ args: { routeId: v.string() }, handler: async (ctx, args) => {
  const account = await requireAccount(ctx, "user");
  if (args.routeId.length < 1 || args.routeId.length > 128) return null;
  const caseId = ctx.db.normalizeId("cases", args.routeId);
  if (!caseId) return null;
  const legalCase = await ctx.db.get(caseId);
  return legalCase?.ownerId === account._id ? caseId : null;
} });
export const getMine = query({ args: { caseId: v.id("cases") }, handler: async (ctx, args) => {
  const { legalCase } = await ownCase(ctx, args.caseId);
  const summaries = await ctx.db.query("caseSummaries").withIndex("by_case_version", (q) => q.eq("caseId", legalCase._id)).order("desc").collect();
  return { case: legalCase, summaries };
} });
export const updateSummary = mutation({ args: { caseId: v.id("cases"), expectedVersion: v.number(), summary }, handler: async (ctx, args) => {
  const { legalCase } = await ownCase(ctx, args.caseId);
  if (legalCase.summaryVersion !== integer(args.expectedVersion, "Summary version", 0, Number.MAX_SAFE_INTEGER)) fail("CONFLICT", "Summary changed. Review the latest version.");
  const value = cleanSummary(args.summary);
  if (value.locale !== legalCase.locale) fail("INVALID_INPUT", "Summary must match the intake language.");
  if (legalCase.summaryVersion >= 100) fail("LIMIT_EXCEEDED", "This case has reached the summary version limit.");
  const version = legalCase.summaryVersion + 1;
  const id = await ctx.db.insert("caseSummaries", { caseId: legalCase._id, version, summary: value, source: { kind: "manual" }, createdAt: Date.now() });
  await ctx.db.patch(legalCase._id, { summaryVersion: version });
  return id;
} });
export const deleteDraft = mutation({ args: { caseId: v.id("cases") }, handler: async (ctx, args) => {
  const { legalCase } = await ownCase(ctx, args.caseId);
  if (legalCase.state !== "draft" || await ctx.db.query("bookings").withIndex("by_case", (q) => q.eq("caseId", legalCase._id)).first()) fail("CONFLICT", "Shared cases cannot be deleted as drafts.");
  const versions = await ctx.db.query("caseSummaries").withIndex("by_case_version", (q) => q.eq("caseId", legalCase._id)).collect();
  for (const version of versions) await ctx.db.delete(version._id);
  await ctx.db.delete(legalCase._id);
  return null;
} });
export const forAnalysis = internalQuery({ args: { caseId: v.id("cases"), expectedVersion: v.number(), expectedContextRevision: v.number() }, handler: async (ctx, args) => {
  const { legalCase } = await ownCase(ctx, args.caseId);
  if (legalCase.summaryVersion !== integer(args.expectedVersion, "Summary version", 0, Number.MAX_SAFE_INTEGER)) fail("CONFLICT", "Summary changed. Review the latest version.");
  if (legalCase.contextRevision !== integer(args.expectedContextRevision, "Context revision", 0, Number.MAX_SAFE_INTEGER)) fail("CONFLICT", "Follow-up context changed. Review the latest context.");
  return legalCase;
} });
export const saveProviderSummary = internalMutation({ args: { caseId: v.id("cases"), expectedVersion: v.number(), expectedContextRevision: v.number(), summary, source: summarySource }, handler: async (ctx, args) => {
  const { legalCase } = await ownCase(ctx, args.caseId);
  if (args.source.kind !== "provider") fail("INVALID_INPUT", "Provider source required.");
  if (legalCase.summaryVersion !== args.expectedVersion) fail("CONFLICT", "Summary changed during analysis.");
  if (legalCase.contextRevision !== args.expectedContextRevision) fail("CONFLICT", "Follow-up context changed during analysis.");
  if (legalCase.summaryVersion >= 100) fail("LIMIT_EXCEEDED", "This case has reached the summary version limit.");
  const value = cleanSummary(args.summary);
  if (value.locale !== legalCase.locale) fail("INVALID_INPUT", "Provider language mismatch.");
  const version = legalCase.summaryVersion + 1;
  const id = await ctx.db.insert("caseSummaries", { caseId: legalCase._id, version, summary: value, source: args.source, createdAt: Date.now() });
  await ctx.db.patch(legalCase._id, { summaryVersion: version });
  return id;
} });
