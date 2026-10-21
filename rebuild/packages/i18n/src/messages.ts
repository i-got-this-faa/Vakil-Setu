import { draftBundles } from './draft-bundles';
import { normalizeLocale } from './registry';
import type { Messages, SupportedLocaleCode } from './types';

/** Registered languages resolve to draft copy or an explicitly labeled English fallback. */
export const translationDictionary: Record<SupportedLocaleCode, Messages> = {
  'en-IN': draftBundles.en.sharedMessages,
  'as-IN': draftBundles.as.sharedMessages,
  'bn-IN': draftBundles.bn.sharedMessages,
  'brx-IN': draftBundles.brx.sharedMessages,
  'doi-IN': draftBundles.doi.sharedMessages,
  'gu-IN': draftBundles.gu.sharedMessages,
  'hi-IN': draftBundles.hi.sharedMessages,
  'kn-IN': draftBundles.kn.sharedMessages,
  'ks-IN': draftBundles.ks.sharedMessages,
  'kok-IN': draftBundles.kok.sharedMessages,
  'mai-IN': draftBundles.mai.sharedMessages,
  'ml-IN': draftBundles.ml.sharedMessages,
  'mni-IN': draftBundles.mni.sharedMessages,
  'mr-IN': draftBundles.mr.sharedMessages,
  'ne-IN': draftBundles.ne.sharedMessages,
  'or-IN': draftBundles.or.sharedMessages,
  'pa-IN': draftBundles.pa.sharedMessages,
  'sa-IN': draftBundles.sa.sharedMessages,
  'sat-IN': draftBundles.sat.sharedMessages,
  'sd-IN': draftBundles.sd.sharedMessages,
  'ta-IN': draftBundles.ta.sharedMessages,
  'te-IN': draftBundles.te.sharedMessages,
  'ur-IN': draftBundles.ur.sharedMessages,
};

/** Unfinished translations have explicit English fallback and unavailable interface metadata. */
export function getMessages(locale: string): Messages {
  return translationDictionary[normalizeLocale(locale) ?? 'en-IN'];
}
