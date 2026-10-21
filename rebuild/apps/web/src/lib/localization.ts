import type { PilotLocale } from '@vakil/domain';
import { draftBundles, getLanguage, type DraftBundle } from '@vakil/i18n';
import type { ProductCopy } from './copy';
import type { CaseNoSummaryCopy } from './case-copy';
import type { ChatCopy } from './chat-copy';
import type { IntakeChatCopy } from './intake-chat-copy';
import type { FeatureCopy } from './feature-copy';

// Explicit keys let the compiler reject a missing locale when the domain expands.
function mapDrafts<T>(select: (bundle: DraftBundle, locale: PilotLocale) => T): Record<PilotLocale, T> {
  return {
    en: select(draftBundles.en, 'en'),
    as: select(draftBundles.as, 'as'),
    bn: select(draftBundles.bn, 'bn'),
    brx: select(draftBundles.brx, 'brx'),
    doi: select(draftBundles.doi, 'doi'),
    gu: select(draftBundles.gu, 'gu'),
    hi: select(draftBundles.hi, 'hi'),
    kn: select(draftBundles.kn, 'kn'),
    ks: select(draftBundles.ks, 'ks'),
    kok: select(draftBundles.kok, 'kok'),
    mai: select(draftBundles.mai, 'mai'),
    ml: select(draftBundles.ml, 'ml'),
    mni: select(draftBundles.mni, 'mni'),
    mr: select(draftBundles.mr, 'mr'),
    ne: select(draftBundles.ne, 'ne'),
    or: select(draftBundles.or, 'or'),
    pa: select(draftBundles.pa, 'pa'),
    sa: select(draftBundles.sa, 'sa'),
    sat: select(draftBundles.sat, 'sat'),
    sd: select(draftBundles.sd, 'sd'),
    ta: select(draftBundles.ta, 'ta'),
    te: select(draftBundles.te, 'te'),
    ur: select(draftBundles.ur, 'ur'),
  };
}

function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (token, name: string) => values[name] ?? token);
}

function hydrateChat(bundle: DraftBundle, locale: PilotLocale): ChatCopy {
  const templates = bundle.chatCopy;
  const number = new Intl.NumberFormat(getLanguage(locale)?.languageTag ?? 'en-IN');
  return { ...templates,
    selectCheckboxLabel: (fileName) => interpolate(templates.selectCheckboxLabel, { fileName }),
    documentCount: (current, max) => interpolate(templates.documentCount, { current: number.format(current), max: number.format(max) }),
    selectedAttachmentsCount: (current, max, currentBytes, maxBytes) => interpolate(templates.selectedAttachmentsCount, { current: number.format(current), max: number.format(max), currentBytes, maxBytes }),
    charCount: (current, max) => interpolate(templates.charCount, { current: number.format(current), max: number.format(max) }),
  };
}

export const localizedProductCopy = mapDrafts<ProductCopy>(bundle => bundle.productCopy);
export const localizedCaseCopy = mapDrafts<CaseNoSummaryCopy>(bundle => bundle.caseCopy);
export const localizedChatCopy = mapDrafts<ChatCopy>(hydrateChat);
export const localizedIntakeChatCopy = mapDrafts<IntakeChatCopy>(bundle => bundle.intakeChatCopy);
export const localizedFeatureCopy = mapDrafts<FeatureCopy>(bundle => bundle.featureCopy);
