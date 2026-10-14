/**
 * @vakil/i18n
 * Platform-independent internationalization package for Vakil Setu.
 * Supports English and all 22 Eighth Schedule Indian languages.
 */

export * from './types';
export {
  locales,
  getLanguage,
  isPilotLocale,
  normalizeLocale,
} from './registry';
export {
  translationDictionary,
  getMessages,
} from './messages';
export { enMessages } from './translations/en';
export { hiMessages } from './translations/hi';
export { paMessages } from './translations/pa';
