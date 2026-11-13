import { LIMITS } from "@legal-setu/domain";
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { fail, ownCase } from "./lib/access";
import { SPEECH_LIMITS, SPEECH_RECIPIENT_ORIGIN, SPEECH_MODEL, speechLocaleSupported } from "./lib/speech";

// Reserves one outbound speech request. Runs before any network call; the consent audit row is written here.
// The text is read from the persisted reply, never from client input.
export const reserve = internalMutation({
  args: { turnId: v.id("chatTurns") },
  returns: v.union(
    v.object({ kind: v.literal("reserved"), text: v.string() }),
    v.object({ kind: v.literal("unavailable"), reason: v.union(v.literal("unsupported_language"), v.literal("no_reply")) }),
  ),
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) fail("NOT_FOUND", "Chat turn not found.");
    // ownCase fails NOT_FOUND for other accounts, so ownership never leaks turn existence.
    const { account, legalCase } = await ownCase(ctx, turn.caseId);
    if (turn.ownerId !== account._id) fail("NOT_FOUND", "Chat turn not found.");
    if (turn.result.kind !== "reply") return { kind: "unavailable" as const, reason: "no_reply" as const };
    const text = turn.result.text.trim();
    if (!text || text.length > SPEECH_LIMITS.textChars) return { kind: "unavailable" as const, reason: "no_reply" as const };
    if (!speechLocaleSupported(legalCase.locale)) return { kind: "unavailable" as const, reason: "unsupported_language" as const };

    const now = Date.now();
    const recent = await ctx.db.query("speechAttempts").withIndex("by_turn_at", q => q.eq("turnId", turn._id).gte("at", now - SPEECH_LIMITS.inFlightMs)).take(1);
    if (recent.length) fail("CONFLICT", "Audio for this reply is already being prepared. Wait a moment, then try again.");
    const attempts = await ctx.db.query("speechAttempts").withIndex("by_account_at", q => q.eq("accountId", account._id).gte("at", now - LIMITS.hourMs)).take(SPEECH_LIMITS.requestsPerHour);
    if (attempts.length >= SPEECH_LIMITS.requestsPerHour) fail("RATE_LIMITED", "Natural voice allows 30 replies per hour.");

    await ctx.db.insert("speechAttempts", { accountId: account._id, turnId: turn._id, at: now });
    await ctx.db.insert("speechConsents", {
      caseId: legalCase._id,
      ownerId: account._id,
      turnId: turn._id,
      at: now,
      provider: "elevenlabs",
      model: SPEECH_MODEL,
      recipientOrigin: SPEECH_RECIPIENT_ORIGIN,
      textChars: text.length,
    });
    return { kind: "reserved" as const, text };
  },
});
