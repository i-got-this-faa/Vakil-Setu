import { createContext, useContext, useMemo, useState } from "react";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [voiceText, setVoiceText] = useState("");
  const [classification, setClassification] = useState(null);
  const [advocates, setAdvocates] = useState([]);
  const [selectedAdvocate, setSelectedAdvocate] = useState(null);
  const [booking, setBooking] = useState(null);
  /** BCP-47 language for Web Speech TTS on results (from home language choice). */
  const [ttsLang, setTtsLang] = useState("en-IN");

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
      setTtsLang
    }),
    [voiceText, classification, advocates, selectedAdvocate, booking, ttsLang]
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
