import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { triageIssue } from "../api/client";
import { useAppState } from "../state/AppContext";
import {
  assistantFromClassification,
  createMessage,
  historyForApi
} from "../utils/chatMessages";
import { bcp47FromUiLanguage, speakWithWebSpeech } from "../utils/webSpeech";
import { speakableAnalysisText, ttsLocaleFromClassification } from "../utils/classificationSpeak";

const LOADING_STEPS = [
  "Understanding your issue…",
  "Classifying under Indian law…",
  "Matching advocates for you…"
];

const PREVIEW_NAV_DELAY_MS = 700;

export function useLegalChat({ navigateAfterFirstResult = false } = {}) {
  const ttsEnabled = (import.meta.env.VITE_ENABLE_TTS || "true") === "true";
  const navigate = useNavigate();
  const {
    chatMessages,
    appendChatMessages,
    setClassification,
    setAdvocates,
    setVoiceText,
    setTtsLang,
    clearSession
  } = useAppState();

  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState(LOADING_STEPS[0]);
  const [error, setError] = useState("");
  const stepTimerRef = useRef(null);
  const navTimerRef = useRef(null);

  useEffect(() => {
    if (!loading) {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      return undefined;
    }

    let stepIndex = 0;
    setLoadingLabel(LOADING_STEPS[0]);
    stepTimerRef.current = setInterval(() => {
      stepIndex = (stepIndex + 1) % LOADING_STEPS.length;
      setLoadingLabel(LOADING_STEPS[stepIndex]);
    }, 2400);

    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, [loading]);

  useEffect(
    () => () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    },
    []
  );

  const submitMessage = useCallback(
    async (text, preferredLanguage = "auto") => {
      const trimmed = String(text || "").trim();
      if (!trimmed || loading) return;

      const isFirstTurn = chatMessages.filter((m) => m.role === "user").length === 0;
      const userMsg = createMessage("user", trimmed);
      const nextMessages = [...chatMessages, userMsg];

      try {
        setLoading(true);
        setError("");
        appendChatMessages([userMsg]);

        const history = historyForApi(nextMessages);
        const { classification, advocates } = await triageIssue(trimmed, history);

        const speakLocale = ttsLocaleFromClassification(
          classification,
          bcp47FromUiLanguage(preferredLanguage)
        );

        setVoiceText(trimmed);
        setClassification(classification);
        setAdvocates(advocates || []);
        setTtsLang(speakLocale);

        const assistantMsg = createMessage("assistant", assistantFromClassification(classification), {
          classification
        });
        appendChatMessages([assistantMsg]);

        const goResults = navigateAfterFirstResult && isFirstTurn;
        if (goResults) {
          navTimerRef.current = setTimeout(() => {
            if (ttsEnabled) {
              const toSpeak =
                speakableAnalysisText(classification) ||
                classification.summary ||
                "Analysis complete";
              speakWithWebSpeech(toSpeak, speakLocale);
            }
            navigate("/results");
            setLoading(false);
          }, PREVIEW_NAV_DELAY_MS);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setError(err.message || "Something went wrong. Please try again.");
        setLoading(false);
      }
    },
    [
      loading,
      chatMessages,
      appendChatMessages,
      setVoiceText,
      setClassification,
      setAdvocates,
      setTtsLang,
      navigateAfterFirstResult,
      navigate,
      ttsEnabled
    ]
  );

  const startNewCase = useCallback(() => {
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    clearSession();
    setError("");
    setLoading(false);
    navigate("/");
  }, [clearSession, navigate]);

  return {
    chatMessages,
    loading,
    loadingLabel,
    error,
    setError,
    submitMessage,
    startNewCase
  };
}
