"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { isPilotLocale, type PilotLocale } from "@vakil/domain";
import { getLanguage, getMessages, locales } from "@vakil/i18n";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@vakil/ui";
import { productCopy } from "@/lib/copy";

const LocaleContext = createContext<{
  locale: PilotLocale;
  setLocale: (locale: PilotLocale) => void;
}>({ locale: "en", setLocale: () => undefined });

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<PilotLocale>("en");
  useEffect(() => {
    document.documentElement.lang = getLanguage(locale)?.code ?? "en-IN";
  }, [locale]);
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
  };
}

export function LocaleSelect() {
  const { locale, setLocale, messages } = useLocale();
  return (
    <Select
      value={locale}
      onValueChange={(value) => {
        if (isPilotLocale(value)) setLocale(value);
      }}
    >
      <SelectTrigger
        aria-label={messages.navigation.selectLanguage}
        className="locale-select"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-paper text-ink">
        {locales
          .filter((language) => language.isPilot)
          .map((language) => (
            <SelectItem
              key={language.code}
              value={language.code.split("-")[0] ?? "en"}
            >
              {language.nativeName}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
