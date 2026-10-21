"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { isPilotLocale, type PilotLocale } from "@vakil/domain";
import { getInterfaceLocale, getLanguage, getMessages, localeOptions } from "@vakil/i18n";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@vakil/ui";
import { productCopy } from "@/lib/copy";
import { getLocalizationNotice, LOCALE_STORAGE_KEY, readLocalePreference, saveLocalePreference } from "@/lib/localization-preference";

const LocaleContext = createContext<{
  locale: PilotLocale;
  setLocale: (locale: PilotLocale) => void;
}>({ locale: "en", setLocale: () => undefined });

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<PilotLocale>("en");
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  useEffect(() => {
    setLocale(readLocalePreference());
    setPreferenceLoaded(true);
    const synchronize = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY || event.key === null) setLocale(readLocalePreference());
    };
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, []);
  useEffect(() => {
    if (!preferenceLoaded) return;
    const language = getLanguage(getInterfaceLocale(locale));
    document.documentElement.lang = language?.languageTag ?? "en-IN";
    document.documentElement.dir = language?.direction ?? "ltr";
    saveLocalePreference(locale);
  }, [locale, preferenceLoaded]);
  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  return {
    ...context,
    messages: getMessages(context.locale),
    copy: productCopy[context.locale],
    translationNotice: getLocalizationNotice(context.locale),
  };
}

export function LocaleSelect() {
  const { locale, setLocale, messages, translationNotice } = useLocale();
  const noticeId = useId();
  return (
    <div className="locale-control">
      <Select
        value={locale}
        onValueChange={(value) => {
          if (isPilotLocale(value)) setLocale(value);
        }}
      >
        <SelectTrigger
          aria-label={messages.navigation.selectLanguage}
          aria-describedby={noticeId}
          className="locale-select"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-paper text-ink">
          {localeOptions.map((language) => (
            <SelectItem
              key={language.value}
              value={language.value}
              lang={language.lang}
              dir={language.direction}
            >
              {language.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p id={noticeId} className="mt-1 max-w-64 text-xs text-muted">
        {translationNotice}
      </p>
    </div>
  );
}
