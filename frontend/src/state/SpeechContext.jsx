import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useInRouterContext, useLocation } from "react-router-dom";
import { api } from "@convex-api";
import { useServices, useServiceQuery } from "./ConvexServices";
import { createSpeechPlayback } from "../services/speechPlayback";
import { speakWithWebSpeech } from "../utils/webSpeech";

const IDLE_PLAYBACK = Object.freeze({ status: "idle", id: null, provider: null, error: "", cached: [] });
const NOOP_CONTEXT = {
  playback: IDLE_PLAYBACK,
  consent: false,
  setConsent: () => {},
  naturalVoice: { loaded: false, configured: false, languages: [], reason: "" },
  naturalSupportsLocale: () => false,
  deviceSupported: false,
  speak: () => Promise.resolve(),
  stop: () => {},
};
const SpeechContext = createContext(NOOP_CONTEXT);
export const useSpeech = () => useContext(SpeechContext);

// Reply language decides the device voice tag. The server allowlist decides natural-voice eligibility.
export function deviceLangFor(locale) {
  if (locale === "hi") return "hi-IN";
  if (locale === "pa") return "pa-IN";
  return "en-IN";
}

const browserAudio = url => new Audio(url);
const audioUrl = (bytes, mimeType) => URL.createObjectURL(new Blob([bytes], { type: mimeType }));
const revokeUrl = url => URL.revokeObjectURL(url);

// Mounted inside the session scope (remounted per Clerk user). It is also reset on case and route changes.
// Route watcher is mounted only inside a router, so the provider also works in router-less tests and shells.
function RouteStop({ controller }) {
  const location = useLocation();
  useEffect(() => { controller.stop(); }, [controller, location.pathname]);
  return null;
}

export function SpeechProvider({ activeCaseId = null, children }) {
  const services = useServices();
  const inRouter = useInRouterContext();
  const [consent, setConsent] = useState(false);
  const [playback, setPlayback] = useState(IDLE_PLAYBACK);
  const clientRef = useRef(services.client);
  const readyRef = useRef(services.status === "ready");
  const consentRef = useRef(false);
  clientRef.current = services.client;
  readyRef.current = services.status === "ready";
  consentRef.current = consent;

  const capabilities = useServiceQuery(api.speech.capabilities, {}, false);

  // Natural voice only after an explicit, current opt-in. The server still re-checks ownership and consent.
  const [controller] = useState(() => createSpeechPlayback({
    onChange: setPlayback,
    createAudio: browserAudio,
    createAudioUrl: audioUrl,
    revokeAudioUrl: revokeUrl,
    speakOnDevice: (text, locale, handlers) => speakWithWebSpeech(text, locale, handlers),
    synthesize: async ({ turnId }) => {
      if (!consentRef.current) return { kind: "unavailable", reason: "consent_required" };
      const client = clientRef.current;
      if (!client || !readyRef.current) return { kind: "unavailable", reason: "not_ready" };
      try {
        return await client.action(api.speech.synthesize, { turnId, consent: true });
      } catch (error) {
        const code = error?.data?.code;
        return { kind: "unavailable", reason: code === "RATE_LIMITED" ? "rate_limited" : code === "CONFLICT" ? "in_progress" : "provider_failed" };
      }
    },
  }));

  // Account and case scope: stop audio, revoke cached object URLs, drop in-flight results and clear consent.
  const scope = `${services.userId || ""}|${activeCaseId || ""}`;
  useEffect(() => {
    controller.reset();
    setConsent(false);
  }, [controller, scope]);
  useEffect(() => () => controller.dispose(), [controller]);

  const naturalConfigured = Boolean(capabilities.data?.configured);
  const naturalLanguages = capabilities.data?.languages || [];
  const value = {
    playback,
    consent,
    setConsent,
    naturalVoice: { loaded: capabilities.data !== undefined, configured: naturalConfigured, languages: naturalLanguages, reason: capabilities.data?.reason || "" },
    naturalSupportsLocale: locale => naturalConfigured && naturalLanguages.includes(locale),
    deviceSupported: typeof window !== "undefined" && "speechSynthesis" in window,
    // item: { id, turnId, text, locale }. provider: "elevenlabs" | "device".
    speak: (item, provider) => controller.play({ ...item, provider }),
    stop: () => controller.stop(),
  };
  return <SpeechContext.Provider value={value}>{inRouter && <RouteStop controller={controller} />}{children}</SpeechContext.Provider>;
}
