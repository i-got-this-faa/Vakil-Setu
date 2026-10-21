/**
 * @vakil/i18n
 * Platform-independent internationalization package for Vakil Setu.
 * Supports English and all 22 Eighth Schedule Indian languages.
 */

export * from './types';
export { draftBundles, draftedLocales, hasDraftTranslation } from './draft-bundles';
export type { DraftBundle } from './draft-bundles';
export {
  locales,
  getLanguage,
  getInterfaceLocale,
  isPilotLocale,
  normalizeLocale,
  getLocaleOptions,
  localeOptions,
  getLanguageCapabilities,
  translationQuality,
} from './registry';
export type { RuntimeLanguageConfiguration } from './registry';
export {
  translationDictionary,
  getMessages,
} from './messages';
export { enMessages } from './translations/en';
export { hiMessages } from './translations/hi';
export { paMessages } from './translations/pa';
