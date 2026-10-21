import type { Locale } from './types';
import en from './translations/drafts/en.json';
import as from './translations/drafts/as.json';
import bn from './translations/drafts/bn.json';
import brx from './translations/drafts/brx.json';
import doi from './translations/drafts/doi.json';
import gu from './translations/drafts/gu.json';
import hi from './translations/drafts/hi.json';
import kn from './translations/drafts/kn.json';
import ks from './translations/drafts/ks.json';
import kok from './translations/drafts/kok.json';
import mai from './translations/drafts/mai.json';
import mr from './translations/drafts/mr.json';
import pa from './translations/drafts/pa.json';

export const draftedLocales = ['en', 'as', 'bn', 'brx', 'doi', 'gu', 'hi', 'kn', 'ks', 'kok', 'mai', 'mr', 'pa'] as const;
export function hasDraftTranslation(locale: string): boolean {
  return draftedLocales.some(code => code === locale);
}
function englishFallback(language: string): typeof en {
  return { ...en, qualityNotice: `${language} interface translation is unavailable. English interface text is shown. Existing draft translations have not been independently reviewed for language quality or legal terminology.` };
}

/** Explicit English fallback for unfinished locales; registry metadata marks their interface unavailable. */
export const draftBundles = {
  en,
  as,
  bn,
  brx,
  doi,
  gu,
  hi,
  kn,
  ks,
  kok,
  mai,
  ml: englishFallback('Malayalam'),
  mni: englishFallback('Manipuri (Meitei)'),
  mr,
  ne: englishFallback('Nepali'),
  or: englishFallback('Odia'),
  pa,
  sa: englishFallback('Sanskrit'),
  sat: englishFallback('Santali'),
  sd: englishFallback('Sindhi'),
  ta: englishFallback('Tamil'),
  te: englishFallback('Telugu'),
  ur: englishFallback('Urdu'),
} satisfies Record<Locale, typeof en>;
export type DraftBundle = typeof en;
