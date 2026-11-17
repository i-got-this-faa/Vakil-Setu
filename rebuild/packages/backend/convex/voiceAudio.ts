import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { bhashiniKeys, bhashiniService, bhashiniSpeak, BHASHINI_VOICE } from "./lib/bhashini";
import { validGuestToken, voiceLocale } from "./lib/voice";

// Natural read-aloud voices from Bhashini. Each spoken sentence is saved, so replaying it is instant and free.
const MAX_CHARS = 400;
const NEW_CLIPS_PER_HOUR = 1500;
const HOUR_MS = 60 * 60 * 1000;

async function clipKey(locale: string, text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${BHASHINI_VOICE}|${locale}|${text}`));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const cached = internalQuery({ args: { key: v.string() }, returns: v.union(v.string(), v.null()), handler: async (ctx, args) => {
  const clip = await ctx.db.query("voiceClips").withIndex("by_key", (q) => q.eq("key", args.key)).unique();
  return clip ? await ctx.storage.getUrl(clip.storageId) : null;
} });

// Caps how many new clips can be made per hour across everyone, so the voice service can't be drained.
export const allowNewClip = internalMutation({ args: {}, returns: v.boolean(), handler: async (ctx) => {
  const now = Date.now();
  const recent = await ctx.db.query("voiceAttempts").withIndex("by_subject_at", (q) => q.eq("subject", "tts").gt("at", now - HOUR_MS)).take(NEW_CLIPS_PER_HOUR);
  if (recent.length >= NEW_CLIPS_PER_HOUR) return false;
  await ctx.db.insert("voiceAttempts", { subject: "tts", at: now });
  return true;
} });

export const remember = internalMutation({ args: { key: v.string(), storageId: v.id("_storage") }, returns: v.null(), handler: async (ctx, args) => {
  const existing = await ctx.db.query("voiceClips").withIndex("by_key", (q) => q.eq("key", args.key)).unique();
  if (existing) await ctx.storage.delete(args.storageId);
  else await ctx.db.insert("voiceClips", { key: args.key, storageId: args.storageId, createdAt: Date.now() });
  return null;
} });

export const speak = action({
  args: { locale: voiceLocale, text: v.string(), guestToken: v.optional(v.string()) },
  returns: v.union(v.object({ kind: v.literal("audio"), url: v.string() }), v.object({ kind: v.literal("unavailable"), reason: v.string() })),
  handler: async (ctx, args): Promise<{ kind: "audio"; url: string } | { kind: "unavailable"; reason: string }> => {
    const text = args.text.replace(/\s+/g, " ").trim();
    if (!text || text.length > MAX_CHARS) return { kind: "unavailable" as const, reason: "invalid_text" };
    if (!bhashiniService(args.locale)) return { kind: "unavailable" as const, reason: "no_voice" };
    // Only people using the app: signed in, or holding a device guest token.
    const identity = await ctx.auth.getUserIdentity();
    if (!identity && !(args.guestToken && validGuestToken(args.guestToken))) return { kind: "unavailable" as const, reason: "unauthenticated" };
    const key = await clipKey(args.locale, text);
    const hit: string | null = await ctx.runQuery(internal.voiceAudio.cached, { key });
    if (hit) return { kind: "audio" as const, url: hit };
    const keys = bhashiniKeys(process.env);
    if (!keys.length) return { kind: "unavailable" as const, reason: "not_configured" };
    if (!(await ctx.runMutation(internal.voiceAudio.allowNewClip, {}))) return { kind: "unavailable" as const, reason: "busy" };
    const audio = await bhashiniSpeak(text, args.locale, keys, AbortSignal.timeout(15_000)).catch(() => null);
    if (!audio) return { kind: "unavailable" as const, reason: "provider_failed" };
    const storageId = await ctx.storage.store(new Blob([audio.slice().buffer], { type: "audio/wav" }));
    await ctx.runMutation(internal.voiceAudio.remember, { key, storageId });
    const url: string | null = await ctx.runQuery(internal.voiceAudio.cached, { key });
    return url ? { kind: "audio" as const, url } : { kind: "unavailable" as const, reason: "storage_failed" };
  },
});
