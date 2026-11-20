/**
 * DEMO MODE ONLY (EXPO_PUBLIC_DEMO_MODE=1). A scripted, in-memory stand-in for the Convex backend so the
 * real screens can be recorded for a presentation: one Dogri conversation, Dogri-speaking lawyers,
 * booking and a consultation-fee payment. Nothing here talks to a server; nothing is persisted.
 */
import { getFunctionName } from "convex/server";

type Listener = () => void;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const IST_OFFSET = 5.5 * HOUR;
/** 11:00 and 16:00 IST on the next two days. */
function slotStarts(): number[] {
  const now = Date.now();
  const istMidnight = Math.floor((now + IST_OFFSET) / DAY) * DAY - IST_OFFSET;
  return [1, 2].flatMap((day) => [11, 16].map((hour) => istMidnight + day * DAY + hour * HOUR));
}

export const DEMO_SCRIPT = {
  question: "मेरे मकान मालक ने बगैर नोटिस दे मेरा समान बाह्र सुट्टी दित्ता ते कमरे गी ताला लाई दित्ता। हून में केह् करां?",
  reply:
    "तुसें गी घबराने दी लोड़ नेईं। मकान मालक बगैर नोटिस ते बगैर अदालत दे हुक्म दे तुसें गी जबरदस्ती घरा थमां नेईं कड्ढी सकदा। " +
    "कमरे गी ताला लाना ते तुंʼदा समान सुट्टना जुर्म होई सकदा ऐ। तुस पुलस च शकैत दर्ज करोआई सकदे ओ। " +
    "इस मामले च इक वकील तुंʼदी पूरी मदद करी सकदा ऐ।",
  sources: [
    { title: "Bharatiya Nyaya Sanhita, 2023", url: "https://www.indiacode.nic.in/", documentType: "statute" as const, act: "BNS 2023", sectionNumber: 329, sectionTitle: "Criminal trespass and house-trespass", quote: "Whoever enters into or upon property in the possession of another with intent to commit an offence or to intimidate, insult or annoy any person in possession of such property…" },
    { title: "Bharatiya Nyaya Sanhita, 2023", url: "https://www.indiacode.nic.in/", documentType: "statute" as const, act: "BNS 2023", sectionNumber: 324, sectionTitle: "Mischief", quote: "Whoever with intent to cause, or knowing that he is likely to cause, wrongful loss or damage to the public or to any person, causes the destruction of any property…" },
  ],
  summary:
    "किरायेदार: मकान मालक ने बगैर नोटिस दे समान बाह्र सुट्टी दित्ता ते कमरे गी ताला लाई दित्ता। शैह्र: जम्मू। मदद चाहिदी: समान बापस ते कमरे दा कब्जा।",
  fee: 500,
  /** A short back-and-forth, one entry per press of the mic. */
  turns: [
    {
      question: "नमस्ते। मेरे मकान मालक ने मेरा समान बाह्र सुट्टी दित्ता ऐ, ते कमरे गी ताला लाई दित्ता ऐ।",
      reply: "एह् ते बड़ी गलत गल्ल ऐ। केह् उसने तुसें गी पैह्लें कोई नोटिस दित्ता हा?",
      withSources: false,
    },
    {
      question: "नेईं, कोई नोटिस नेईं। में दो साल थमां पूरा किराया देआ करदी आं।",
      reply: "तां मकान मालक तुसें गी इस चाल्ली नेईं कड्ढी सकदा। बगैर नोटिस ते अदालत दे हुक्म दे ताला लाना ते समान सुट्टना जुर्म होई सकदा ऐ। तुस पुलस च शकैत करी सकदे ओ।",
      withSources: true,
    },
    {
      question: "केह् कोई वकील मेरी मदद करी सकदा ऐ?",
      reply: "जी हां। जम्मू दे वकील डोगरी च तुंʼदी गल्ल सुनी सकदे न। हेठ ‘वकील कन्नै गल्ल करो’ दबाओ।",
      withSources: false,
    },
  ],
};

const LAWYERS = (() => {
  const starts = slotStarts();
  return [
    { _id: "demo-adv-1", displayName: "Adv. Meenakshi Sharma", city: "Jammu", yearsExperience: 12, domains: ["property", "civil"], locales: ["doi", "hi", "en"], consultationModes: ["video", "phone"], bio: "किरायेदारी ते जायदाद दे मामलें दी माहिर। जम्मू हाईकोर्ट च प्रैक्टिस।", slots: starts.map((start) => ({ start })) },
    { _id: "demo-adv-2", displayName: "Adv. Rakesh Jamwal", city: "Jammu", yearsExperience: 9, domains: ["criminal", "property"], locales: ["doi", "hi", "pa"], consultationModes: ["phone"], bio: "", slots: starts.slice(1).map((start) => ({ start })) },
    { _id: "demo-adv-3", displayName: "Adv. Sunita Gupta", city: "Kathua", yearsExperience: 15, domains: ["family", "civil"], locales: ["hi", "en"], consultationModes: ["video"], bio: "", slots: starts.slice(2).map((start) => ({ start })) },
  ];
})();

type Turn = { _id: string; requestId: string; inputKind: "audio" | "text"; transcript: string; reply: { kind: "pending" } | { kind: "reply"; text: string; sources: typeof DEMO_SCRIPT.sources } };
type Booking = { _id: string; state: "pending" | "accepted"; advocateName: string; start: number };

const state = {
  turns: [] as Turn[],
  suggestLawyer: false,
  bookings: [] as Booking[],
  started: false,
};

const listeners = new Set<Listener>();
let version = 0;
function changed() {
  version += 1;
  listeners.forEach((listener) => listener());
}
export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
export function getVersion() {
  return version;
}

/** Tiny stable hash so each spoken sentence maps to one pre-made audio file. */
export function clipName(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return `${h.toString(16)}.wav`;
}

function log(kind: string, data: unknown) {
  // Read by the recording script to line up captions and audio.
  console.log(`[demo] ${kind} ${JSON.stringify(data)} @${Date.now()}`);
}

let conversationNumber = 1;
let CONVERSATION_ID = "demo-conversation-1";

function conversation() {
  if (!state.started) return null;
  return {
    _id: CONVERSATION_ID,
    isGuest: false,
    guestTurnsLeft: 99,
    turnCount: state.turns.length,
    turns: state.turns,
    bookings: state.bookings,
    profile: { suggestLawyer: state.suggestLawyer, domain: "property", city: "Jammu" },
  };
}

const cache = new Map<string, { version: number; value: unknown }>();
/** Same object until the data changes, like Convex's own query results. */
export function runQuery(ref: unknown, args: Record<string, unknown> | undefined): unknown {
  const key = `${getFunctionName(ref as never)}:${JSON.stringify(args ?? {})}`;
  const hit = cache.get(key);
  if (hit && hit.version === version) return hit.value;
  const value = computeQuery(ref, args);
  cache.set(key, { version, value });
  return value;
}

function computeQuery(ref: unknown, args: Record<string, unknown> | undefined): unknown {
  const name = getFunctionName(ref as never);
  switch (name) {
    case "accounts:me": return { displayName: "Ramesh", role: "user", disabled: false };
    case "conversations:latest": return state.started ? { _id: CONVERSATION_ID } : null;
    case "conversations:get": return conversation();
    case "conversations:listMine": return state.started ? [{ _id: CONVERSATION_ID, locale: "doi", summary: state.turns.length ? DEMO_SCRIPT.summary : "", updatedAt: Date.now() }] : [];
    case "advocates:listPublic": return { page: LAWYERS, isDone: true, continueCursor: "" };
    case "advocates:getPublic": return LAWYERS.find((lawyer) => lawyer._id === args?.advocateId) ?? null;
    case "slots:listPublic": {
      const lawyer = LAWYERS.find((entry) => entry._id === args?.advocateId);
      return (lawyer?.slots ?? []).map((slot, index) => ({ _id: `${lawyer!._id}-slot-${index}`, start: slot.start, end: slot.start + HOUR }));
    }
    default: return null;
  }
}

let pendingAdvocate: { name: string; start: number } | null = null;

export async function runMutation(ref: unknown, args: Record<string, unknown>): Promise<unknown> {
  const name = getFunctionName(ref as never);
  switch (name) {
    case "conversations:startNew":
      CONVERSATION_ID = `demo-conversation-${++conversationNumber}`;
      state.turns = [];
      state.bookings = [];
      state.suggestLawyer = false;
      state.started = true;
      pendingAdvocate = null;
      changed();
      return CONVERSATION_ID;
    case "conversations:prepareCase":
      await wait(400);
      return { caseId: "demo-case", summaryVersion: 1, summary: { text: DEMO_SCRIPT.summary } };
    case "bookings:request": {
      await wait(900);
      const slotId = String(args.slotId);
      const lawyer = LAWYERS.find((entry) => slotId.startsWith(entry._id))!;
      const index = Number(slotId.split("-slot-")[1] ?? 0);
      pendingAdvocate = { name: lawyer.displayName, start: lawyer.slots[index]!.start };
      state.bookings = [{ _id: "demo-booking", state: "pending", advocateName: lawyer.displayName, start: pendingAdvocate.start }];
      log("booked", pendingAdvocate);
      changed();
      return { bookingId: "demo-booking" };
    }
    default:
      return null;
  }
}

export async function runAction(ref: unknown, args: Record<string, unknown>): Promise<unknown> {
  const name = getFunctionName(ref as never);
  if (name === "voice:send") {
    const conversationId = CONVERSATION_ID;
    const requestId = String(args.requestId);
    state.started = true;
    const index = state.turns.length;
    const script = DEMO_SCRIPT.turns[index % DEMO_SCRIPT.turns.length]!;
    const turn: Turn = { _id: `turn-${index + 1}`, requestId, inputKind: "audio", transcript: script.question, reply: { kind: "pending" } };
    state.turns = [...state.turns, turn];
    log("sent", { requestId, turn: index });
    changed();
    await wait(900);
    if (conversationId !== CONVERSATION_ID) return { kind: "unavailable", reason: "state_changed" };
    state.turns = state.turns.map((entry) => entry._id === turn._id ? { ...entry, reply: { kind: "reply", text: script.reply, sources: script.withSources ? DEMO_SCRIPT.sources : [] } } : entry);
    if (script.withSources) state.suggestLawyer = true;
    log("replied", { turn: turn._id });
    changed();
    return { kind: "reply", conversationId: CONVERSATION_ID, turnId: turn._id };
  }
  if (name === "voiceAudio:speak") {
    const text = String(args.text);
    log("speak", { text, clip: clipName(text) });
    return { kind: "audio", url: `/demo-audio/${clipName(text)}` };
  }
  return null;
}

/** The consultation fee was paid: the lawyer's confirmation arrives a moment later. */
export function markPaid() {
  log("paid", { fee: DEMO_SCRIPT.fee });
  setTimeout(() => {
    state.bookings = state.bookings.map((booking) => ({ ...booking, state: "accepted" }));
    log("accepted", {});
    changed();
  }, 400);
}

export function pendingBooking() {
  return pendingAdvocate;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
