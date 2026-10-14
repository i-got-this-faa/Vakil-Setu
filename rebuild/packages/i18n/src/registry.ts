/**
 * @vakil/i18n - Language Registry
 * Registry for English and the 22 Eighth Schedule Indian languages.
 * Tracks truthful interface, typed input, AI, and speech capabilities.
 */

import type {
  CapabilityStatus,
  LanguageCapabilities,
  LanguageDefinition,
  PilotLocale,
  SupportedLocaleCode,
} from './types';
import { pilotLocales } from './types';

const PILOT_CAPABILITIES: LanguageCapabilities = {
  interface: 'unverified',
  typedInput: 'available',
  aiTriage: 'unverified',
  speechInput: 'unverified',
  speechPlayback: 'unverified',
};

const NON_PILOT_CAPABILITIES: LanguageCapabilities = {
  interface: 'unavailable',
  typedInput: 'available',
  aiTriage: 'unavailable',
  speechInput: 'unavailable',
  speechPlayback: 'unavailable',
};

const NON_PILOT_NOTE =
  'Eighth Schedule official language. Unicode typed text entry is available in forms. Interface localization, AI triage, and speech capabilities are unavailable in the current pilot release.';

export const locales: readonly LanguageDefinition[] = [
  // Pilot languages
  {
    code: 'en-IN',
    aliases: ['en', 'en-US', 'en-GB'],
    name: 'English',
    nativeName: 'English',
    script: 'Latin',
    direction: 'ltr',
    isPilot: true,
    capabilities: PILOT_CAPABILITIES,
    notes:
      'Pilot locale with an English message bundle. Full interface coverage and independent language review are not recorded. AI and speech capabilities remain unverified; no live provider or language-specific acceptance evidence is recorded.',
  },
  {
    code: 'hi-IN',
    aliases: ['hi', 'hin'],
    name: 'Hindi',
    nativeName: 'हिन्दी',
    script: 'Devanagari',
    direction: 'ltr',
    isPilot: true,
    capabilities: PILOT_CAPABILITIES,
    notes:
      'Pilot locale with a Hindi message bundle in Devanagari. Full interface coverage and independent language review are not recorded. AI and speech capabilities remain unverified; no live provider or language-specific acceptance evidence is recorded.',
  },
  {
    code: 'pa-IN',
    aliases: ['pa', 'pan', 'pa-Guru'],
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    script: 'Gurmukhi',
    direction: 'ltr',
    isPilot: true,
    capabilities: PILOT_CAPABILITIES,
    notes:
      'Pilot locale with a Punjabi message bundle in Gurmukhi. Full interface coverage and independent language review are not recorded. AI and speech capabilities remain unverified; no live provider or language-specific acceptance evidence is recorded.',
  },

  // 20 Additional Scheduled Languages (Eighth Schedule of the Constitution of India)
  {
    code: 'as-IN',
    aliases: ['as', 'asm'],
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    script: 'Bengali-Assamese',
    direction: 'ltr',
    isPilot: false,
    capabilities: NON_PILOT_CAPABILITIES,
    notes: NON_PILOT_NOTE,
  },
  {
    code: 'bn-IN',
    aliases: ['bn', 'ben'],
    name: 'Bengali',
    nativeName: 'বাংলা',
    script: 'Bengali',
    direction: 'ltr',
    isPilot: false,
    capabilities: NON_PILOT_CAPABILITIES,
    notes: NON_PILOT_NOTE,
  },
  {
    code: 'brx-IN',
    aliases: ['brx'],
    name: 'Bodo',
    nativeName: 'बड़ो',
    script: 'Devanagari',
    direction: 'ltr',
    isPilot: false,
    capabilities: NON_PILOT_CAPABILITIES,
    notes: NON_PILOT_NOTE,
  },
  {
    code: 'doi-IN',
    aliases: ['doi'],
    name: 'Dogri',
    nativeName: 'डोगरी',
    script: 'Devanagari',
    direction: 'ltr',
    isPilot: false,
    capabilities: NON_PILOT_CAPABILITIES,
    notes: NON_PILOT_NOTE,
  },
  {
    code: 'gu-IN',
    aliases: ['gu', 'guj'],
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    script: 'Gujarati',
    direction: 'ltr',
    isPilot: false,
    capabilities: NON_PILOT_CAPABILITIES,
    notes: NON_PILOT_NOTE,
  },
  {
    code: 'kn-IN',
    aliases: ['kn', 'kan'],
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    script: 'Kannada',
    direction: 'ltr',
    isPilot: false,
    capabilities: NON_PILOT_CAPABILITIES,
    notes: NON_PILOT_NOTE,
  },
  {
    code: 'ks-IN',
    aliases: ['ks', 'kas'],
    name: 'Kashmiri',
    nativeName: 'کٲشُر',
    script: 'Perso-Arabic',
    direction: 'rtl',
    isPilot: false,
    capabilities: NON_PILOT_CAPABILITIES,
    notes: NON_PILOT_NOTE,
  },
  {
    code: 'kok-IN',
    aliases: ['kok'],
    name: 'Konkani',
    nativeName: 'कोंकणी',
    script: 'Devanagari',
    direction: 'ltr',
    isPilot: false,
    capabilities: NON_PILOT_CAPABILITIES,
    notes: NON_PILOT_NOTE,
  },
  {
    code: 'mai-IN',
    aliases: ['mai'],
    name: 'Maithili',
    nativeName: 'मैथिली',
    script: 'Devanagari',
    direction: 'ltr',
    isPilot: false,
    capabilities: NON_PILOT_CAPABILITIES,
    notes: NON_PILOT_NOTE,
  },
  {
    code: 'ml-IN',
    aliases: ['ml', 'mal'],
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    script: 'Malayalam',
    direction: 'ltr',
    isPilot: false,
    capabilities: NON_PILOT_CAPABILITIES,
    notes: NON_PILOT_NOTE,
  },
  {
    code: 'mni-IN',
    aliases: ['mni'],
    name: 'Manipuri (Meitei)',
    nativeName: 'মৈতৈলোন্',
    script: 'Bengali / Meetei Mayek',
    direction: 'ltr',
    isPilot: false,
    capabilities: NON_PILOT_CAPABILITIES,
    notes: NON_PILOT_NOTE,
  },
  {
    code: 'mr-IN',
    aliases: ['mr', 'mar'],
    name: 'Marathi',
    nativeName: 'मराठी',
    script: 'Devanagari',
    direction: 'ltr',
    isPilot: false,
    capabilities: NON_PILOT_CAPABILITIES,
    notes: NON_PILOT_NOTE,
  },
  {
    code: 'ne-IN',
    aliases: ['ne', 'nep'],
    name: 'Nepali',
    nativeName: 'नेपाली',
    script: 'Devanagari',
    direction: 'ltr',
    isPilot: false,
    capabilities: NON_PILOT_CAPABILITIES,
    notes: NON_PILOT_NOTE,
  },
  {
    code: 'or-IN',
    aliases: ['or', 'ori'],
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    script: 'Odia',
    direction: 'ltr',
    isPilot: false,
    capabilities: NON_PILOT_CAPABILITIES,
    notes: NON_PILOT_NOTE,
  },
  {
    code: 'sa-IN',
    aliases: ['sa', 'san'],
    name: 'Sanskrit',
    nativeName: 'संस्कृतम्',
    script: 'Devanagari',
    direction: 'ltr',
    isPilot: false,
    capabilities: NON_PILOT_CAPABILITIES,
    notes: NON_PILOT_NOTE,
  },
  {
    code: 'sat-IN',
    aliases: ['sat'],
    name: 'Santali',
    nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ',
    script: 'Ol Chiki',
    direction: 'ltr',
    isPilot: false,
    capabilities: NON_PILOT_CAPABILITIES,
    notes: NON_PILOT_NOTE,
  },
  {
    code: 'sd-IN',
    aliases: ['sd', 'snd'],
    name: 'Sindhi',
    nativeName: 'سنڌي',
    script: 'Perso-Arabic',
    direction: 'rtl',
    isPilot: false,
    capabilities: NON_PILOT_CAPABILITIES,
    notes: NON_PILOT_NOTE,
  },
  {
    code: 'ta-IN',
    aliases: ['ta', 'tam'],
    name: 'Tamil',
    nativeName: 'தமிழ்',
    script: 'Tamil',
    direction: 'ltr',
    isPilot: false,
    capabilities: NON_PILOT_CAPABILITIES,
    notes: NON_PILOT_NOTE,
  },
  {
    code: 'te-IN',
    aliases: ['te', 'tel'],
    name: 'Telugu',
    nativeName: 'తెలుగు',
    script: 'Telugu',
    direction: 'ltr',
    isPilot: false,
    capabilities: NON_PILOT_CAPABILITIES,
    notes: NON_PILOT_NOTE,
  },
  {
    code: 'ur-IN',
    aliases: ['ur', 'urd'],
    name: 'Urdu',
    nativeName: 'اُردُو',
    script: 'Perso-Arabic',
    direction: 'rtl',
    isPilot: false,
    capabilities: NON_PILOT_CAPABILITIES,
    notes: NON_PILOT_NOTE,
  },
] as const;

/**
 * Normalizes input locale code to standard canonical BCP-47 tag if recognized.
 */
export function normalizeLocale(locale: string): SupportedLocaleCode | undefined {
  if (!locale || typeof locale !== 'string') return undefined;
  const clean = locale.trim().toLowerCase().replace('_', '-');

  for (const entry of locales) {
    if (entry.code.toLowerCase() === clean) {
      return entry.code;
    }
    for (const alias of entry.aliases) {
      if (alias.toLowerCase() === clean) {
        return entry.code;
      }
    }
  }

  // Handle prefix matches (e.g. "hi-Latn" -> "hi-IN", "en-CA" -> "en-IN")
  const langPrefix = clean.split('-')[0];
  if (langPrefix) {
    for (const entry of locales) {
      if (entry.aliases.includes(langPrefix) || entry.code.split('-')[0] === langPrefix) {
        return entry.code;
      }
    }
  }

  return undefined;
}

/**
 * Returns the language definition from the registry for a given locale string or alias.
 */
export function getLanguage(locale: string): LanguageDefinition | undefined {
  const normalized = normalizeLocale(locale);
  if (!normalized) return undefined;
  return locales.find((l) => l.code === normalized);
}

/**
 * Type guard checking if a given locale string is one of the supported pilot locales.
 */
export function isPilotLocale(locale: string): locale is PilotLocale {
  return pilotLocales.some((pilotLocale) => pilotLocale === locale);
}
