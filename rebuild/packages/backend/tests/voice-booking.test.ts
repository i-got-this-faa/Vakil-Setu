import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import { parseBookingIntent, parseVoiceResult, EMPTY_PROFILE } from "../convex/lib/voice";
import { istParts, matchSlots, rankLawyers, spokenTime, todayLabel } from "../convex/lib/voiceBooking";

const modules = import.meta.glob("../convex/**/*.ts");
const GUEST = "guest-token-cccccccccccccccccccccccccccccccccccc";
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

/** Midnight India time `days` from today, as a timestamp. */
function istMidnight(days: number) {
  return Date.parse(`${istParts(Date.now() + days * DAY).date}T00:00:00+05:30`);
}

const NONE = { action: "none", option: 0, date: "", hour: -1, partOfDay: "" };
const answer = (booking: Record<string, unknown> = NONE, overrides: Record<string, unknown> = {}) => ({
  reply: "यह कब हुआ?", domain: "property", urgency: "high", city: "Jammu",
  summary: "मकान मालिक ने किरायेदार को बिना नोटिस घर से निकाल दिया।", suggestLawyer: true, booking, ...overrides,
});
const gemini = (body: unknown) => new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(body) }] } }] }));
const isGemini = (call: unknown[]) => String(call[0]).includes("generativelanguage");

/** Gemini answers from a queue; Bhashini "translates" by tagging the text, so tests can see what was translated. */
function setup() {
  const t = convexTest(schema, modules);
  vi.stubEnv("GEMINI_API_KEY", "test-only-noncredential");
  vi.stubEnv("GEMINI_MODEL", "gemini-test-model");
  vi.stubEnv("BHASHINI_API_KEY", "test-bhashini");
  const queue: unknown[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes("bhashini")) {
      const body = JSON.parse(String(init?.body));
      const { targetLanguage } = body.pipelineTasks[0].config.language;
      return new Response(JSON.stringify({ pipelineResponse: [{ taskType: "translation", output: body.inputData.input.map((item: { source: string }) => ({ source: item.source, target: `[${targetLanguage}] ${item.source}` })) }] }));
    }
    return gemini(queue.shift() ?? answer());
  });
  vi.stubGlobal("fetch", fetchMock);
  return { t, fetchMock, queue };
}

async function seedLawyers(t: ReturnType<typeof convexTest>) {
  const tomorrow = istMidnight(1), dayAfter = istMidnight(2);
  return await t.run(async ctx => {
    const reviewerId = await ctx.db.insert("accounts", { clerkSubject: "booking-admin", role: "admin", displayName: "Admin", locale: "en", disabled: false });
    const lawyer = async (name: string, city: string, locales: ("hi" | "doi" | "en")[], domains: ("property" | "criminal")[], starts: number[], disabled = false) => {
      const accountId = await ctx.db.insert("accounts", { clerkSubject: `lawyer-${name}`, role: "advocate", displayName: name, locale: "en", disabled });
      const advocateId = await ctx.db.insert("advocates", { accountId, displayName: name, city, cityKey: city.toLowerCase(), bio: "Synthetic", barRegistration: "PRIVATE", yearsExperience: 10, domains, locales, consultationModes: ["video"], revision: 1, application: { kind: "approved", reviewerId, reviewedAt: Date.now(), reason: "Synthetic approval" } });
      const slotIds = [];
      for (const start of starts) slotIds.push(await ctx.db.insert("slots", { advocateId, start, durationMinutes: 30, end: start + 30 * 60_000, consultationMode: "video", reservation: { kind: "free" } }));
      return { advocateId, slotIds };
    };
    return {
      best: await lawyer("Advocate Asha Raina", "Jammu", ["hi", "doi"], ["property"], [tomorrow + 11 * HOUR, tomorrow + 18 * HOUR, dayAfter + 10 * HOUR, dayAfter + 15 * HOUR]),
      second: await lawyer("Advocate Bilal Khan", "Jammu", ["hi"], ["criminal"], [tomorrow + 12 * HOUR]),
      third: await lawyer("Advocate Carol Dsouza", "Delhi", ["en"], ["property"], [tomorrow + 13 * HOUR]),
      noTime: await lawyer("Advocate Dev Busy", "Jammu", ["hi", "doi"], ["property"], []),
      disabled: await lawyer("Advocate Eve Gone", "Jammu", ["hi", "doi"], ["property"], [tomorrow + 9 * HOUR], true),
    };
  });
}

let request = 0;
const say = (conversationId: Id<"conversations"> | undefined, text: string, locale: "hi" | "en" = "hi") =>
  ({ ...(conversationId ? { conversationId } : {}), locale, requestId: `vb-${++request}`, input: { kind: "text" as const, text }, consent: true as const });
const tap = (conversationId: Id<"conversations">, action: "find" | "choose_lawyer" | "choose_time" | "yes" | "no" | "cancel" | "more_times", option?: number, locale: "hi" | "en" = "en") =>
  ({ conversationId, locale, requestId: `vb-${++request}`, input: { kind: "booking" as const, action, ...(option ? { option } : {}), label: `${action} ${option ?? ""}`.trim() }, consent: true as const });

/** The number a lawyer was read out with, as the person would say it. */
async function optionOf(user: Parameters<typeof lastTurn>[0], conversationId: Id<"conversations">, name: string) {
  const lawyers = (await lastTurn(user, conversationId)).reply.booking!.lawyers as { name: string }[];
  return lawyers.findIndex(lawyer => lawyer.name === name) + 1;
}

async function lastTurn(user: { query: (ref: typeof api.conversations.get, args: { conversationId: Id<"conversations"> }) => Promise<unknown> }, conversationId: Id<"conversations">) {
  const view = await user.query(api.conversations.get, { conversationId }) as { turns: { transcript: string; reply: { kind: string; text?: string; booking?: Record<string, unknown> } }[] };
  return view.turns.at(-1)!;
}

describe("booking helpers", () => {
  it("speaks times in India time and tells the AI what today is", () => {
    const now = Date.parse("2026-11-20T06:00:00Z"); // 11:30 am IST, a Friday
    expect(todayLabel(now)).toBe("2026-11-20 (Friday)");
    expect(spokenTime(Date.parse("2026-11-20T10:30:00Z"), now)).toBe("today at 4 pm");
    expect(spokenTime(Date.parse("2026-11-21T06:00:00Z"), now)).toBe("tomorrow at 11:30 am");
    expect(spokenTime(Date.parse("2026-11-24T04:30:00Z"), now)).toBe("on Tuesday 24 November at 10 am");
  });

  it("matches spoken times to real slots: a day, a part of the day, an exact hour", () => {
    const at = (iso: string) => ({ start: Date.parse(iso) });
    const slots = [at("2026-11-21T05:30:00+05:30".replace("05:30:00", "11:00:00")), at("2026-11-21T18:00:00+05:30"), at("2026-11-22T10:00:00+05:30")];
    expect(matchSlots(slots, { date: "2026-11-21" })).toHaveLength(2);
    expect(matchSlots(slots, { date: "2026-11-21", partOfDay: "evening" })).toEqual([slots[1]]);
    expect(matchSlots(slots, { hour: 10 })).toEqual([slots[2]]);
    expect(matchSlots(slots, { date: "2026-11-21", hour: 16 })).toEqual([]);
    // "This evening at 4" and "4 o'clock" both mean the 4 pm slot.
    const four = [at("2026-11-21T11:00:00+05:30"), at("2026-11-21T16:00:00+05:30")];
    expect(matchSlots(four, { date: "2026-11-21", hour: 16, partOfDay: "evening" })).toEqual([four[1]]);
    expect(matchSlots(four, { date: "2026-11-21", hour: 4 })).toEqual([four[1]]);
    expect(matchSlots(four, { hour: 11 })).toEqual([four[0]]);
  });

  it("ranks lawyers by language (Hindi helps Dogri speakers), kind of problem and city, then the soonest time", () => {
    const lawyer = (displayName: string, locales: string[], domains: string[], city: string, nextStart: number) => ({ displayName, locales, domains, city, nextStart });
    const ranked = rankLawyers([
      lawyer("Far", ["en"], ["property"], "Delhi", 1),
      lawyer("Hindi", ["hi"], ["criminal"], "Jammu", 3),
      lawyer("Dogri", ["doi"], ["criminal"], "Jammu", 5),
      lawyer("Dogri soon", ["doi"], ["criminal"], "Jammu", 4),
    ], { locale: "doi", domain: "property", city: " jammu " });
    expect(ranked.map(l => l.displayName)).toEqual(["Dogri soon", "Dogri", "Hindi", "Far"]);
  });

  it("reads the AI's booking field strictly; anything odd counts as an ordinary message", () => {
    expect(parseBookingIntent({ action: "choose_time", option: 0, date: "2026-11-21", hour: 16, partOfDay: "evening" })).toEqual({ action: "choose_time", date: "2026-11-21", hour: 16, partOfDay: "evening" });
    expect(parseBookingIntent({ action: "choose_lawyer", option: 2, date: "", hour: -1, partOfDay: "" })).toEqual({ action: "choose_lawyer", option: 2 });
    expect(parseBookingIntent({ action: "none" })).toBeNull();
    expect(parseBookingIntent({ action: "book_everything" })).toBeNull();
    expect(parseBookingIntent({ action: "choose_time", date: "tomorrow", hour: 99 })).toEqual({ action: "choose_time" });
    // Older answers without the field still parse.
    expect(parseVoiceResult({ transcript: "x", reply: "y", city: "", summary: "", suggestLawyer: false }, EMPTY_PROFILE)?.booking).toBeNull();
  });
});

describe("booking a lawyer by voice", () => {
  it("books end to end by speaking: find, choose a lawyer, say a time, hear the summary, say yes", async () => {
    const { t, fetchMock, queue } = setup();
    const lawyers = await seedLawyers(t);
    const user = t.withIdentity({ subject: "voice-booker" });
    await user.mutation(api.accounts.ensure, { role: "user", displayName: "Ravi", locale: "hi" });

    queue.push(answer());
    const first = await user.action(api.voice.send, say(undefined, "मकान मालिक ने बिना नोटिस निकाल दिया"));
    const conversationId = first.conversationId as Id<"conversations">;

    // 1. Find: the server picks real lawyers with free times and ranks them for this person.
    // The AI wrongly adds booking talk to the summary; the problem summary the lawyer reads stays as it was.
    queue.push(answer({ action: "find", option: 0, date: "", hour: -1, partOfDay: "" }, { reply: "ज़रूर।", summary: "उपयोगकर्ता वकील बुक करना चाहता है।" }));
    await user.action(api.voice.send, say(conversationId, "मुझे वकील चाहिए"));
    let turn = await lastTurn(user, conversationId);
    expect(turn.reply.booking).toMatchObject({ stage: "lawyer" });
    const offered = (turn.reply.booking!.lawyers as { name: string }[]).map(l => l.name);
    expect(offered).toEqual(["Advocate Asha Raina", "Advocate Bilal Khan", "Advocate Carol Dsouza"]); // no lawyer without times, no disabled one
    expect(turn.reply.text).toMatch(/^\[hi\] I found 3 lawyers.*number 1, Advocate Asha Raina/);

    // The AI is told what was offered, so "the first one" can be understood.
    queue.push(answer({ action: "choose_lawyer", option: 1, date: "", hour: -1, partOfDay: "" }, { reply: "ठीक है।" }));
    await user.action(api.voice.send, say(conversationId, "पहले वाले"));
    const prompt = JSON.parse(String((fetchMock.mock.calls.filter(isGemini).at(-1) as unknown as [string, RequestInit])[1].body)).systemInstruction.parts[0].text as string;
    expect(prompt).toContain('"number":1,"name":"Advocate Asha Raina"');
    expect(prompt).toContain(`Today in India: ${todayLabel(Date.now())}`);
    turn = await lastTurn(user, conversationId);
    expect(turn.reply.booking).toMatchObject({ stage: "time", lawyerName: "Advocate Asha Raina" });
    expect(turn.reply.booking!.times).toHaveLength(3);

    // 3. A spoken time: "tomorrow evening" matches exactly one real slot, so the summary is read for consent.
    const tomorrow = istParts(Date.now() + DAY).date;
    queue.push(answer({ action: "choose_time", option: 0, date: tomorrow, hour: -1, partOfDay: "evening" }, { reply: "ठीक है।" }));
    await user.action(api.voice.send, say(conversationId, "कल शाम"));
    turn = await lastTurn(user, conversationId);
    expect(turn.reply.booking).toMatchObject({ stage: "confirm", lawyerName: "Advocate Asha Raina", start: istMidnight(1) + 18 * HOUR, summary: answer().summary });
    // The summary is already in the reply language (Hindi), so only the English parts are translated.
    expect(turn.reply.text).toContain(`[hi] This is what I will send to Advocate Asha Raina: ${answer().summary} [hi] Shall I book`);
    expect(await t.run(async ctx => await ctx.db.query("bookings").first())).toBeNull();

    // 4. Yes: booked through the same rules as the booking screen, with consent to this summary and lawyer.
    queue.push(answer({ action: "yes", option: 0, date: "", hour: -1, partOfDay: "" }, { reply: "ठीक है।" }));
    await user.action(api.voice.send, say(conversationId, "हाँ"));
    turn = await lastTurn(user, conversationId);
    expect(turn.reply.booking).toMatchObject({ stage: "booked", lawyerName: "Advocate Asha Raina" });
    const booking = await t.run(async ctx => await ctx.db.query("bookings").first());
    expect(booking).toMatchObject({ state: "pending", advocateId: lawyers.best.advocateId, slotId: lawyers.best.slotIds[1], consent: { recipientAdvocateId: lawyers.best.advocateId, granted: true } });
    expect((await t.run(async ctx => await ctx.db.get(lawyers.best.slotIds[1]!)))?.reservation.kind).toBe("reserved");
    expect((await t.run(async ctx => await ctx.db.get(conversationId)))?.booking).toBeUndefined();
    // The case the lawyer reads is the problem, not the booking chatter.
    const legalCase = await t.run(async ctx => await ctx.db.get(booking!.caseId));
    expect(legalCase?.text).toBe("मकान मालिक ने बिना नोटिस निकाल दिया");
    // The voice assistant now knows about the appointment.
    const view = await user.query(api.conversations.get, { conversationId });
    expect(view?.bookings[0]).toMatchObject({ advocateName: "Advocate Asha Raina", state: "pending" });
  });

  it("taps on the booking cards work without any AI call, and 'more' reads later times", async () => {
    const { t, fetchMock, queue } = setup();
    const lawyers = await seedLawyers(t);
    const user = t.withIdentity({ subject: "tapper" });
    await user.mutation(api.accounts.ensure, { role: "user", displayName: "Meera", locale: "en" });
    queue.push(answer({ ...NONE }, { reply: "When did this happen?", summary: "My landlord evicted me without notice." }));
    const first = await user.action(api.voice.send, say(undefined, "My landlord threw me out", "en"));
    const conversationId = first.conversationId as Id<"conversations">;
    const aiCalls = fetchMock.mock.calls.filter(isGemini).length;

    await user.action(api.voice.send, tap(conversationId, "find"));
    // An English speaker hears the English-speaking lawyer first; they pick Asha Raina instead.
    expect((await lastTurn(user, conversationId)).reply.booking!.lawyers).toMatchObject([{ name: "Advocate Carol Dsouza" }, { name: "Advocate Asha Raina" }, { name: "Advocate Bilal Khan" }]);
    await user.action(api.voice.send, tap(conversationId, "choose_lawyer", await optionOf(user, conversationId, "Advocate Asha Raina")));
    await user.action(api.voice.send, tap(conversationId, "more_times"));
    let turn = await lastTurn(user, conversationId);
    expect(turn.reply.booking!.times).toEqual([istMidnight(2) + 15 * HOUR]);
    expect(turn.reply.text).toContain("Advocate Asha Raina is available number 1, on");
    await user.action(api.voice.send, tap(conversationId, "choose_time", 1));
    await user.action(api.voice.send, tap(conversationId, "yes"));
    turn = await lastTurn(user, conversationId);
    expect(turn).toMatchObject({ transcript: "yes", reply: { booking: { stage: "booked" } } });
    expect(turn.reply.text).toMatch(/^Done\. I have sent your request to Advocate Asha Raina/);
    expect((await t.run(async ctx => await ctx.db.query("bookings").first()))?.slotId).toBe(lawyers.best.slotIds[3]);
    // English needs no translation, and taps need no AI.
    expect(fetchMock.mock.calls.filter(isGemini)).toHaveLength(aiCalls);
    expect(fetchMock.mock.calls.some(call => String(call[0]).includes("bhashini"))).toBe(false);
  });

  it("asks guests to sign in, and asks to hear the problem before finding a lawyer", async () => {
    const { t, queue } = setup();
    await seedLawyers(t);
    queue.push(answer({ action: "find", option: 0, date: "", hour: -1, partOfDay: "" }));
    const guest = await t.action(api.voice.send, { guestToken: GUEST, ...say(undefined, "मुझे वकील चाहिए") });
    const guestView = await t.query(api.conversations.get, { conversationId: guest.conversationId as Id<"conversations">, guestToken: GUEST });
    expect(guestView?.turns[0]?.reply).toMatchObject({ booking: { stage: "sign_in" } });

    const user = t.withIdentity({ subject: "new-user" });
    await user.mutation(api.accounts.ensure, { role: "user", displayName: "New", locale: "en" });
    const started = await user.mutation(api.conversations.startNew, { locale: "en", consent: true });
    await user.action(api.voice.send, tap(started, "find"));
    expect((await lastTurn(user, started)).reply.booking).toMatchObject({ stage: "describe_first" });
    expect(await t.run(async ctx => await ctx.db.query("bookings").first())).toBeNull();
  });

  it("never books a time that is gone: offers other times instead; cancel and unknown numbers are safe", async () => {
    const { t, queue } = setup();
    const lawyers = await seedLawyers(t);
    const user = t.withIdentity({ subject: "careful" });
    await user.mutation(api.accounts.ensure, { role: "user", displayName: "Sam", locale: "en" });
    queue.push(answer({ ...NONE }, { reply: "I see.", summary: "Landlord eviction." }));
    const conversationId = (await user.action(api.voice.send, say(undefined, "Landlord problem", "en"))).conversationId as Id<"conversations">;

    await user.action(api.voice.send, tap(conversationId, "find"));
    await user.action(api.voice.send, tap(conversationId, "choose_lawyer", 9));
    expect((await lastTurn(user, conversationId)).reply).toMatchObject({ booking: { stage: "lawyer" } });
    expect((await lastTurn(user, conversationId)).reply.text).toMatch(/^Please tell me the number of the lawyer/);

    await user.action(api.voice.send, tap(conversationId, "choose_lawyer", await optionOf(user, conversationId, "Advocate Bilal Khan")));
    await user.action(api.voice.send, tap(conversationId, "choose_time", 1));
    expect((await lastTurn(user, conversationId)).reply.booking).toMatchObject({ stage: "confirm", lawyerName: "Advocate Bilal Khan" });
    // Someone else takes the time before the person says yes.
    await t.run(async ctx => { await ctx.db.patch(lawyers.second.slotIds[0]!, { start: Date.now() - 1000 }); });
    await user.action(api.voice.send, tap(conversationId, "yes"));
    const turn = await lastTurn(user, conversationId);
    expect(turn.reply.text).toMatch(/^Sorry, that time was just taken by someone else\. Advocate Bilal Khan has no available time right now/);
    expect(await t.run(async ctx => await ctx.db.query("bookings").first())).toBeNull();

    await user.action(api.voice.send, tap(conversationId, "cancel"));
    expect((await lastTurn(user, conversationId)).reply.booking).toMatchObject({ stage: "cancelled" });
    expect((await t.run(async ctx => await ctx.db.get(conversationId)))?.booking).toBeUndefined();
    // With nothing in progress, "yes" does not book anything; it starts a fresh search.
    await user.action(api.voice.send, tap(conversationId, "yes"));
    expect((await lastTurn(user, conversationId)).reply.booking).toMatchObject({ stage: "lawyer" });
    expect(await t.run(async ctx => await ctx.db.query("bookings").first())).toBeNull();
  });

  it("an old booking in progress expires: yes no longer books it", async () => {
    const { t, queue } = setup();
    await seedLawyers(t);
    const user = t.withIdentity({ subject: "slow" });
    await user.mutation(api.accounts.ensure, { role: "user", displayName: "Slow", locale: "en" });
    queue.push(answer({ ...NONE }, { reply: "I see.", summary: "Landlord eviction." }));
    const conversationId = (await user.action(api.voice.send, say(undefined, "Landlord problem", "en"))).conversationId as Id<"conversations">;
    await user.action(api.voice.send, tap(conversationId, "find"));
    await user.action(api.voice.send, tap(conversationId, "choose_lawyer", 1));
    await user.action(api.voice.send, tap(conversationId, "choose_time", 1));
    await t.run(async ctx => {
      const conversation = (await ctx.db.get(conversationId))!;
      await ctx.db.patch(conversationId, { booking: { ...conversation.booking!, expiresAt: Date.now() - 1 } });
    });
    await user.action(api.voice.send, tap(conversationId, "yes"));
    expect((await lastTurn(user, conversationId)).reply.booking).toMatchObject({ stage: "lawyer" });
    expect(await t.run(async ctx => await ctx.db.query("bookings").first())).toBeNull();
  });
});

describe("demo consultation fee (PAYMENTS_MODE=demo)", () => {
  async function bookedByVoice(t: ReturnType<typeof convexTest>, queue: unknown[], subject: string) {
    await seedLawyers(t);
    const user = t.withIdentity({ subject });
    await user.mutation(api.accounts.ensure, { role: "user", displayName: "Payer", locale: "en" });
    queue.push(answer({ ...NONE }, { reply: "I see.", summary: "Landlord eviction." }));
    const conversationId = (await user.action(api.voice.send, say(undefined, "Landlord problem", "en"))).conversationId as Id<"conversations">;
    await user.action(api.voice.send, tap(conversationId, "find"));
    await user.action(api.voice.send, tap(conversationId, "choose_lawyer", 1));
    await user.action(api.voice.send, tap(conversationId, "choose_time", 1));
    await user.action(api.voice.send, tap(conversationId, "yes"));
    return { user, conversationId };
  }

  it("after booking, asks for the fee by voice; yes records a clearly marked test payment", async () => {
    const { t, queue } = setup();
    vi.stubEnv("PAYMENTS_MODE", "demo");
    const { user, conversationId } = await bookedByVoice(t, queue, "payer");
    let turn = await lastTurn(user, conversationId);
    expect(turn.reply.booking).toMatchObject({ stage: "booked", fee: 500 });
    expect(turn.reply.text).toMatch(/The consultation fee is 500 rupees\. Shall I pay it now\?/);
    expect((await t.run(async ctx => await ctx.db.query("bookings").first()))?.payment).toBeUndefined();

    await user.action(api.voice.send, tap(conversationId, "yes"));
    turn = await lastTurn(user, conversationId);
    expect(turn.reply.booking).toMatchObject({ stage: "paid", fee: 500 });
    const booking = await t.run(async ctx => await ctx.db.query("bookings").first());
    expect(booking?.payment).toMatchObject({ status: "paid", test: true, amount: 500, currency: "INR", method: "upi" });
    expect(booking?.payment?.reference).toMatch(/^TEST-/);
    expect(booking?.state).toBe("pending");
    // Saying yes again does not pay twice or book again.
    await user.action(api.voice.send, tap(conversationId, "yes"));
    expect(await t.run(async ctx => (await ctx.db.query("bookings").collect()).length)).toBe(1);
    const view = await user.query(api.conversations.get, { conversationId });
    expect(view?.bookings[0]).toMatchObject({ paid: { amount: 500, test: true } });
  });

  it("no to the fee leaves the booking unpaid; the fee screen pays for your own booking only, and only in demo mode", async () => {
    const { t, queue } = setup();
    vi.stubEnv("PAYMENTS_MODE", "demo");
    const { user, conversationId } = await bookedByVoice(t, queue, "later-payer");
    await user.action(api.voice.send, tap(conversationId, "no"));
    expect((await lastTurn(user, conversationId)).reply.text).toMatch(/You can pay later/);
    const bookingId = (await t.run(async ctx => await ctx.db.query("bookings").first()))!._id;
    expect(await user.query(api.payments.forBooking, { bookingId })).toMatchObject({ enabled: true, fee: 500, payment: null });

    const stranger = t.withIdentity({ subject: "stranger-payer" });
    await stranger.mutation(api.accounts.ensure, { role: "user", displayName: "Stranger", locale: "en" });
    expect(await stranger.query(api.payments.forBooking, { bookingId })).toBeNull();
    await expect(stranger.mutation(api.payments.payDemo, { bookingId, method: "card" })).rejects.toThrow(/not found/i);

    vi.stubEnv("PAYMENTS_MODE", "");
    await expect(user.mutation(api.payments.payDemo, { bookingId, method: "card" })).rejects.toThrow(/not available/i);
    vi.stubEnv("PAYMENTS_MODE", "demo");
    const paid = await user.mutation(api.payments.payDemo, { bookingId, method: "card" });
    expect(paid).toMatchObject({ test: true, method: "card", amount: 500 });
    expect(await user.mutation(api.payments.payDemo, { bookingId, method: "upi" })).toEqual(paid);
  });
});

describe("no clashing times", () => {
  it("never offers a time that clashes with the person's own appointment", async () => {
    const { t, queue } = setup();
    const lawyers = await seedLawyers(t);
    // Bilal also has a slot at 11:00 tomorrow, the same time as Asha's first slot.
    await t.run(async ctx => {
      const start = istMidnight(1) + 11 * HOUR;
      await ctx.db.insert("slots", { advocateId: lawyers.second.advocateId, start, durationMinutes: 30, end: start + 30 * 60_000, consultationMode: "video", reservation: { kind: "free" } });
    });
    const user = t.withIdentity({ subject: "double-booker" });
    await user.mutation(api.accounts.ensure, { role: "user", displayName: "Two", locale: "en" });
    queue.push(answer({ ...NONE }, { reply: "I see.", summary: "Landlord eviction." }));
    const conversationId = (await user.action(api.voice.send, say(undefined, "Landlord problem", "en"))).conversationId as Id<"conversations">;
    await user.action(api.voice.send, tap(conversationId, "find"));
    await user.action(api.voice.send, tap(conversationId, "choose_lawyer", await optionOf(user, conversationId, "Advocate Asha Raina")));
    await user.action(api.voice.send, tap(conversationId, "choose_time", 1)); // tomorrow 11:00
    await user.action(api.voice.send, tap(conversationId, "yes"));
    expect((await lastTurn(user, conversationId)).reply.booking).toMatchObject({ stage: "booked" });

    await user.action(api.voice.send, tap(conversationId, "find"));
    // Bilal's next time is now 12:00, not the clashing 11:00.
    const offered = (await lastTurn(user, conversationId)).reply.booking!.lawyers as { name: string; nextStart: number }[];
    expect(offered.find(l => l.name === "Advocate Bilal Khan")?.nextStart).toBe(istMidnight(1) + 12 * HOUR);
    await user.action(api.voice.send, tap(conversationId, "choose_lawyer", await optionOf(user, conversationId, "Advocate Bilal Khan")));
    expect((await lastTurn(user, conversationId)).reply.booking!.times).toEqual([istMidnight(1) + 12 * HOUR]);
  });
});
