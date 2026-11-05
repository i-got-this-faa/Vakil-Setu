import { locales } from "@legal-setu/i18n";

export function LanguageOptions() {
  return <>{locales.map(language => <option key={language.code} value={language.shortCode} lang={language.languageTag} dir={language.direction}>{language.nativeName}</option>)}</>;
}
