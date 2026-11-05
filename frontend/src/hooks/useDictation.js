import { useEffect, useRef, useState } from "react";
import { createDictation } from "../utils/dictation";
import { bcp47FromUiLanguage } from "../utils/webSpeech";

export function useDictation({ text, setText, language }) {
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const session = useRef(null);
  const draftBefore = useRef("");
  useEffect(() => () => session.current?.dispose(), []);
  const start = () => {
    if (phase !== "idle") return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setError("Dictation is unavailable in this browser. Use Chrome or Edge, or type instead."); return; }
    session.current?.dispose();
    draftBefore.current = text;
    session.current = createDictation({ Recognition, language: bcp47FromUiLanguage(language), draft: text,
      onText: setText, onState: setPhase, onError: setError,
      cancelPlayback: () => window.speechSynthesis?.cancel() });
    session.current.start();
  };
  const cancel = () => {
    session.current?.dispose();
    session.current = null;
    setPhase("idle");
    setError("");
    setText(draftBefore.current);
  };
  return { phase, error, isRecording: phase !== "idle", start, stop: () => session.current?.stop(), cancel };
}
