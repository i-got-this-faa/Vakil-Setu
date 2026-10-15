"use client";

import { Button, Input, Textarea, Label } from "@vakil/ui";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Mic, Square, Volume2 } from "lucide-react";
import { useLocale } from "./locale";
import type { PilotLocale } from "@vakil/domain";
import { LocalReadAloud } from "./local-read-aloud";

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  isFinal: boolean;
  readonly [index: number]: RecognitionAlternative | undefined;
}
interface RecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    readonly [index: number]: RecognitionResult | undefined;
  };
}
interface BrowserRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
// Web Speech recognition is vendor-prefixed and absent from lib.dom; these are its used surface.
declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserRecognition;
    webkitSpeechRecognition?: new () => BrowserRecognition;
  }
}

const languageTags: Record<PilotLocale, string> = {
  en: "en-IN",
  hi: "hi-IN",
  pa: "pa-IN",
};

export function SpeechCapture({
  locale,
  onAppend,
}: {
  locale: PilotLocale;
  onAppend: (text: string) => void;
}) {
  const { copy, messages } = useLocale();
  const recognition = useRef<BrowserRecognition | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    setSupported(
      Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition),
    );
    return () => {
      recognition.current?.abort();
      recognition.current = null;
    };
  }, []);
  useEffect(() => {
    recognition.current?.abort();
    setRecording(false);
    setInterimText("");
  }, [locale]);
  function start() {
    const Constructor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Constructor || !consent) return;
    const instance = new Constructor();
    recognition.current = instance;
    instance.lang = languageTags[locale];
    instance.continuous = true;
    instance.interimResults = true;
    instance.onresult = (event) => {
      let final = "",
        interim = "";
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index++
      ) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript ?? "";
        if (result?.isFinal) final += transcript + " ";
        else interim += transcript;
      }
      if (final) setFinalText((previous) => (previous + " " + final).trim());
      setInterimText(interim);
    };
    instance.onerror = (event) => {
      setError(
        event.error === "not-allowed"
          ? "Microphone permission was denied. You can type your concern below."
          : "Speech capture did not complete. Language support and connectivity depend on your browser; use typed input.",
      );
      setRecording(false);
    };
    instance.onend = () => {
      setRecording(false);
      setInterimText("");
    };
    try {
      setError("");
      instance.start();
      setRecording(true);
    } catch {
      setError("Speech capture could not start. Type your concern below.");
    }
  }
  return (
    <section
      className="speech-panel"
      aria-label="Optional browser voice capture"
    >
      <p>
        <strong>Optional browser speech input</strong> · availability{" "}
        {supported === null
          ? "unknown until this browser is checked"
          : supported
            ? "detected; language accuracy unverified"
            : "unavailable in this browser"}
        .
      </p>
      <p>{copy.voiceDisclosure}</p>
      <Label className="checkbox-line">
        <Input
          type="checkbox"
          checked={consent}
          disabled={recording}
          onChange={(event) => setConsent(event.target.checked)}
        />
        {copy.voiceConsent}
      </Label>
      <div className="actions" style={{ marginTop: 14 }}>
        {recording ? (
          <Button
            type="button"
            className="btn secondary small"
            onClick={() => recognition.current?.stop()}
          >
            <Square size={14} />
            {messages.voice.stopRecording}
          </Button>
        ) : (
          <Button
            type="button"
            className="btn secondary small"
            disabled={!supported || !consent}
            onClick={start}
          >
            <Mic size={15} />
            {messages.voice.recordAudio}
          </Button>
        )}
      </div>
      {recording && (
        <p role="status" style={{ marginTop: 12 }}>
          Listening… stop capture, then review the final transcript.
        </p>
      )}
      {interimText && (
        <p className="transcript" aria-live="off">
          Tentative words (not added): {interimText}
        </p>
      )}
      {finalText && (
        <>
          <div className="field" style={{ marginTop: 15 }}>
            <Label htmlFor="speech-transcript">{copy.transcriptReview}</Label>
            <Textarea
              id="speech-transcript"
              lang={languageTags[locale]}
              value={finalText}
              onChange={(event) => setFinalText(event.target.value)}
              maxLength={10000}
            />
          </div>
          <div className="actions" style={{ marginTop: 12 }}>
            <Button
              type="button"
              className="btn small"
              disabled={recording || !finalText.trim()}
              onClick={() => {
                onAppend(finalText.trim());
                setFinalText("");
              }}
            >
              {copy.addTranscript}
            </Button>
            <Button
              type="button"
              className="btn secondary small"
              disabled={recording}
              onClick={() => {
                setFinalText("");
                setInterimText("");
              }}
            >
              Discard transcript
            </Button>
          </div>
        </>
      )}
      {error && (
        <p
          className="status-message error"
          role="alert"
          style={{ marginTop: 14 }}
        >
          {error}
        </p>
      )}
    </section>
  );
}

export function ReadAloud({
  text,
  locale,
}: {
  text: string;
  locale: PilotLocale;
}) {
  return locale === "en"
    ? <DeviceReadAloud text={text} locale={locale} />
    : <LocalReadAloud text={text} locale={locale} />;
}

function DeviceReadAloud({
  text,
  locale,
}: {
  text: string;
  locale: PilotLocale;
}) {
  const { copy } = useLocale();
  const statusId = useId();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [playback, setPlayback] = useState<
    "idle" | "starting" | "speaking" | "finished" | "stopped" | "error" | "blocked"
  >("idle");
  // Keep the utterance alive and ignore late events from cancelled playback.
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const startTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const releasePlayback = useCallback(() => {
    const current = utterance.current;
    utterance.current = null;
    if (startTimeout.current !== null) {
      clearTimeout(startTimeout.current);
      startTimeout.current = null;
    }
    return current;
  }, []);
  const cancelPlayback = useCallback(() => {
    if (releasePlayback()) window.speechSynthesis.cancel();
  }, [releasePlayback]);
  useEffect(() => {
    cancelPlayback();
    setPlayback("idle");
    return cancelPlayback;
  }, [text, locale, cancelPlayback]);
  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setAvailable(false);
      return;
    }
    const update = () => {
      setVoices(window.speechSynthesis.getVoices());
      setAvailable(true);
    };
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", update);
    };
  }, []);
  const matching = voices.filter(
    (voice) =>
      voice.localService && voice.lang.toLowerCase().startsWith(locale),
  );
  const busy = playback === "starting" || playback === "speaking";
  const status = available === null
    ? copy.readAloud.checking
    : !available
      ? copy.readAloud.unavailable
      : !matching.length
        ? copy.readAloud.noVoice
        : !text.trim()
          ? copy.readAloud.empty
          : playback === "idle"
            ? copy.readAloud.ready
            : copy.readAloud[playback];
  function speak() {
    const voice = matching.find((voice) => voice.lang.toLowerCase() === languageTags[locale].toLowerCase())
      ?? matching.find((voice) => voice.default)
      ?? matching[0];
    if (!voice || !text.trim() || utterance.current) return;
    window.speechSynthesis.cancel();
    const current = new SpeechSynthesisUtterance(text.trim());
    utterance.current = current;
    current.voice = voice;
    current.lang = voice.lang;
    current.onstart = () => {
      if (utterance.current !== current) return;
      if (startTimeout.current !== null) clearTimeout(startTimeout.current);
      startTimeout.current = null;
      setPlayback("speaking");
    };
    current.onend = () => {
      if (utterance.current !== current) return;
      releasePlayback();
      setPlayback("finished");
    };
    current.onerror = (event) => {
      if (utterance.current !== current) return;
      releasePlayback();
      setPlayback(event.error === "not-allowed"
        ? "blocked"
        : event.error === "canceled" || event.error === "interrupted"
          ? "stopped"
          : "error");
    };
    setPlayback("starting");
    startTimeout.current = setTimeout(() => {
      if (utterance.current !== current) return;
      cancelPlayback();
      setPlayback("error");
    }, 10000);
    try {
      window.speechSynthesis.speak(current);
    } catch {
      cancelPlayback();
      setPlayback("error");
    }
  }
  return (
    <div>
      <p id={statusId} role="status" className="muted small-text">
        {status}
      </p>
      <div className="actions" style={{ marginTop: 10 }}>
        <Button
          type="button"
          className="btn secondary small"
          disabled={!matching.length || !text.trim() || busy}
          aria-describedby={statusId}
          onClick={speak}
        >
          <Volume2 size={15} />
          {copy.readAloud.label}
        </Button>
        <Button
          type="button"
          className="btn secondary small"
          disabled={!busy}
          onClick={() => {
            cancelPlayback();
            setPlayback("stopped");
          }}
        >
          {copy.readAloud.stop}
        </Button>
      </div>
    </div>
  );
}
