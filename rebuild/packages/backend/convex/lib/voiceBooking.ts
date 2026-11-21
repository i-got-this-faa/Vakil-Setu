import type { VoiceLocale } from "@legal-setu/domain";

// Pure helpers for booking a lawyer by voice: Indian time, matching spoken times to real slots, ranking lawyers.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Calendar parts of a moment in India Standard Time. */
export function istParts(ms: number) {
  const d = new Date(ms + IST_OFFSET_MS);
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours(), minute: d.getUTCMinutes(), weekday: d.getUTCDay(), day: d.getUTCDate(), month: d.getUTCMonth() };
}

/** "2026-11-20 (Friday)": tells the AI what "tomorrow" means. */
export function todayLabel(now: number) {
  const today = istParts(now);
  return `${today.date} (${WEEKDAYS[today.weekday]})`;
}

function clock(hour: number, minute: number) {
  const h12 = hour % 12 || 12;
  return `${h12}${minute ? `:${String(minute).padStart(2, "0")}` : ""} ${hour < 12 ? "am" : "pm"}`;
}

/** How a slot is read aloud: "today at 4 pm", "tomorrow at 11:30 am", "on Monday 24 November at 10 am" (IST). */
export function spokenTime(start: number, now: number) {
  const slot = istParts(start);
  const days = Math.round((Date.parse(slot.date) - Date.parse(istParts(now).date)) / DAY_MS);
  const day = days === 0 ? "today" : days === 1 ? "tomorrow" : `on ${WEEKDAYS[slot.weekday]} ${slot.day} ${MONTHS[slot.month]}`;
  return `${day} at ${clock(slot.hour, slot.minute)}`;
}

const PART_OF_DAY = { morning: [5, 12], afternoon: [12, 17], evening: [17, 24] } as const;
export type TimeWish = { date?: string; hour?: number; partOfDay?: keyof typeof PART_OF_DAY };

/**
 * The free slots that fit what the person asked for ("tomorrow", "Friday evening", "4 pm"), soonest first.
 * An hour is matched exactly and is more precise than "morning/evening" ("this evening at 4" is 4 pm).
 * People say "4 o'clock" without am/pm, so an early hour also matches the same hour after noon.
 * If nothing fits, nothing matches (the caller then reads alternatives).
 */
export function matchSlots<T extends { start: number }>(slots: readonly T[], wish: TimeWish): T[] {
  const hours = wish.hour === undefined ? null : wish.hour >= 1 && wish.hour <= 7 ? [wish.hour, wish.hour + 12] : [wish.hour];
  return slots.filter(slot => {
    const parts = istParts(slot.start);
    if (wish.date && parts.date !== wish.date) return false;
    if (hours) return hours.includes(parts.hour);
    if (wish.partOfDay) {
      const [from, to] = PART_OF_DAY[wish.partOfDay];
      if (parts.hour < from || parts.hour >= to) return false;
    }
    return true;
  }).sort((a, b) => a.start - b.start);
}

export type RankableLawyer = { displayName: string; city: string; locales: string[]; domains: string[] };

/**
 * Best lawyers first: speaks the person's language (Dogri speakers also accept Hindi), knows this kind of problem,
 * same city. Ties go to the soonest free time, then name.
 */
export function rankLawyers<T extends RankableLawyer & { nextStart: number }>(lawyers: readonly T[], want: { locale: VoiceLocale; domain: string; city: string }): T[] {
  const city = want.city.trim().toLocaleLowerCase("en-IN");
  const score = (lawyer: T) =>
    (lawyer.locales.includes(want.locale) ? 4 : want.locale === "doi" && lawyer.locales.includes("hi") ? 2 : 0)
    + (want.domain !== "unknown" && lawyer.domains.includes(want.domain) ? 2 : 0)
    + (city && lawyer.city.trim().toLocaleLowerCase("en-IN") === city ? 1 : 0);
  return [...lawyers].sort((a, b) => score(b) - score(a) || a.nextStart - b.nextStart || a.displayName.localeCompare(b.displayName, "en-IN"));
}

/** "number 1, …; number 2, …; and number 3, …" */
export function numbered(items: readonly string[]) {
  const parts = items.map((item, index) => `number ${index + 1}, ${item}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join("; ")}; and ${parts.at(-1)}` : parts[0] ?? "";
}
