import type { LanguageCapabilities, LanguageDefinition, Locale, PilotLocale, SupportedLocaleCode } from './types';
import { pilotLocales } from './types';
import { hasDraftTranslation } from './draft-bundles';

// Baseline metadata is independent of any browser or server configuration.
const capabilities: LanguageCapabilities = {
  interface: 'unverified', typedInput: 'available',
  aiTriage: 'unavailable', aiInput: 'unavailable', aiOutput: 'unavailable',
  speechInput: 'unavailable', speechPlayback: 'unavailable',
};
type RegistryRow = readonly [Locale, SupportedLocaleCode, string, string, string, string, 'ltr' | 'rtl', readonly string[]];
const rows = [
  ['en', 'en-IN', 'en-IN', 'English', 'English', 'Latin', 'ltr', ['en-US', 'en-GB']],
  ['as', 'as-IN', 'as-IN', 'Assamese', 'অসমীয়া', 'Bengali-Assamese', 'ltr', ['asm']],
  ['bn', 'bn-IN', 'bn-IN', 'Bengali', 'বাংলা', 'Bengali', 'ltr', ['ben']],
  ['brx', 'brx-IN', 'brx-IN', 'Bodo', 'बड़ो', 'Devanagari', 'ltr', []],
  ['doi', 'doi-IN', 'doi-IN', 'Dogri', 'डोगरी', 'Devanagari', 'ltr', []],
  ['gu', 'gu-IN', 'gu-IN', 'Gujarati', 'ગુજરાતી', 'Gujarati', 'ltr', ['guj']],
  ['hi', 'hi-IN', 'hi-IN', 'Hindi', 'हिन्दी', 'Devanagari', 'ltr', ['hin']],
  ['kn', 'kn-IN', 'kn-IN', 'Kannada', 'ಕನ್ನಡ', 'Kannada', 'ltr', ['kan']],
  ['ks', 'ks-IN', 'ks-Arab-IN', 'Kashmiri', 'کٲشُر', 'Perso-Arabic', 'rtl', ['kas']],
  ['kok', 'kok-IN', 'kok-Deva-IN', 'Konkani', 'कोंकणी', 'Devanagari', 'ltr', []],
  ['mai', 'mai-IN', 'mai-IN', 'Maithili', 'मैथिली', 'Devanagari', 'ltr', []],
  ['ml', 'ml-IN', 'ml-IN', 'Malayalam', 'മലയാളം', 'Malayalam', 'ltr', ['mal']],
  ['mni', 'mni-IN', 'mni-Mtei-IN', 'Manipuri (Meitei)', 'ꯃꯤꯇꯩꯂꯣꯟ', 'Meitei Mayek', 'ltr', []],
  ['mr', 'mr-IN', 'mr-IN', 'Marathi', 'मराठी', 'Devanagari', 'ltr', ['mar']],
  ['ne', 'ne-IN', 'ne-IN', 'Nepali', 'नेपाली', 'Devanagari', 'ltr', ['nep']],
  ['or', 'or-IN', 'or-IN', 'Odia', 'ଓଡ଼ିଆ', 'Odia', 'ltr', ['ori']],
  ['pa', 'pa-IN', 'pa-Guru-IN', 'Punjabi', 'ਪੰਜਾਬੀ', 'Gurmukhi', 'ltr', ['pan', 'pa-Guru']],
  ['sa', 'sa-IN', 'sa-IN', 'Sanskrit', 'संस्कृतम्', 'Devanagari', 'ltr', ['san']],
  ['sat', 'sat-IN', 'sat-Olck-IN', 'Santali', 'ᱥᱟᱱᱛᱟᱲᱤ', 'Ol Chiki', 'ltr', []],
  ['sd', 'sd-IN', 'sd-Arab-IN', 'Sindhi', 'سنڌي', 'Perso-Arabic', 'rtl', ['snd']],
  ['ta', 'ta-IN', 'ta-IN', 'Tamil', 'தமிழ்', 'Tamil', 'ltr', ['tam']],
  ['te', 'te-IN', 'te-IN', 'Telugu', 'తెలుగు', 'Telugu', 'ltr', ['tel']],
  ['ur', 'ur-IN', 'ur-IN', 'Urdu', 'اُردُو', 'Perso-Arabic', 'rtl', ['urd']],
] as const satisfies readonly RegistryRow[];

export const translationQuality = { stage: 'draft', humanReview: 'unverified', legalTerminologyReview: 'unverified' } as const;
export const locales: readonly LanguageDefinition[] = rows.map(([shortCode, code, languageTag, name, nativeName, script, direction, aliases]) => ({
  shortCode, code, languageTag, name, nativeName, script, direction,
  aliases: [shortCode, languageTag, ...aliases],
  // Compatibility flag describes selection, independently of translation availability.
  isPilot: true,
  capabilities: { ...capabilities, interface: hasDraftTranslation(shortCode) ? 'unverified' : 'unavailable' },
  notes: hasDraftTranslation(shortCode)
    ? 'Draft interface bundle. Human language quality and legal terminology are unverified. AI and speech require independent runtime checks.'
    : 'Interface translation unavailable; explicit English interface fallback. Unicode typed input is available. AI and speech require independent runtime checks.',
}));

export function normalizeLocale(locale: string): SupportedLocaleCode | undefined {
  const clean = locale.trim().toLowerCase().replaceAll('_', '-');
  const exact = locales.find(entry => entry.code.toLowerCase() === clean || entry.aliases.some(alias => alias.toLowerCase() === clean));
  if (exact) return exact.code;
  const prefix = clean.split('-')[0];
  return locales.find(entry => entry.shortCode === prefix)?.code;
}
export function getLanguage(locale: string): LanguageDefinition | undefined {
  const normalized = normalizeLocale(locale);
  return locales.find(entry => entry.code === normalized);
}
/** Actual interface language, independent of the selected language of typed case information. */
export function getInterfaceLocale(locale: string): Locale {
  const language = getLanguage(locale);
  return language && language.capabilities.interface !== 'unavailable' ? language.shortCode : 'en';
}
/** Canonical-tag guard retained for compatibility; the domain guard accepts short stored codes. */
export function isPilotLocale(locale: string): locale is PilotLocale {
  return pilotLocales.some(code => code === locale);
}
/** Native labels and stable short values for forms and filters on any client. */
export function getLocaleOptions() {
  return locales.map(language => ({ value: language.shortCode, label: language.nativeName, lang: language.languageTag, direction: language.direction }));
}
export const localeOptions = getLocaleOptions();

export type RuntimeLanguageConfiguration = {
  aiConfigured: boolean;
  aiInputAvailable?: boolean;
  aiOutputAvailable?: boolean;
  speechInputAvailable?: boolean;
  speechPlaybackAvailable?: boolean;
};
/** Supply deployment/browser facts, never secrets. Availability is not language acceptance evidence. */
export function getLanguageCapabilities(locale: string, runtime: RuntimeLanguageConfiguration): LanguageCapabilities | undefined {
  const language = getLanguage(locale);
  if (!language) return undefined;
  const aiInput = runtime.aiConfigured && runtime.aiInputAvailable !== false ? 'unverified' : 'unavailable';
  const aiOutput = runtime.aiConfigured && runtime.aiOutputAvailable !== false ? 'unverified' : 'unavailable';
  return { ...language.capabilities, aiInput, aiOutput,
    aiTriage: aiInput === 'unverified' && aiOutput === 'unverified' ? 'unverified' : 'unavailable',
    speechInput: runtime.speechInputAvailable ? 'unverified' : 'unavailable',
    speechPlayback: runtime.speechPlaybackAvailable ? 'unverified' : 'unavailable',
  };
}
