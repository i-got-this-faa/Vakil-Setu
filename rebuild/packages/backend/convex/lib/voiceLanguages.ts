import type { VoiceLocale } from "@legal-setu/domain";

// English names for the model prompt. Display names live in the client.
const NAMES: Record<VoiceLocale, string> = {
  hi: "Hindi", en: "simple Indian English", pa: "Punjabi", doi: "Dogri", bn: "Bengali", mr: "Marathi", ta: "Tamil",
  te: "Telugu", gu: "Gujarati", kn: "Kannada", ml: "Malayalam", or: "Odia", ur: "Urdu", ks: "Kashmiri",
};
export function getLanguageName(locale: VoiceLocale) {
  return NAMES[locale];
}

// Dogri: the AI answers in Hindi (which it handles reliably) and Bhashini translates the reply into Dogri.
// Kashmiri: the AI answers in English and IndicTrans2 (Bhashini) translates it.
export const TRANSLATED_REPLIES: Partial<Record<VoiceLocale, VoiceLocale>> = { doi: "hi", ks: "en" };
/** The language the AI writes replies and summaries in for this conversation. */
export function replyLocaleFor(locale: VoiceLocale): VoiceLocale {
  return TRANSLATED_REPLIES[locale] ?? locale;
}
