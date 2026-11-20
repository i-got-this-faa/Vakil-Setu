// DEMO MODE ONLY: stands in for src/voice/speaker.ts. Same API, but instead of fetching and playing audio it
// "speaks" each sentence for the exact length of its pre-made clip (public/demo-audio) and logs when each clip
// starts, so the recording script can lay the real audio on the soundtrack at those moments.
import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceLocale } from "@legal-setu/domain";
import { splitForSpeech } from "../voice/logic";
import { clipName } from "./store";
import durations from "./clip-durations.json";

const LIP_TICK_MS = 260;
const GAP_MS = 150;

declare global {
  // eslint-disable-next-line no-var
  var __demoSpeaking: number | undefined;
}

export function useSpeaker(_locale: VoiceLocale) {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const listeners = useRef(new Set<() => void>());
  const onWord = useCallback((listener: () => void) => {
    listeners.current.add(listener);
    return () => void listeners.current.delete(listener);
  }, []);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const active = useRef(false);

  const halt = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (ticker.current) clearInterval(ticker.current);
    ticker.current = null;
    if (active.current) globalThis.__demoSpeaking = Math.max(0, (globalThis.__demoSpeaking ?? 1) - 1);
    active.current = false;
  }, []);
  useEffect(() => halt, [halt]);

  const speak = useCallback((id: string, text: string) => {
    if (!text.trim()) return;
    // The demo goes straight from choosing a time to booking: the case summary is not read aloud.
    if (id === "summary") return;
    halt();
    setSpeakingId(id);
    active.current = true;
    globalThis.__demoSpeaking = (globalThis.__demoSpeaking ?? 0) + 1;
    ticker.current = setInterval(() => listeners.current.forEach((listener) => listener()), LIP_TICK_MS);
    let at = 0;
    // One clip for the whole message when it exists (natural delivery); otherwise one per sentence.
    const whole = clipName(text);
    const pieces = whole in durations ? [text] : splitForSpeech(text);
    for (const piece of pieces) {
      const clip = clipName(piece);
      const length = (durations as Record<string, number>)[clip] ?? 1500;
      timers.current.push(setTimeout(() => console.log(`[demo] play ${JSON.stringify({ clip, ms: length })} @${Date.now()}`), at));
      at += length + GAP_MS;
    }
    timers.current.push(setTimeout(() => {
      halt();
      setSpeakingId((current) => (current === id ? null : current));
    }, at));
  }, [halt]);

  const stop = useCallback(() => {
    halt();
    setSpeakingId(null);
  }, [halt]);

  return { ready: true, canSpeak: true, speakingId, speak, stop, onWord, notice: "" };
}
