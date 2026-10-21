import en from './bundles/en.json';
import { operationalBundles } from './bundles';
import dictionary from './source.json';

export { operationalBundles };
export type OperationalLocale = keyof typeof languageTags;
export type OperationalKey = keyof typeof en;
export type OperationalText = {
  text: string;
  lang: string;
  dir: 'ltr' | 'rtl';
  known: boolean;
};

const languageTags = {
  en: 'en-IN',
  as: 'as-IN',
  bn: 'bn-IN',
  brx: 'brx-IN',
  doi: 'doi-IN',
  gu: 'gu-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
  ks: 'ks-Arab-IN',
  kok: 'kok-Deva-IN',
  mai: 'mai-IN',
  ml: 'ml-IN',
  mni: 'mni-Mtei-IN',
  mr: 'mr-IN',
  ne: 'ne-IN',
  or: 'or-IN',
  pa: 'pa-Guru-IN',
  sa: 'sa-IN',
  sat: 'sat-Olck-IN',
  sd: 'sd-Arab-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  ur: 'ur-IN',
} satisfies Record<string, string>;

export const operationalTranslationQuality = {
  stage: 'draft',
  humanReview: 'unverified',
  legalTerminologyReview: 'unverified',
} as const;

function isLocale(value: string): value is OperationalLocale {
  return Object.hasOwn(languageTags, value);
}

function isKnownEnglish(value: string): value is keyof typeof dictionary {
  return Object.hasOwn(dictionary, value);
}

function isKey(value: string): value is OperationalKey {
  return Object.hasOwn(en, value);
}

/** Static labels only. Unknown copy keeps its English language annotation. */
export function translateOperational(locale: string, english: string): OperationalText {
  const normalized = locale.trim().toLowerCase().replaceAll('_', '-').split('-')[0] ?? '';
  if (!isLocale(normalized) || !isKnownEnglish(english)) {
    return { text: english, lang: 'en-IN', dir: 'ltr', known: false };
  }
  const key = dictionary[english];
  if (!isKey(key)) return { text: english, lang: 'en-IN', dir: 'ltr', known: false };
  const bundles: Readonly<Partial<Record<OperationalLocale, Readonly<Record<string, string>>>>> = operationalBundles;
  const text = bundles[normalized]?.[key];
  if (!text) return { text: english, lang: 'en-IN', dir: 'ltr', known: false };
  // Explicitly retained Latin names/units remain English even in an RTL interface.
  if (normalized !== 'en' && text === english) {
    return { text, lang: 'en-IN', dir: 'ltr', known: true };
  }
  return { text, lang: languageTags[normalized],
    dir: normalized === 'ks' || normalized === 'sd' || normalized === 'ur' ? 'rtl' : 'ltr', known: true };
}

