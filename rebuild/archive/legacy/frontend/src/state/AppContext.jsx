import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clearChatStorage,
  loadChatFromStorage,
  loadSessionFromStorage,
  saveChatToStorage,
  saveSessionToStorage
} from "../utils/chatMessages";

const AppContext = createContext(null);

const restored = loadSessionFromStorage();

export function AppProvider({ children }) {
  const [voiceText, setVoiceText] = useState(restored?.voiceText || "");
  const [classification, setClassification] = useState(restored?.classification || null);
  const [advocates, setAdvocates] = useState(restored?.advocates || []);
  const [selectedAdvocate, setSelectedAdvocate] = useState(null);
  const [booking, setBooking] = useState(null);
  const [ttsLang, setTtsLang] = useState(restored?.ttsLang || "en-IN");
  const [chatMessages, setChatMessages] = useState(() => loadChatFromStorage());
  const [preferredLanguage, setPreferredLanguage] = useState("auto");

  useEffect(() => {
    saveChatToStorage(chatMessages);
  }, [chatMessages]);

  useEffect(() => {
    if (!classification && !chatMessages.length) return;
    saveSessionToStorage({ classification, advocates, ttsLang, voiceText });
  }, [classification, advocates, ttsLang, voiceText, chatMessages.length]);

  const appendChatMessages = useCallback((messages) => {
    setChatMessages((prev) => [...prev, ...messages]);
  }, []);

  const clearSession = useCallback(() => {
    setVoiceText("");
    setClassification(null);
    setAdvocates([]);
    setSelectedAdvocate(null);
    setChatMessages([]);
    clearChatStorage();
  }, []);

  const value = useMemo(
    () => ({
      voiceText,
      setVoiceText,
      classification,
      setClassification,
      advocates,
      setAdvocates,
      selectedAdvocate,
      setSelectedAdvocate,
      booking,
      setBooking,
      ttsLang,
      setTtsLang,
      chatMessages,
      setChatMessages,
      appendChatMessages,
      clearSession,
      preferredLanguage,
      setPreferredLanguage
    }),
    [
      voiceText,
      classification,
      advocates,
      selectedAdvocate,
      booking,
      ttsLang,
      chatMessages,
      appendChatMessages,
      clearSession,
      preferredLanguage
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppProvider");
  }
  return ctx;
}
