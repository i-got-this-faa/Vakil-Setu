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
import { ttsLocaleFromClassification } from "../utils/classificationSpeak";

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
    sessionGeneration,
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
  const generation = sessionGeneration.current;

  useEffect(() => {
    setLoading(false);
    setError("");
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
  }, [generation]);

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

      const requestGeneration = sessionGeneration.current;
      const userMsg = createMessage("user", trimmed);

      try {
        setLoading(true);
        setError("");
        appendChatMessages([userMsg]);

        const history = historyForApi(chatMessages);
        const { classification, advocates, legalAnswer } = await triageIssue(trimmed, history, preferredLanguage);
        if (requestGeneration !== sessionGeneration.current) {
          return;
        }

        const speakLocale = ttsLocaleFromClassification(
          classification,
          bcp47FromUiLanguage(preferredLanguage)
        );

        setVoiceText(trimmed);
        const hasAnalysis = classification.status === "classified";
        setClassification(hasAnalysis ? { ...classification, summary: assistantFromClassification(classification, legalAnswer), legalAnswer } : null);
        setAdvocates(advocates || []);
        setTtsLang(speakLocale);

        const assistantMsg = createMessage("assistant", assistantFromClassification(classification, legalAnswer), {
          legalAnswer,
          classification
        });
        appendChatMessages([assistantMsg]);

        if (ttsEnabled) speakWithWebSpeech(assistantMsg.content, speakLocale);

        if (!hasAnalysis) {
          setLoading(false);
          navigate("/chat");
          return;
        }

        const goResults = navigateAfterFirstResult;
        if (goResults) {
          navTimerRef.current = setTimeout(() => {
            if (requestGeneration !== sessionGeneration.current) { setLoading(false); return; }
            navigate("/results");
            setLoading(false);
          }, PREVIEW_NAV_DELAY_MS);
        } else {
          setLoading(false);
        }
      } catch (err) {
        if (requestGeneration !== sessionGeneration.current) return;
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
    navigate("/chat");
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
