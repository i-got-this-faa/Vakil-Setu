import { LIMITS, VOICE_LIMITS } from "@legal-setu/domain";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { currentAccount, fail, requireAccount } from "./lib/access";
import { boundedText } from "./lib/input";
import { prepareConversationCase } from "./lib/voiceCase";
import { geminiConfig } from "./lib/provider";
import { dgxConfig } from "./lib/aiDgx";
import { EMPTY_PROFILE, bookingCard, hashGuestToken, validGuestToken, voiceAllowedLanguages, voiceAttachment, voiceInputKind, voiceLocale, voiceProfile, voiceSource } from "./lib/voice";

type ReadCtx = QueryCtx | MutationCtx;
type Actor = { kind: "account"; account: Doc<"accounts"> } | { kind: "guest"; session: Doc<"guestSessions"> };

// Signed in but no account yet (name step not finished, or a fresh deployment): keep talking as a guest.
async function signedInUser(ctx: ReadCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const account = await currentAccount(ctx);
  if (!account) return null;
  if (account.role !== "user") fail("FORBIDDEN", "This account cannot perform that action.");
  return account;
}
async function findGuest(ctx: ReadCtx, token: string | undefined) {
  if (token === undefined || !validGuestToken(token)) return null;
  const tokenHash = await hashGuestToken(token);
  const session = await ctx.db.query("guestSessions").withIndex("by_token_hash", q => q.eq("tokenHash", tokenHash)).unique();
  return session && !session.claimedBy ? session : null;
}

function owns(actor: Actor, conversation: Doc<"conversations">) {
  return actor.kind === "account" ? conversation.accountId === actor.account._id : conversation.guestSessionId === actor.session._id;
}

// Signed-in people act as their account; otherwise a valid, unclaimed guest token is required.
async function resolveActor(ctx: ReadCtx, guestToken: string | undefined): Promise<Actor | null> {
  const account = await signedInUser(ctx);
  if (account) return { kind: "account", account };
  const session = await findGuest(ctx, guestToken);
  return session ? { kind: "guest", session } : null;
}

async function readable(ctx: ReadCtx, conversationId: Id<"conversations">, guestToken: string | undefined) {
  const actor = await resolveActor(ctx, guestToken).catch(() => null);
  const conversation = await ctx.db.get(conversationId);
  return actor && conversation && owns(actor, conversation) ? { actor, conversation } : null;
}

async function recentAttempts(ctx: ReadCtx, subject: string, windowMs: number, max: number) {
  return (await ctx.db.query("voiceAttempts").withIndex("by_subject_at", q => q.eq("subject", subject).gte("at", Date.now() - windowMs)).take(max)).length;
}

async function bookingsFor(ctx: ReadCtx, caseId: Id<"cases"> | undefined) {
  if (!caseId) return [];
  const bookings = await ctx.db.query("bookings").withIndex("by_case", q => q.eq("caseId", caseId)).order("desc").take(10);
  const result = [];
  for (const booking of bookings) {
    const advocate = await ctx.db.get(booking.advocateId);
    result.push({ _id: booking._id, advocateId: booking.advocateId, advocateName: advocate?.displayName ?? "", start: booking.start, end: booking.end, state: booking.state, consultationMode: booking.consultationMode, ...(booking.payment ? { paid: { amount: booking.payment.amount, reference: booking.payment.reference, test: true } } : {}) });
  }
  return result;
}

export const capabilities = query({ args: {}, handler: async () => ({
  configured: dgxConfig(process.env).kind === "configured" || geminiConfig(process.env).kind === "configured",
  locales: voiceAllowedLanguages(process.env),
  guestTurns: VOICE_LIMITS.guestTurns,
  audioSeconds: VOICE_LIMITS.audioSeconds,
  audioBytes: VOICE_LIMITS.audioBytes,
}) });

// One conversation with its recent turns and any lawyer appointments made from it.
export const get = query({ args: { conversationId: v.id("conversations"), guestToken: v.optional(v.string()) }, handler: async (ctx, args) => {
  const access = await readable(ctx, args.conversationId, args.guestToken);
  if (!access) return null;
  const { actor, conversation } = access;
  const turns = (await ctx.db.query("conversationTurns").withIndex("by_conversation", q => q.eq("conversationId", conversation._id)).order("desc").take(200)).reverse();
  return {
    _id: conversation._id,
    locale: conversation.locale,
    profile: conversation.profile,
    turnCount: conversation.turnCount,
    updatedAt: conversation.updatedAt,
    isGuest: actor.kind === "guest",
    guestTurnsLeft: actor.kind === "guest" ? Math.max(0, VOICE_LIMITS.guestTurns - actor.session.turnCount) : null,
    turns: turns.map(turn => ({ _id: turn._id, requestId: turn.requestId, inputKind: turn.inputKind, transcript: turn.transcript, reply: turn.reply, createdAt: turn.createdAt, ...(turn.attachment ? { attachment: { fileName: turn.attachment.fileName, contentType: turn.attachment.contentType } } : {}) })),
    bookings: await bookingsFor(ctx, conversation.caseId),
  };
} });

// The newest conversation for this person, so the app can resume where they stopped.
export const latest = query({ args: { guestToken: v.optional(v.string()) }, handler: async (ctx, args) => {
  const actor = await resolveActor(ctx, args.guestToken).catch(() => null);
  if (!actor) return null;
  const conversation = actor.kind === "account"
    ? await ctx.db.query("conversations").withIndex("by_account_updated", q => q.eq("accountId", actor.account._id)).order("desc").first()
    : await ctx.db.query("conversations").withIndex("by_guest", q => q.eq("guestSessionId", actor.session._id)).order("desc").first();
  return conversation ? { _id: conversation._id, updatedAt: conversation.updatedAt } : null;
} });

export const listMine = query({ args: {}, handler: async (ctx) => {
  const account = await signedInUser(ctx).catch(() => null);
  if (!account) return [];
  const conversations = await ctx.db.query("conversations").withIndex("by_account_updated", q => q.eq("accountId", account._id)).order("desc").take(50);
  return conversations.map(conversation => ({ _id: conversation._id, locale: conversation.locale, summary: conversation.profile.summary, domain: conversation.profile.domain, turnCount: conversation.turnCount, updatedAt: conversation.updatedAt }));
} });

// After phone sign-in, everything said as a guest moves to the account. The token stops working.
export const claimGuest = mutation({ args: { guestToken: v.string() }, handler: async (ctx, args) => {
  const account = await requireAccount(ctx, "user");
  if (!validGuestToken(args.guestToken)) fail("INVALID_INPUT", "Invalid guest token.");
  const tokenHash = await hashGuestToken(args.guestToken);
  const session = await ctx.db.query("guestSessions").withIndex("by_token_hash", q => q.eq("tokenHash", tokenHash)).unique();
  if (!session) return { claimed: 0 };
  if (session.claimedBy) {
    if (session.claimedBy !== account._id) fail("FORBIDDEN", "This conversation belongs to another account.");
    return { claimed: 0 };
  }
  const conversations = await ctx.db.query("conversations").withIndex("by_guest", q => q.eq("guestSessionId", session._id)).take(50);
  for (const conversation of conversations) await ctx.db.patch(conversation._id, { accountId: account._id, guestSessionId: undefined });
  await ctx.db.patch(session._id, { claimedBy: account._id });
  return { claimed: conversations.length };
} });

// Start a fresh conversation (for example a new problem). Signed-in only; guests have one.
export const startNew = mutation({ args: { locale: voiceLocale, consent: v.literal(true) }, handler: async (ctx, args) => {
  const account = await requireAccount(ctx, "user");
  if (!voiceAllowedLanguages(process.env).includes(args.locale)) fail("INVALID_INPUT", "This language is not available.");
  const now = Date.now();
  return await ctx.db.insert("conversations", { accountId: account._id, locale: args.locale, createdAt: now, updatedAt: now, turnCount: 0, consentedAt: now, profile: EMPTY_PROFILE });
} });

// Turns the conversation into a private case with a summary, so the existing booking flow can share it with a lawyer.
export const prepareCase = mutation({ args: { conversationId: v.id("conversations") }, handler: async (ctx, args) => {
  const account = await requireAccount(ctx, "user");
  const conversation = await ctx.db.get(args.conversationId);
  if (!conversation || conversation.accountId !== account._id) fail("NOT_FOUND", "Conversation not found.");
  return await prepareConversationCase(ctx, account, conversation);
} });

// ---- Internal steps used by voice.send ----

export const reserve = internalMutation({ args: { conversationId: v.optional(v.id("conversations")), guestToken: v.optional(v.string()), locale: voiceLocale, requestId: v.string(), inputKind: voiceInputKind, text: v.optional(v.string()), attachment: v.optional(voiceAttachment) }, handler: async (ctx, args) => {
  const requestId = boundedText(args.requestId, "Request ID", 128);
  if (!voiceAllowedLanguages(process.env).includes(args.locale)) return { kind: "unavailable" as const, reason: "unsupported_language" };
  const account = await signedInUser(ctx);
  let actor: Actor;
  if (account) actor = { kind: "account", account };
  else {
    if (args.guestToken === undefined || !validGuestToken(args.guestToken)) fail("UNAUTHENTICATED", "Sign in or start as a guest.");
    const tokenHash = await hashGuestToken(args.guestToken);
    let session = await ctx.db.query("guestSessions").withIndex("by_token_hash", q => q.eq("tokenHash", tokenHash)).unique();
    if (session?.claimedBy) fail("UNAUTHENTICATED", "Sign in to continue this conversation.");
    if (!session) {
      const id = await ctx.db.insert("guestSessions", { tokenHash, createdAt: Date.now(), turnCount: 0 });
      session = (await ctx.db.get(id))!;
    }
    actor = { kind: "guest", session };
  }
  const now = Date.now();
  let conversation = args.conversationId ? await ctx.db.get(args.conversationId) : null;
  if (args.conversationId && (!conversation || !owns(actor, conversation))) fail("NOT_FOUND", "Conversation not found.");
  if (conversation) {
    const existing = await ctx.db.query("conversationTurns").withIndex("by_request", q => q.eq("conversationId", conversation!._id).eq("requestId", requestId)).unique();
    if (existing) return { kind: "replay" as const, conversationId: conversation._id, turnId: existing._id, reply: existing.reply, expired: existing.expiresAt <= now };
    const recent = await ctx.db.query("conversationTurns").withIndex("by_conversation", q => q.eq("conversationId", conversation!._id)).order("desc").take(3);
    if (recent.some(turn => turn.reply.kind === "pending" && turn.expiresAt > now)) fail("CONFLICT", "Still answering your last message.");
    if (conversation.turnCount >= VOICE_LIMITS.turnsPerConversation) return { kind: "unavailable" as const, reason: "conversation_full", conversationId: conversation._id };
  }
  if (actor.kind === "guest") {
    if (actor.session.turnCount >= VOICE_LIMITS.guestTurns) return { kind: "unavailable" as const, reason: "guest_limit", ...(conversation ? { conversationId: conversation._id } : {}) };
    if (await recentAttempts(ctx, "guest", LIMITS.hourMs, VOICE_LIMITS.guestTurnsPerHourGlobal) >= VOICE_LIMITS.guestTurnsPerHourGlobal) return { kind: "unavailable" as const, reason: "busy", ...(conversation ? { conversationId: conversation._id } : {}) };
  } else if (await recentAttempts(ctx, `account:${actor.account._id}`, VOICE_LIMITS.dayMs, VOICE_LIMITS.accountTurnsPerDay) >= VOICE_LIMITS.accountTurnsPerDay) {
    return { kind: "unavailable" as const, reason: "rate_limited", ...(conversation ? { conversationId: conversation._id } : {}) };
  }
  const text = args.inputKind === "text" || args.inputKind === "booking" ? boundedText(args.text ?? "", "Message", VOICE_LIMITS.textChars) : "";
  if (!conversation) {
    const id = await ctx.db.insert("conversations", { ...(actor.kind === "account" ? { accountId: actor.account._id } : { guestSessionId: actor.session._id }), locale: args.locale, createdAt: now, updatedAt: now, turnCount: 0, consentedAt: now, profile: EMPTY_PROFILE });
    conversation = (await ctx.db.get(id))!;
  }
  for (const turn of await ctx.db.query("conversationTurns").withIndex("by_conversation", q => q.eq("conversationId", conversation!._id)).order("desc").take(3)) {
    if (turn.reply.kind === "pending") await ctx.db.patch(turn._id, { reply: { kind: "unavailable", reason: "timeout" } });
  }
  const turnId = await ctx.db.insert("conversationTurns", { conversationId: conversation._id, requestId, inputKind: args.inputKind, ...(args.attachment ? { attachment: args.attachment } : {}), transcript: text, reply: { kind: "pending" }, createdAt: now, expiresAt: now + VOICE_LIMITS.leaseMs });
  await ctx.db.patch(conversation._id, { turnCount: conversation.turnCount + 1, updatedAt: now, locale: args.locale });
  if (actor.kind === "guest") await ctx.db.patch(actor.session._id, { turnCount: actor.session.turnCount + 1 });
  await ctx.db.insert("voiceAttempts", { subject: actor.kind === "guest" ? "guest" : `account:${actor.account._id}`, at: now });
  await ctx.scheduler.runAfter(VOICE_LIMITS.leaseMs, internal.conversations.expire, { turnId });
  return { kind: "reserved" as const, conversationId: conversation._id, turnId };
} });

export const context = internalQuery({ args: { turnId: v.id("conversationTurns") }, handler: async (ctx, args) => {
  const turn = await ctx.db.get(args.turnId);
  if (!turn || turn.reply.kind !== "pending" || turn.expiresAt <= Date.now()) return null;
  const conversation = await ctx.db.get(turn.conversationId);
  if (!conversation) return null;
  const previous = await ctx.db.query("conversationTurns").withIndex("by_conversation", q => q.eq("conversationId", conversation._id)).order("desc").take(VOICE_LIMITS.historyTurns + 5);
  const history = previous.filter(entry => entry._id !== turn._id && entry.reply.kind === "reply").slice(0, VOICE_LIMITS.historyTurns).reverse()
    .map(entry => ({ user: entry.transcript, assistant: entry.reply.kind === "reply" ? entry.reply.text : "" }));
  const bookings = (await bookingsFor(ctx, conversation.caseId)).map(booking => ({ advocateName: booking.advocateName, start: booking.start, state: booking.state }));
  return { turn, conversation, history, bookings };
} });

export const auditDispatch = internalMutation({ args: { turnId: v.id("conversationTurns"), model: v.string(), recipientOrigin: v.string() }, handler: async (ctx, args) => {
  const turn = await ctx.db.get(args.turnId);
  if (!turn || turn.reply.kind !== "pending" || turn.expiresAt <= Date.now()) fail("CONFLICT", "Message expired.");
  const dgx = dgxConfig(process.env);
  const allowed = ["https://generativelanguage.googleapis.com", ...(dgx.kind === "configured" ? [dgx.origin] : [])];
  if (!allowed.includes(args.recipientOrigin)) fail("FORBIDDEN", "Voice uses the configured AI services only.");
  await ctx.db.patch(turn._id, { dispatch: { model: args.model, recipientOrigin: args.recipientOrigin, at: Date.now() } });
  return null;
} });

export const finish = internalMutation({ args: { turnId: v.id("conversationTurns"), result: v.union(
  v.object({ kind: v.literal("reply"), transcript: v.string(), reply: v.string(), sources: v.optional(v.array(voiceSource)), profile: voiceProfile, model: v.string(), booking: v.optional(bookingCard) }),
  v.object({ kind: v.literal("unavailable"), reason: v.string() }),
) }, handler: async (ctx, args) => {
  const turn = await ctx.db.get(args.turnId);
  if (!turn || turn.reply.kind !== "pending") return { kind: "unavailable" as const, reason: "state_changed" };
  const conversation = await ctx.db.get(turn.conversationId);
  if (!conversation) return { kind: "unavailable" as const, reason: "state_changed" };
  if (args.result.kind === "unavailable") {
    await ctx.db.patch(turn._id, { reply: { kind: "unavailable", reason: args.result.reason } });
    // Failed answers do not use up a guest's limited turns.
    if (conversation.guestSessionId) {
      const session = await ctx.db.get(conversation.guestSessionId);
      if (session && session.turnCount > 0) await ctx.db.patch(session._id, { turnCount: session.turnCount - 1 });
    }
    return { kind: "unavailable" as const, reason: args.result.reason };
  }
  const { transcript, reply, sources, profile, model, booking } = args.result;
  const typed = turn.inputKind === "text" || turn.inputKind === "booking";
  await ctx.db.patch(turn._id, { transcript: typed ? turn.transcript : transcript.slice(0, VOICE_LIMITS.transcriptChars), reply: { kind: "reply", text: reply.slice(0, VOICE_LIMITS.replyChars), ...(sources?.length ? { sources: sources.slice(0, 3) } : {}), ...(booking ? { booking } : {}) } });
  // A booking tap is not an AI answer, so it leaves the AI's understanding of the problem as it was.
  if (model !== "booking") await ctx.db.patch(conversation._id, { profile, profileModel: model, updatedAt: Date.now() });
  else await ctx.db.patch(conversation._id, { updatedAt: Date.now() });
  return { kind: "available" as const };
} });

export const expire = internalMutation({ args: { turnId: v.id("conversationTurns") }, handler: async (ctx, args) => {
  const turn = await ctx.db.get(args.turnId);
  if (turn?.reply.kind === "pending" && turn.expiresAt <= Date.now()) await ctx.db.patch(turn._id, { reply: { kind: "unavailable", reason: "timeout" } });
  return null;
} });
