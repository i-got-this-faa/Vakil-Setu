/**
 * @vakil/i18n - Messages and Translation Dictionary
 * Provides typed message bundle lookups for pilot languages (en, hi, pa)
 * and safe fallback for non-pilot locales.
 */

import { normalizeLocale } from './registry';
import { enMessages } from './translations/en';
import { hiMessages } from './translations/hi';
import { paMessages } from './translations/pa';
import type { Messages, PilotLocale } from './types';

/**
 * Message bundles share a typed shape; their presence and script do not establish human language review.
 */
export const translationDictionary: Record<PilotLocale, Messages> = {
  'en-IN': enMessages,
  'hi-IN': hiMessages,
  'pa-IN': paMessages,
};

/**
 * Retrieves the typed message dictionary for a specified locale.
 * Normalizes aliases ('en', 'hi', 'pa', 'en-US', etc.).
 * Falls back to canonical English (en-IN) for non-pilot or unlocalized locales.
 */
export function getMessages(locale: string): Messages {
  const normalized = normalizeLocale(locale);

  if (normalized === 'hi-IN') {
    return hiMessages;
  }

  if (normalized === 'pa-IN') {
    return paMessages;
  }

  // en-IN or fallback
  return enMessages;
}
