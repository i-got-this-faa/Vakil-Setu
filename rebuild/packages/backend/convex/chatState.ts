import { CHAT_LIMITS, LIMITS } from "@vakil/domain";
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { ownCase, fail } from "./lib/access";
import { boundedText } from "./lib/input";
import { chatContextKey, chatResult, sendArgs } from "./lib/chat";
import { internal } from "./_generated/api";
import { aiAllowedLanguages } from "./lib/provider";

export const expire = internalMutation({ args: { turnId: v.id("chatTurns") }, handler: async (ctx, args) => {
  const turn = await ctx.db.get(args.turnId);
  if (turn?.result.kind === "pending" && turn.expiresAt <= Date.now()) {
    await ctx.db.patch(turn._id, { result: { kind: "unavailable", reason: "timeout" } });
  }
  return null;
} });

export const reserve = internalMutation({ args: sendArgs, handler: async (ctx, args) => {
  const { legalCase, account } = await ownCase(ctx, args.caseId);
  const text = boundedText(args.message, "Message", CHAT_LIMITS.messageChars);
  const requestId = boundedText(args.requestId, "Request ID", 128);
  if (requestId !== args.requestId) fail("INVALID_INPUT", "Request ID must not have surrounding whitespace.");
  if (args.documentIds.length > CHAT_LIMITS.attachments || new Set(args.documentIds).size !== args.documentIds.length) fail("INVALID_INPUT", "Select at most three distinct documents.");
  const existing = await ctx.db.query("chatTurns").withIndex("by_request", q => q.eq("caseId", args.caseId).eq("requestId", requestId)).unique();
  if (existing) {
    if (existing.text !== text || JSON.stringify(existing.documentIds) !== JSON.stringify(args.documentIds)) fail("CONFLICT", "Request ID already belongs to a different message.");
    return { kind: "replay" as const, result: existing.result.kind === "pending" ? { kind: "unavailable" as const, reason: existing.expiresAt <= Date.now() ? "timeout" : "in_progress" } : existing.result.kind === "reply" ? { kind: "available" as const } : existing.result };
  }
  const turns = await ctx.db.query("chatTurns").withIndex("by_case", q => q.eq("caseId", args.caseId)).order("asc").take(CHAT_LIMITS.turns);
  if (args.contextKey !== chatContextKey(legalCase, turns)) fail("CONFLICT", "Case chat changed. Review the latest context before sending.");
  if (turns.some(turn => turn.result.kind === "pending" && turn.expiresAt > Date.now())) fail("CONFLICT", "A message is already being sent for this case.");
  if (turns.length >= CHAT_LIMITS.turns) fail("LIMIT_EXCEEDED", "Case chat has reached 100 turns.");
  const attempts = await ctx.db.query("chatAttempts").withIndex("by_account_at", q => q.eq("accountId", account._id).gte("at", Date.now() - LIMITS.hourMs)).take(CHAT_LIMITS.attemptsPerHour);
  if (attempts.length >= CHAT_LIMITS.attemptsPerHour) fail("RATE_LIMITED", "Chat allows 20 sends per hour.");
  const documents = [];
  for (const documentId of args.documentIds) {
    const document = await ctx.db.get(documentId);
    if (!document || document.caseId !== legalCase._id) fail("NOT_FOUND", "Selected document not found.");
    documents.push(document);
  }
  if (documents.reduce((size, document) => size + document.size, 0) > CHAT_LIMITS.attachmentBytes) fail("LIMIT_EXCEEDED", "Selected documents exceed 6 MiB.");
  for (const turn of turns) if (turn.result.kind === "pending") await ctx.db.patch(turn._id, { result: { kind: "unavailable", reason: "timeout" } });
  const turnId = await ctx.db.insert("chatTurns", { caseId: legalCase._id, ownerId: account._id, requestId, text, createdAt: Date.now(), expiresAt: Date.now() + CHAT_LIMITS.leaseMs, documentIds: args.documentIds, documentNames: documents.map(document => document.fileName), contextRevision: legalCase.contextRevision, summaryVersion: legalCase.summaryVersion, result: { kind: "pending" } });
  await ctx.scheduler.runAfter(CHAT_LIMITS.leaseMs, internal.chatState.expire, { turnId });
  await ctx.db.insert("chatAttempts", { accountId: account._id, at: Date.now() });
  return { kind: "reserved" as const, turnId };
} });

export const context = internalQuery({ args: { turnId: v.id("chatTurns") }, handler: async (ctx, args) => {
  const turn = await ctx.db.get(args.turnId);
  if (!turn) fail("NOT_FOUND", "Chat turn not found.");
  const { legalCase } = await ownCase(ctx, turn.caseId);
  if (turn.result.kind !== "pending" || turn.expiresAt <= Date.now() || legalCase.contextRevision !== turn.contextRevision || legalCase.summaryVersion !== turn.summaryVersion) fail("CONFLICT", "Case changed or send expired.");
  const turns = await ctx.db.query("chatTurns").withIndex("by_case", q => q.eq("caseId", turn.caseId)).take(CHAT_LIMITS.turns);
  const history = turns.filter(entry => entry._id !== turn._id && entry.result.kind === "reply").slice(-CHAT_LIMITS.historyTurns);
  const documents = [];
  for (const documentId of turn.documentIds) {
    const document = await ctx.db.get(documentId);
    if (!document || document.caseId !== turn.caseId) fail("NOT_FOUND", "Selected document unavailable.");
    documents.push(document);
  }
  return { legalCase, turn, history, documents };
} });

export const auditDispatch = internalMutation({ args: { turnId: v.id("chatTurns"), model: v.string() }, handler: async (ctx, args) => {
  const turn = await ctx.db.get(args.turnId);
  if (!turn) fail("NOT_FOUND", "Chat turn not found.");
  const { legalCase } = await ownCase(ctx, turn.caseId);
  if (turn.result.kind !== "pending" || turn.expiresAt <= Date.now() || legalCase.contextRevision !== turn.contextRevision || legalCase.summaryVersion !== turn.summaryVersion) fail("CONFLICT", "Case changed or send expired.");
  const audits = await ctx.db.query("chatConsents").withIndex("by_case", q => q.eq("caseId", turn.caseId)).take(CHAT_LIMITS.turns);
  if (audits.some(audit => audit.turnId === turn._id)) fail("CONFLICT", "Send already dispatched.");
  const turns = await ctx.db.query("chatTurns").withIndex("by_case", q => q.eq("caseId", turn.caseId)).take(CHAT_LIMITS.turns);
  await ctx.db.insert("chatConsents", { caseId: turn.caseId, ownerId: turn.ownerId, turnId: turn._id, at: Date.now(), recipientOrigin: "https://generativelanguage.googleapis.com", model: args.model, contextRevision: turn.contextRevision, summaryVersion: turn.summaryVersion, documentIds: turn.documentIds, historyTurnIds: turns.filter(entry => entry.result.kind === "reply").slice(-CHAT_LIMITS.historyTurns).map(entry => entry._id) });
  return null;
} });

export const finish = internalMutation({ args: { turnId: v.id("chatTurns"), result: chatResult }, handler: async (ctx, args) => {
  const turn = await ctx.db.get(args.turnId);
  const identity = await ctx.auth.getUserIdentity();
  if (!turn || !identity) return { kind: "unavailable" as const, reason: "state_changed" };
  const account = await ctx.db.get(turn.ownerId);
  if (!account || account.clerkSubject !== identity.subject) fail("FORBIDDEN", "Turn owner required.");
  const legalCase = await ctx.db.get(turn.caseId);
  if (turn.result.kind !== "pending") return { kind: "unavailable" as const, reason: "state_changed" };
  const valid = !account.disabled && account.role === "user" && legalCase?.ownerId === account._id && legalCase.contextRevision === turn.contextRevision && legalCase.summaryVersion === turn.summaryVersion && turn.expiresAt > Date.now();
  const result = !valid ? { kind: "unavailable" as const, reason: "state_changed" } : args.result.kind === "reply" && !aiAllowedLanguages(process.env).includes(legalCase.locale) ? { kind: "unavailable" as const, reason: "unsupported_language" } : args.result;
  if (result.kind === "pending") fail("INVALID_INPUT", "Final result required.");
  if (result.kind === "reply" && (!result.text.trim() || result.text.length > CHAT_LIMITS.replyChars)) fail("INVALID_INPUT", "Invalid reply length.");
  await ctx.db.patch(turn._id, { result });
  return result.kind === "reply" ? { kind: "available" as const } : result;
} });
