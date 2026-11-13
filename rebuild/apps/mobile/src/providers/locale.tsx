import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { draftBundles, getLanguage, getMessages, type Locale, type Messages } from "@legal-setu/i18n";
import {
  DEFAULT_INTERFACE_LOCALE,
  LOCALE_STORAGE_KEY,
  parseInterfaceLocale,
  type InterfaceLocale,
} from "../lib/locale";

interface LocaleContextValue {
  readonly locale: InterfaceLocale;
  readonly setLocale: (locale: InterfaceLocale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({ locale: DEFAULT_INTERFACE_LOCALE, setLocale: () => undefined });

/** Interface language persists on the device only; it is never sent as a secret or private value. */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<InterfaceLocale>(DEFAULT_INTERFACE_LOCALE);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(LOCALE_STORAGE_KEY)
      .then((stored) => {
        if (active && stored !== null) setLocaleState(parseInterfaceLocale(stored));
      })
      .catch(() => undefined); // Storage can be unavailable; English remains usable.
    return () => {
      active = false;
    };
  }, []);

  const setLocale = useCallback((next: InterfaceLocale) => {
    setLocaleState(next);
    AsyncStorage.setItem(LOCALE_STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export interface AppCopy {
  readonly locale: Locale;
  readonly messages: Messages;
  readonly product: (typeof draftBundles)[InterfaceLocale]["productCopy"];
  readonly chat: (typeof draftBundles)[InterfaceLocale]["chatCopy"];
  readonly intake: (typeof draftBundles)[InterfaceLocale]["intakeChatCopy"];
  readonly caseCopy: (typeof draftBundles)[InterfaceLocale]["caseCopy"];
  readonly feature: (typeof draftBundles)[InterfaceLocale]["featureCopy"];
  readonly qualityNotice: string;
  readonly languageName: string;
}

/** Draft copy for any registered language. Interface screens only offer the pilot interface languages. */
export function copyFor(locale: Locale): AppCopy {
  const bundle = draftBundles[locale];
  return {
    locale,
    messages: getMessages(locale),
    product: bundle.productCopy,
    chat: bundle.chatCopy,
    intake: bundle.intakeChatCopy,
    caseCopy: bundle.caseCopy,
    feature: bundle.featureCopy,
    qualityNotice: bundle.qualityNotice,
    languageName: getLanguage(locale)?.nativeName ?? locale,
  };
}

export function useLocale(): LocaleContextValue & { copy: AppCopy; messages: Messages } {
  const context = useContext(LocaleContext);
  const copy = copyFor(context.locale);
  return { ...context, copy, messages: copy.messages };
}
