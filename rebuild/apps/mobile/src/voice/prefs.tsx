import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { getRandomBytes } from "expo-crypto";
import { isVoiceLocale, type VoiceLocale } from "@legal-setu/domain";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { phrasesFor, type Phrases } from "./languages";
import { FRESH_CONVERSATION, restoreConversation, type ConversationSelection } from "./conversation-selection";

const LOCALE_KEY = "legal-setu.voice-locale";
const CONVERSATION_KEY = "legal-setu.conversation";
const GUEST_KEY = "legal-setu.guest-token";

/** A device-made bearer secret for talking before sign-in. The server only stores its hash. */
function newGuestToken(): string {
  const bytes = getRandomBytes(32);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

interface VoicePrefs {
  readonly ready: boolean;
  readonly locale: VoiceLocale | null;
  readonly phrases: Phrases;
  readonly guestToken: string | null;
  readonly conversationId: string | null;
  readonly resumeLatest: boolean;
  setLocale(locale: VoiceLocale): void;
  setConversationId(id: string | null): void;
  /** After sign-out (or once a guest token is claimed) the device starts a fresh guest identity. */
  resetGuest(): void;
}

const Context = createContext<VoicePrefs | null>(null);

export function VoicePrefsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [locale, setLocaleState] = useState<VoiceLocale | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [selection, setSelection] = useState<ConversationSelection>({ kind: "resume" });
  const conversationId = selection.kind === "open" ? selection.id : null;
  const resumeLatest = selection.kind === "resume";

  useEffect(() => {
    let active = true;
    (async () => {
      const [storedLocale, storedConversation] = await Promise.all([
        AsyncStorage.getItem(LOCALE_KEY).catch(() => null),
        AsyncStorage.getItem(CONVERSATION_KEY).catch(() => null),
      ]);
      let token = await SecureStore.getItemAsync(GUEST_KEY).catch(() => null);
      if (!token) {
        token = newGuestToken();
        await SecureStore.setItemAsync(GUEST_KEY, token).catch(() => undefined);
      }
      if (!active) return;
      if (isVoiceLocale(storedLocale)) setLocaleState(storedLocale);
      setSelection(restoreConversation(storedConversation, process.env.EXPO_PUBLIC_DEMO_MODE === "1"));
      setGuestToken(token);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const setLocale = useCallback((next: VoiceLocale) => {
    setLocaleState(next);
    AsyncStorage.setItem(LOCALE_KEY, next).catch(() => undefined);
  }, []);
  const setConversationId = useCallback((id: string | null) => {
    setSelection(id ? { kind: "open", id } : { kind: "fresh" });
    AsyncStorage.setItem(CONVERSATION_KEY, id ?? FRESH_CONVERSATION).catch(() => undefined);
  }, []);
  const resetGuest = useCallback(() => {
    const token = newGuestToken();
    setGuestToken(token);
    SecureStore.setItemAsync(GUEST_KEY, token).catch(() => undefined);
    setConversationId(null);
  }, [setConversationId]);

  const value = useMemo<VoicePrefs>(() => ({
    ready, locale, phrases: phrasesFor(locale ?? "hi"), guestToken, conversationId, resumeLatest, setLocale, setConversationId, resetGuest,
  }), [ready, locale, guestToken, conversationId, resumeLatest, setLocale, setConversationId, resetGuest]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useVoicePrefs(): VoicePrefs {
  const value = useContext(Context);
  if (!value) throw new Error("useVoicePrefs must be used inside VoicePrefsProvider.");
  return value;
}
