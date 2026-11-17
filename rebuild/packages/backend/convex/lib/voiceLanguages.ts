import type { VoiceLocale } from "@legal-setu/domain";

// English names for the model prompt. Display names live in the client.
const NAMES: Record<VoiceLocale, string> = {
  hi: "Hindi", en: "simple Indian English", pa: "Punjabi", doi: "Dogri", bn: "Bengali", mr: "Marathi", ta: "Tamil",
  te: "Telugu", gu: "Gujarati", kn: "Kannada", ml: "Malayalam", or: "Odia", ur: "Urdu",
};
export function getLanguageName(locale: VoiceLocale) {
  return NAMES[locale];
}
