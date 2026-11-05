import { isPilotLocale, type PilotLocale } from "@legal-setu/domain";
import { draftBundles, getLanguage } from "@legal-setu/i18n";

export const LOCALE_STORAGE_KEY = "legal-setu.locale";
type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;

/** Accept stored short codes and historical registry tags without rewriting backend records. */
export function readLocalePreference(storage?: PreferenceStorage): PilotLocale {
  try {
    const preferences = storage ?? window.localStorage;
    // Keep preferences saved before the Legal-Setu rename readable.
    const value = preferences.getItem(LOCALE_STORAGE_KEY) ?? preferences.getItem("vakil-setu.locale");
    if (isPilotLocale(value)) return value;
    const shortCode = value ? getLanguage(value)?.shortCode : undefined;
    return isPilotLocale(shortCode) ? shortCode : "en";
  } catch {
    return "en";
  }
}

export function saveLocalePreference(locale: PilotLocale, storage?: PreferenceStorage): void {
  try { (storage ?? window.localStorage).setItem(LOCALE_STORAGE_KEY, locale); } catch { /* Preference remains usable when storage is blocked. */ }
}

export function getLocalizationNotice(locale: PilotLocale): string {
  return draftBundles[locale].qualityNotice;
}
