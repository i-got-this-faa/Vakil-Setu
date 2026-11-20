import type { Phrases } from "./languages";

export function failureText(reason: string, phrases: Phrases): string {
  if (reason === "busy" || reason === "rate_limited") return phrases.busy;
  if (reason === "document_invalid") return phrases.documentProblem;
  if (reason === "unsupported_language" || reason === "not_configured" || reason === "invalid_config") return phrases.error;
  return phrases.sayAgain;
}

export function bookingStatus(state: string, phrases: Phrases): string {
  switch (state) {
    case "pending": return phrases.statusPending;
    case "accepted": return phrases.statusAccepted;
    case "declined": return phrases.statusDeclined;
    case "cancelled": return phrases.statusCancelled;
    case "completed": return phrases.statusCompleted;
    default: return phrases.statusExpired;
  }
}

export type Lawyer = { _id: string; displayName: string; city: string; yearsExperience: number; domains: string[]; locales: string[]; slots: { start: number }[] };

/** Best match first: speaks your language, then knows your kind of problem, then is in your city, then soonest free time. */
export function rankLawyers<T extends Lawyer>(lawyers: readonly T[], want: { locale: string; domain: string; city: string }): T[] {
  const city = want.city.trim().toLocaleLowerCase("en-IN");
  const score = (lawyer: T) =>
    (lawyer.locales.includes(want.locale) ? 4 : 0)
    + (want.domain !== "unknown" && lawyer.domains.includes(want.domain) ? 2 : 0)
    + (city && lawyer.city.trim().toLocaleLowerCase("en-IN") === city ? 1 : 0);
  return [...lawyers].sort((a, b) => score(b) - score(a) || (a.slots[0]?.start ?? Infinity) - (b.slots[0]?.start ?? Infinity) || a.displayName.localeCompare(b.displayName, "en-IN"));
}

/** Indian mobile numbers only for now: 10 digits starting 6–9, sent as +91 E.164. */
export function indianMobile(input: string): string | null {
  const digits = input.replace(/\D/g, "").replace(/^(?:91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}


export type LawSource = { title: string; url: string; documentType: "statute" | "judgment"; act?: string; sectionNumber?: number; sectionTitle?: string; court?: string; decisionDate?: string; quote: string };

/** Short label for a law excerpt: "BNS § 318 · Cheating", or a judgment's name, court and year. */
export function lawSourceLabel(source: LawSource): string {
  if (source.documentType === "statute" && source.act && source.sectionNumber !== undefined) {
    return `${source.act} § ${source.sectionNumber}${source.sectionTitle ? ` · ${source.sectionTitle}` : ""}`;
  }
  const year = source.decisionDate?.slice(0, 4);
  return [source.title, source.court, year].filter(Boolean).join(" · ");
}

/** India's free emergency numbers, in the order shown on the SOS screen. */
export const EMERGENCY_NUMBERS = [
  { number: "112", label: "callPolice", icon: "shield", color: "#dc2626" },
  { number: "181", label: "callWomen", icon: "woman", color: "#be185d" },
  { number: "1098", label: "callChild", icon: "happy", color: "#c2410c" },
  { number: "15100", label: "callLegalAid", icon: "scale", color: "#0f766e" },
] as const;

/** Languages read aloud by a server voice: Bhashini (Dogri uses the Hindi voice; it shares the script), or Gemini for Kashmiri. Urdu uses the phone's own voice. */
export const SERVER_VOICE_LOCALES: readonly string[] = ["hi", "en", "pa", "doi", "ks", "bn", "mr", "gu", "or", "ta", "te", "kn", "ml"];

/**
 * Splits a reply into short pieces at sentence ends (। . ? ! ۔ and line breaks), so the first piece
 * can start playing while the rest are still being made. Pieces stay under `max` characters.
 */
export function splitForSpeech(text: string, max = 220): string[] {
  const sentences = text.replace(/\s+/g, " ").trim().match(/[^।.?!۔]+[।.?!۔]*/gu) ?? [];
  const pieces: string[] = [];
  let current = "";
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    if (sentence.length > max) {
      if (current) { pieces.push(current); current = ""; }
      // A very long sentence is cut at commas or spaces.
      let rest = sentence;
      while (rest.length > max) {
        const cut = Math.max(rest.lastIndexOf(",", max), rest.lastIndexOf("،", max), rest.lastIndexOf(" ", max));
        const at = cut > max / 3 ? cut + 1 : max;
        pieces.push(rest.slice(0, at).trim());
        rest = rest.slice(at).trim();
      }
      current = rest;
    } else if (!current) current = sentence;
    // The first piece is kept to one sentence so speech starts as soon as possible.
    else if (pieces.length > 0 && current.length + 1 + sentence.length <= max) current = `${current} ${sentence}`;
    else { pieces.push(current); current = sentence; }
  }
  if (current) pieces.push(current);
  return pieces;
}
