import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { isEmergency, isGreeting, isWaLocale, sendWhatsApp, WA_LIMITS, WA_TEXT, welcomeMessage } from "./lib/whatsapp";
import type { WaLocale, WaOutbound } from "./lib/whatsapp";
import { isCancel, isNoticeKind, isNoticeRequest, missingFields, NOTICE_KINDS, NOTICE_LIMITS, NOTICE_TEXT, NOTICES, noticeSummary } from "./lib/notices";

const outbound = v.union(
  v.object({ kind: v.literal("text"), text: v.string() }),
  v.object({ kind: v.literal("list"), text: v.string(), button: v.string(), rows: v.array(v.object({ id: v.string(), title: v.string(), description: v.optional(v.string()) })) }),
  v.object({ kind: v.literal("buttons"), text: v.string(), buttons: v.array(v.object({ id: v.string(), title: v.string() })) }),
);
const inbound = v.union(
  v.object({ messageId: v.string(), waId: v.string(), kind: v.literal("text"), text: v.string() }),
  v.object({ messageId: v.string(), waId: v.string(), kind: v.literal("button"), buttonId: v.string() }),
  v.object({ messageId: v.string(), waId: v.string(), kind: v.literal("unsupported") }),
);

export const send = internalAction({ args: { to: v.string(), message: outbound }, handler: async (_ctx, args) => {
  await sendWhatsApp(process.env, args.to, args.message);
  return null;
} });

const noticeMenu = (locale: WaLocale): WaOutbound => ({
  kind: "list", text: NOTICE_TEXT.menu[locale], button: "Choose notice",
  rows: NOTICE_KINDS.map(kind => ({ id: `notice_${kind}`, title: NOTICES[kind].title, description: NOTICES[kind].description })),
});

const liveDraft = (contact: Doc<"whatsappContacts">, now: number) => contact.draft && contact.draft.startedAt > now - NOTICE_LIMITS.draftTtlMs ? contact.draft : undefined;

// Dedupes Meta retries, rate-limits per sender and routes each message.
export const receive = internalMutation({ args: { message: inbound }, handler: async (ctx, { message }) => {
  if (await ctx.db.query("whatsappInbound").withIndex("by_message_id", q => q.eq("messageId", message.messageId)).unique()) return null;
  const now = Date.now();
  await ctx.db.insert("whatsappInbound", { messageId: message.messageId, waId: message.waId, at: now });
  const reply = async (out: WaOutbound) => { await ctx.scheduler.runAfter(0, internal.whatsapp.send, { to: message.waId, message: out }); };

  // Emergency numbers go out before consent, language choice or rate limits.
  if (message.kind === "text" && isEmergency(message.text)) await reply({ kind: "text", text: WA_TEXT.emergency });

  let contact = await ctx.db.query("whatsappContacts").withIndex("by_wa_id", q => q.eq("waId", message.waId)).unique();
  if (!contact) {
    const id = await ctx.db.insert("whatsappContacts", { waId: message.waId, recent: [], updatedAt: now });
    contact = (await ctx.db.get("whatsappContacts", id))!;
  }
  const locale = contact.locale ?? "hi";
  const recentCount = (await ctx.db.query("whatsappInbound").withIndex("by_wa_id_and_at", q => q.eq("waId", message.waId).gt("at", now - 3_600_000)).take(WA_LIMITS.messagesPerHour + 2)).length;
  if (recentCount > WA_LIMITS.messagesPerHour) {
    if (recentCount === WA_LIMITS.messagesPerHour + 1) await reply({ kind: "text", text: WA_TEXT.rateLimited[locale] });
    return null;
  }

  const chosen = message.kind === "button" && message.buttonId.startsWith("lang_") ? message.buttonId.slice(5) : "";
  if (isWaLocale(chosen)) {
    await ctx.db.patch("whatsappContacts", contact._id, { locale: chosen, consentedAt: now, updatedAt: now });
    await reply({ kind: "text", text: WA_TEXT.ready[chosen] });
    return null;
  }
  if (!contact.consentedAt || (message.kind === "text" && isGreeting(message.text))) {
    if (contact.draft) await ctx.db.patch("whatsappContacts", contact._id, { draft: undefined, updatedAt: now });
    await reply(welcomeMessage());
    return null;
  }
  if (message.kind === "button" && message.buttonId.startsWith("notice_")) return await noticeButton(ctx, contact, message.buttonId.slice(7), locale, now, reply);
  if (message.kind !== "text") { await reply({ kind: "text", text: WA_TEXT.unsupported[locale] }); return null; }
  if (isEmergency(message.text)) return null; // Helplines already sent; avoid an AI opinion on an emergency.

  const draft = liveDraft(contact, now);
  if (draft && isCancel(message.text)) {
    await ctx.db.patch("whatsappContacts", contact._id, { draft: undefined, updatedAt: now });
    await reply({ kind: "text", text: NOTICE_TEXT.cancelled[locale] });
    return null;
  }
  if (draft?.status === "generating") { await reply({ kind: "text", text: NOTICE_TEXT.working[locale] }); return null; }
  if (draft) { await ctx.scheduler.runAfter(0, internal.whatsappNotice.collect, { waId: message.waId, text: message.text }); return null; }
  if (isNoticeRequest(message.text)) { await reply(noticeMenu(locale)); return null; }
  await ctx.scheduler.runAfter(0, internal.whatsappReply.respond, { waId: message.waId, text: message.text });
  return null;
} });

async function noticeButton(ctx: MutationCtx, contact: Doc<"whatsappContacts">, choice: string, locale: WaLocale, now: number, reply: (out: WaOutbound) => Promise<void>) {
  const draft = liveDraft(contact, now);
  if (isNoticeKind(choice)) {
    await ctx.db.patch("whatsappContacts", contact._id, { draft: { kind: choice, status: "collecting", fields: {}, revision: 0, startedAt: now }, updatedAt: now });
    await reply({ kind: "text", text: NOTICE_TEXT.start[locale] });
  } else if (choice === "cancel") {
    await ctx.db.patch("whatsappContacts", contact._id, { draft: undefined, updatedAt: now });
    await reply({ kind: "text", text: NOTICE_TEXT.cancelled[locale] });
  } else if (choice === "create" && draft?.status === "confirming" && !missingFields(draft.kind, draft.fields).length) {
    await ctx.db.patch("whatsappContacts", contact._id, { draft: { ...draft, status: "generating", revision: draft.revision + 1 }, updatedAt: now });
    await reply({ kind: "text", text: NOTICE_TEXT.working[locale] });
    await ctx.scheduler.runAfter(0, internal.whatsappNotice.generate, { waId: contact.waId, revision: draft.revision + 1 });
  } else if (draft?.status === "generating") {
    await reply({ kind: "text", text: NOTICE_TEXT.working[locale] });
  } else {
    // A stale button (draft expired or already finished): offer the notice menu again.
    await reply(noticeMenu(locale));
  }
  return null;
}

export const contact = internalQuery({ args: { waId: v.string() }, handler: async (ctx, args) => {
  const row = await ctx.db.query("whatsappContacts").withIndex("by_wa_id", q => q.eq("waId", args.waId)).unique();
  return row ? { locale: row.locale ?? "hi", consented: Boolean(row.consentedAt), recent: row.recent, draft: liveDraft(row, Date.now()) ?? null } : null;
} });

// Applies newly extracted notice facts if the draft has not changed since they were read.
export const updateDraft = internalMutation({ args: { waId: v.string(), revision: v.number(), fields: v.record(v.string(), v.string()) }, handler: async (ctx, args) => {
  const row = await ctx.db.query("whatsappContacts").withIndex("by_wa_id", q => q.eq("waId", args.waId)).unique();
  const draft = row && liveDraft(row, Date.now());
  if (!row || !draft || draft.revision !== args.revision || draft.status === "generating") return null;
  const allowed = new Set(NOTICES[draft.kind].fields.map(f => f.key));
  const fields = { ...draft.fields };
  for (const [key, value] of Object.entries(args.fields)) if (allowed.has(key) && value.trim()) fields[key] = value.trim().slice(0, NOTICE_LIMITS.fieldChars);
  const status = missingFields(draft.kind, fields).length ? "collecting" as const : "confirming" as const;
  await ctx.db.patch("whatsappContacts", row._id, { draft: { ...draft, fields, status, revision: draft.revision + 1 }, updatedAt: Date.now() });
  return { status, summary: noticeSummary(draft.kind, fields) };
} });

// Ends a generation run: clears the draft after a successful send, or reopens it for another try.
export const finishDraft = internalMutation({ args: { waId: v.string(), revision: v.number(), sent: v.boolean() }, handler: async (ctx, args) => {
  const row = await ctx.db.query("whatsappContacts").withIndex("by_wa_id", q => q.eq("waId", args.waId)).unique();
  if (!row?.draft || row.draft.revision !== args.revision || row.draft.status !== "generating") return null;
  await ctx.db.patch("whatsappContacts", row._id, { draft: args.sent ? undefined : { ...row.draft, status: "confirming", revision: row.draft.revision + 1 }, updatedAt: Date.now() });
  return null;
} });

export const remember = internalMutation({ args: { waId: v.string(), user: v.string(), assistant: v.string() }, handler: async (ctx, args) => {
  const row = await ctx.db.query("whatsappContacts").withIndex("by_wa_id", q => q.eq("waId", args.waId)).unique();
  if (!row) return null;
  const recent = [...row.recent, { role: "user" as const, content: args.user }, { role: "assistant" as const, content: args.assistant }].slice(-WA_LIMITS.recentMessages);
  await ctx.db.patch("whatsappContacts", row._id, { recent, updatedAt: Date.now() });
  return null;
} });
