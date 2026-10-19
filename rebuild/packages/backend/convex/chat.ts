import { CHAT_LIMITS } from "@vakil/domain";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, query } from "./_generated/server";
import { ownCase } from "./lib/access";
import { chatContextKey, sendArgs } from "./lib/chat";
import type { SendResult } from "./lib/chat";

export const listMine = query({ args: { caseId: v.id("cases") }, handler: async (ctx, args) => {
  const { legalCase } = await ownCase(ctx, args.caseId);
  const turns = await ctx.db.query("chatTurns").withIndex("by_case", q => q.eq("caseId", args.caseId)).order("asc").take(CHAT_LIMITS.turns);
  return { contextKey: chatContextKey(legalCase, turns), turns: turns.map(({ _id, text, createdAt, documentIds, result, expiresAt }) => ({ _id, text, createdAt, documentIds, result: result.kind === "pending" && expiresAt <= Date.now() ? { kind: "unavailable" as const, reason: "timeout" } : result })), limitReached: turns.length >= CHAT_LIMITS.turns };
} });
// Queries live in this default-runtime module; provider dispatch runs in Node.
export const send = action({ args: sendArgs, handler: async (ctx, args): Promise<SendResult> => await ctx.runAction(internal.chatProvider.send, args) });
