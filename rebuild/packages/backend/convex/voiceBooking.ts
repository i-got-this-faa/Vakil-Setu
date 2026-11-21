import { ConvexError, v } from "convex/values";
import type { Infer } from "convex/values";
import type { VoiceLocale } from "@legal-setu/domain";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { approvedAdvocate } from "./lib/access";
import { requestBooking } from "./lib/bookingRequest";
import { CONSULTATION_FEE_INR, demoPaymentsEnabled, recordDemoPayment } from "./lib/demoPayment";
import { prepareConversationCase } from "./lib/voiceCase";
import { bookingAction } from "./lib/voice";
import type { BookingCard, BookingDraft } from "./lib/voice";
import { matchSlots, numbered, rankLawyers, spokenTime } from "./lib/voiceBooking";
import { replyLocaleFor } from "./lib/voiceLanguages";

/**
 * Booking a lawyer by voice, one spoken step at a time. The AI only recognised which step the person meant;
 * everything said here comes from the database (real lawyers, real free times), and the booking itself goes
 * through exactly the same rules as the booking screen. Messages are English (plus the person's own summary);
 * voice.send translates them into the person's language before they are spoken.
 */

const DRAFT_MS = 15 * 60 * 1000;
const PER_TURN = 3;
const SLOTS_SCANNED = 60;

/** A piece of the spoken reply and the language it is written in. */
type Segment = { text: string; lang: VoiceLocale };
type StepResult = { segments: Segment[]; card?: BookingCard };
type Ctx = MutationCtx;
type Conversation = Doc<"conversations">;

const en = (text: string): Segment => ({ text, lang: "en" });

async function freeSlots(ctx: Ctx, advocate: Doc<"advocates">, now: number, limit = SLOTS_SCANNED) {
  const slots = await ctx.db.query("slots").withIndex("by_advocate_start", q => q.eq("advocateId", advocate._id).gt("start", now)).take(limit * 2);
  return slots.filter(slot => slot.reservation.kind === "free" && advocate.consultationModes.includes(slot.consultationMode)).slice(0, limit);
}

async function saveDraft(ctx: Ctx, conversation: Conversation, draft: BookingDraft | undefined) {
  await ctx.db.patch(conversation._id, { booking: draft });
}

/** The problem must be told first, so the right lawyer can be found and told about it. */
async function problemKnown(ctx: Ctx, conversation: Conversation) {
  if (conversation.profile.summary.trim()) return true;
  const turns = await ctx.db.query("conversationTurns").withIndex("by_conversation", q => q.eq("conversationId", conversation._id)).order("desc").take(30);
  return turns.some(turn => turn.reply.kind === "reply" && turn.inputKind !== "booking" && turn.transcript.trim() && !turn.reply.booking);
}

async function offerLawyers(ctx: Ctx, conversation: Conversation, now: number, lead = "", exclude: readonly Id<"advocates">[] = []): Promise<StepResult> {
  if (!(await problemKnown(ctx, conversation))) {
    return { segments: [en("First tell me a little about your problem, so I can find the right lawyer and tell them about it. After that, just say: book a lawyer.")], card: { stage: "describe_first" } };
  }
  const candidates = await ctx.db.query("advocates").withIndex("by_status_city", q => q.eq("application.kind", "approved")).take(500);
  const available = [];
  for (const candidate of candidates) {
    if (exclude.includes(candidate._id) || !(await approvedAdvocate(ctx, candidate._id))) continue;
    const next = (await freeSlots(ctx, candidate, now, 1))[0];
    if (next) available.push({ ...candidate, nextStart: next.start });
  }
  const ranked = rankLawyers(available, { locale: conversation.locale, domain: conversation.profile.domain, city: conversation.profile.city }).slice(0, PER_TURN);
  if (!ranked.length) {
    // Asked for different lawyers but there are no others: offer everyone again rather than nobody.
    if (exclude.length) return await offerLawyers(ctx, conversation, now, lead);
    await saveDraft(ctx, conversation, undefined);
    return { segments: [en(`${lead}Sorry, no lawyer has a free time right now. Please try again later.`)], card: { stage: "none_available" } };
  }
  await saveDraft(ctx, conversation, { stage: "lawyer", lawyers: ranked.map(lawyer => ({ advocateId: lawyer._id, name: lawyer.displayName })), times: [], timeOffset: 0, expiresAt: now + DRAFT_MS });
  const list = numbered(ranked.map(lawyer => `${lawyer.displayName} from ${lawyer.city}, ${lawyer.yearsExperience} years of experience, free ${spokenTime(lawyer.nextStart, now)}`));
  const found = ranked.length === 1 ? "I found one lawyer who can help you" : `I found ${ranked.length} lawyers who can help you`;
  return {
    segments: [en(`${lead}${found}: ${list}. Which lawyer would you like? Say the number or the name.`)],
    card: { stage: "lawyer", lawyers: ranked.map(lawyer => ({ name: lawyer.displayName, city: lawyer.city, yearsExperience: lawyer.yearsExperience, locales: lawyer.locales, nextStart: lawyer.nextStart })) },
  };
}

async function offerTimes(ctx: Ctx, conversation: Conversation, draft: BookingDraft, advocate: Doc<"advocates">, offset: number, now: number, lead = ""): Promise<StepResult> {
  const slots = await freeSlots(ctx, advocate, now);
  if (!slots.length) {
    await saveDraft(ctx, conversation, { ...draft, stage: "lawyer", advocateId: undefined, times: [], timeOffset: 0, slotId: undefined, expiresAt: now + DRAFT_MS });
    return { segments: [en(`${lead}${advocate.displayName} has no free time right now. Would you like another lawyer?`)], card: { stage: "none_available", lawyerName: advocate.displayName } };
  }
  let start = offset;
  if (start >= slots.length) { lead += "There are no later times. "; start = 0; }
  const page = slots.slice(start, start + PER_TURN);
  await saveDraft(ctx, conversation, { ...draft, stage: "time", advocateId: advocate._id, times: page.map(slot => ({ slotId: slot._id, start: slot.start })), timeOffset: start, slotId: undefined, caseId: undefined, summaryVersion: undefined, expiresAt: now + DRAFT_MS });
  const more = slots.length > start + PER_TURN ? ", or say more for other times" : "";
  return {
    segments: [en(`${lead}${advocate.displayName} is free ${numbered(page.map(slot => spokenTime(slot.start, now)))}. Which time suits you? Say the number, or a day and time${more}.`)],
    card: { stage: "time", lawyerName: advocate.displayName, times: page.map(slot => slot.start) },
  };
}

async function confirmTime(ctx: Ctx, conversation: Conversation, account: Doc<"accounts">, draft: BookingDraft, advocate: Doc<"advocates">, slot: Doc<"slots">, now: number): Promise<StepResult> {
  let prepared;
  try {
    prepared = await prepareConversationCase(ctx, account, conversation);
  } catch (error) {
    if (!(error instanceof ConvexError)) throw error;
    return { segments: [en("First tell me a little about your problem, so the lawyer knows how to help. After that, just say: book a lawyer.")], card: { stage: "describe_first" } };
  }
  const fresh = (await ctx.db.get(conversation._id))!;
  await saveDraft(ctx, fresh, { ...draft, stage: "confirm", advocateId: advocate._id, slotId: slot._id, caseId: prepared.caseId, summaryVersion: prepared.summaryVersion, expiresAt: now + DRAFT_MS });
  const when = spokenTime(slot.start, now);
  return {
    segments: [
      en(`This is what I will send to ${advocate.displayName}:`),
      { text: prepared.summary.text, lang: replyLocaleFor(conversation.locale) },
      en(`Shall I book your appointment with ${advocate.displayName} ${when}? Please say yes or no.`),
    ],
    card: { stage: "confirm", lawyerName: advocate.displayName, start: slot.start, summary: prepared.summary.text },
  };
}

async function chooseTime(ctx: Ctx, conversation: Conversation, account: Doc<"accounts">, draft: BookingDraft, advocate: Doc<"advocates">, intent: Intent, now: number): Promise<StepResult> {
  const slots = await freeSlots(ctx, advocate, now);
  if (intent.option !== undefined) {
    const offered = draft.times[intent.option - 1];
    if (!offered) return await offerTimes(ctx, conversation, draft, advocate, draft.timeOffset, now, `Please choose one of these times. `);
    const slot = slots.find(candidate => candidate._id === offered.slotId);
    if (!slot) return await offerTimes(ctx, conversation, draft, advocate, 0, now, "Sorry, that time was just taken. ");
    return await confirmTime(ctx, conversation, account, draft, advocate, slot, now);
  }
  if (intent.date || intent.hour !== undefined || intent.partOfDay) {
    const matches = matchSlots(slots, { date: intent.date, hour: intent.hour, partOfDay: intent.partOfDay });
    const first = matches[0];
    if (!first) return await offerTimes(ctx, conversation, draft, advocate, 0, now, `${advocate.displayName} is not free then. `);
    // An exact hour, or only one time that fits: that is their choice. Otherwise read the times that fit.
    if (matches.length === 1 || intent.hour !== undefined) return await confirmTime(ctx, conversation, account, draft, advocate, first, now);
    const page = matches.slice(0, PER_TURN);
    await saveDraft(ctx, conversation, { ...draft, stage: "time", advocateId: advocate._id, times: page.map(slot => ({ slotId: slot._id, start: slot.start })), timeOffset: 0, expiresAt: now + DRAFT_MS });
    return {
      segments: [en(`${advocate.displayName} is free then ${numbered(page.map(slot => spokenTime(slot.start, now)))}. Which time suits you? Say the number.`)],
      card: { stage: "time", lawyerName: advocate.displayName, times: page.map(slot => slot.start) },
    };
  }
  return await offerTimes(ctx, conversation, draft, advocate, draft.timeOffset, now, "Please tell me which time suits you. ");
}

async function book(ctx: Ctx, conversation: Conversation, account: Doc<"accounts">, draft: BookingDraft, advocate: Doc<"advocates">, now: number): Promise<StepResult> {
  const slot = draft.slotId ? await ctx.db.get(draft.slotId) : null;
  if (!slot || !draft.caseId || !draft.summaryVersion) return await offerTimes(ctx, conversation, draft, advocate, 0, now, "Please choose the time again. ");
  let bookingId: Id<"bookings">;
  try {
    bookingId = await requestBooking(ctx, account, {
      slotId: slot._id, caseId: draft.caseId, summaryVersion: draft.summaryVersion,
      idempotencyKey: `voice:${conversation._id}:${slot._id}:${draft.summaryVersion}`,
      // The person heard the summary and the lawyer's name, and said yes: that is their consent to share it.
      consent: { recipientAdvocateId: advocate._id, summaryVersion: draft.summaryVersion, granted: true },
    });
  } catch (error) {
    if (!(error instanceof ConvexError)) throw error;
    const code = (error.data as { code?: string } | undefined)?.code;
    if (code === "NOT_APPROVED") return await offerLawyers(ctx, conversation, now, `Sorry, ${advocate.displayName} is not taking new requests. `, [advocate._id]);
    if (code === "SLOT_UNAVAILABLE") return await offerTimes(ctx, conversation, draft, advocate, 0, now, "Sorry, that time was just taken by someone else. ");
    if (code === "CONFLICT") return await offerTimes(ctx, conversation, draft, advocate, 0, now, "You already have another appointment at that time, or your problem details changed. Please choose a time again. ");
    return { segments: [en("Sorry, I could not book it right now. Please say yes again in a moment.")], card: { stage: "confirm", lawyerName: advocate.displayName, start: slot.start } };
  }
  const sent = `Done. I have sent your request to ${advocate.displayName} for ${spokenTime(slot.start, now)}.`;
  if (!demoPaymentsEnabled(process.env)) {
    await saveDraft(ctx, conversation, undefined);
    return {
      segments: [en(`${sent} The lawyer will reply soon, and I will tell you here. You can keep asking me anything.`)],
      card: { stage: "booked", lawyerName: advocate.displayName, start: slot.start, bookingId },
    };
  }
  // Demo payments: offer to take the consultation fee now, by voice.
  await saveDraft(ctx, conversation, { ...draft, stage: "pay", bookingId, expiresAt: now + DRAFT_MS });
  return {
    segments: [en(`${sent} The consultation fee is ${CONSULTATION_FEE_INR} rupees. Shall I pay it now? Please say yes or no.`)],
    card: { stage: "booked", lawyerName: advocate.displayName, start: slot.start, bookingId, fee: CONSULTATION_FEE_INR },
  };
}

async function pay(ctx: Ctx, conversation: Conversation, account: Doc<"accounts">, draft: BookingDraft, now: number): Promise<StepResult> {
  const booking = draft.bookingId ? await ctx.db.get(draft.bookingId) : null;
  await saveDraft(ctx, conversation, undefined);
  if (!booking) return { segments: [en("Sorry, I could not find that appointment.")] };
  const advocate = await ctx.db.get(booking.advocateId);
  try {
    const payment = await recordDemoPayment(ctx, account, booking._id, "upi");
    return {
      segments: [en(`Payment of ${payment.amount} rupees is done. Your receipt number is ${payment.reference.split("").join(" ")}. ${advocate?.displayName ?? "The lawyer"} will reply soon, and I will tell you here.`)],
      card: { stage: "paid", lawyerName: advocate?.displayName, start: booking.start, bookingId: booking._id, fee: payment.amount, reference: payment.reference },
    };
  } catch (error) {
    if (!(error instanceof ConvexError)) throw error;
    return { segments: [en("Sorry, the payment could not be done right now. You can pay later from your appointment.")] };
  }
}

const intent = v.object({
  action: bookingAction,
  option: v.optional(v.number()),
  date: v.optional(v.string()),
  hour: v.optional(v.number()),
  partOfDay: v.optional(v.union(v.literal("morning"), v.literal("afternoon"), v.literal("evening"))),
});
type Intent = Infer<typeof intent>;

/** One booking step for the turn being answered. Returns what to say (English segments) and the card to show. */
export const step = internalMutation({ args: { turnId: v.id("conversationTurns"), intent }, handler: async (ctx, args): Promise<StepResult | null> => {
  const turn = await ctx.db.get(args.turnId);
  if (!turn || turn.reply.kind !== "pending") return null;
  const conversation = await ctx.db.get(turn.conversationId);
  if (!conversation) return null;
  const now = Date.now();
  const { action } = args.intent;
  const draft = conversation.booking && conversation.booking.expiresAt > now ? conversation.booking : undefined;

  if (action === "cancel" && draft?.stage === "pay") {
    await saveDraft(ctx, conversation, undefined);
    return { segments: [en("Okay, I will not take the payment now. Your appointment request is still sent. You can pay later from your appointment.")] };
  }
  if (action === "cancel") {
    await saveDraft(ctx, conversation, undefined);
    return { segments: [en("Okay, I have stopped the booking. Whenever you want, just say: book a lawyer.")], card: { stage: "cancelled" } };
  }
  const account = conversation.accountId ? await ctx.db.get(conversation.accountId) : null;
  if (!account || account.role !== "user" || account.disabled) {
    return { segments: [en("To book a lawyer, please sign in first with the sign in button at the top. After that, just say: book a lawyer.")], card: { stage: "sign_in" } };
  }
  const chosen = draft?.advocateId ? await approvedAdvocate(ctx, draft.advocateId) : null;
  if (draft?.advocateId && !chosen) return await offerLawyers(ctx, conversation, now, "Sorry, that lawyer is not taking new requests. ", [draft.advocateId]);

  switch (action) {
    case "find":
      return await offerLawyers(ctx, conversation, now);
    case "other_lawyer":
      return await offerLawyers(ctx, conversation, now, "", draft?.lawyers.map(lawyer => lawyer.advocateId) ?? []);
    case "choose_lawyer": {
      const picked = args.intent.option !== undefined ? draft?.lawyers[args.intent.option - 1] : undefined;
      if (!draft || !picked) return await offerLawyers(ctx, conversation, now, draft ? "Please tell me the number of the lawyer. " : "");
      const advocate = await approvedAdvocate(ctx, picked.advocateId);
      if (!advocate) return await offerLawyers(ctx, conversation, now, `Sorry, ${picked.name} is not taking new requests. `, [picked.advocateId]);
      return await offerTimes(ctx, conversation, draft, advocate, 0, now);
    }
    case "choose_time":
      if (!draft || !chosen) return await offerLawyers(ctx, conversation, now, draft ? "First choose a lawyer. " : "");
      return await chooseTime(ctx, conversation, account, draft, chosen, args.intent, now);
    case "more_times":
    case "other_time":
      if (!draft || !chosen) return await offerLawyers(ctx, conversation, now);
      return await offerTimes(ctx, conversation, draft, chosen, action === "more_times" ? draft.timeOffset + PER_TURN : 0, now);
    case "yes":
      if (draft?.stage === "pay") return await pay(ctx, conversation, account, draft, now);
      if (draft?.stage === "confirm" && chosen) return await book(ctx, conversation, account, draft, chosen, now);
      if (draft?.stage === "time" && chosen) return await offerTimes(ctx, conversation, draft, chosen, draft.timeOffset, now, "Please tell me which time suits you. ");
      // "Yes" to "shall I book a lawyer for you?" starts the booking.
      return await offerLawyers(ctx, conversation, now, draft?.stage === "lawyer" ? "Please tell me the number of the lawyer. " : "");
    case "no":
      if (draft?.stage === "pay") {
        await saveDraft(ctx, conversation, undefined);
        return { segments: [en("Okay. Your appointment request is sent. You can pay later from your appointment.")] };
      }
      if (draft?.stage === "confirm" && chosen) return await offerTimes(ctx, conversation, draft, chosen, 0, now, "Okay, I have not booked it. ");
      return { segments: [en("Okay. If you want a different lawyer or a different time, just tell me. To stop booking, say cancel.")] };
  }
} });
