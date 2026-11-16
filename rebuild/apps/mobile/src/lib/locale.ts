import { getLanguage, type Locale } from "@legal-setu/i18n";

/** Interface languages the mobile app ships with draft bundles. */
export const INTERFACE_LOCALES = ["en", "hi", "pa"] as const;
export type InterfaceLocale = (typeof INTERFACE_LOCALES)[number];
export const DEFAULT_INTERFACE_LOCALE: InterfaceLocale = "en";
export const LOCALE_STORAGE_KEY = "legal-setu.locale";

const INTERFACE_LOCALE_SET: ReadonlySet<string> = new Set(INTERFACE_LOCALES);

export function isInterfaceLocale(value: unknown): value is InterfaceLocale {
  return typeof value === "string" && INTERFACE_LOCALE_SET.has(value);
}

/** Accept short codes and registry tags (e.g. "hi-IN"); anything else falls back to English. */
export function parseInterfaceLocale(value: unknown): InterfaceLocale {
  if (typeof value !== "string") return DEFAULT_INTERFACE_LOCALE;
  if (isInterfaceLocale(value)) return value;
  const shortCode: Locale | undefined = getLanguage(value)?.shortCode;
  return isInterfaceLocale(shortCode) ? shortCode : DEFAULT_INTERFACE_LOCALE;
}

/** BCP-47 tag used for date formatting and speech for an interface or intake locale. */
export function languageTagFor(locale: string): string {
  return getLanguage(locale)?.languageTag ?? "en-IN";
}
