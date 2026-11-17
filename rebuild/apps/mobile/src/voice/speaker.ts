import { useAction } from "convex/react";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@legal-setu/backend/api";
import type { VoiceLocale } from "@legal-setu/domain";
import { chooseSpeechLanguage, type DeviceVoice } from "../lib/speech";
import { speechTagFor } from "./languages";
import { BHASHINI_VOICE_LOCALES, splitForSpeech } from "./logic";
import { useVoicePrefs } from "./prefs";

let voicesRequest: Promise<DeviceVoice[]> | null = null;
function deviceVoices(): Promise<DeviceVoice[]> {
  voicesRequest ??= Speech.getAvailableVoicesAsync().catch((): DeviceVoice[] => []);
  return voicesRequest;
}

/** How often the avatar's lips move while a Bhashini clip plays (the clip has no word timings). */
const LIP_TICK_MS = 260;

/**
 * Reads replies aloud. Uses Bhashini's natural Indian voices (made on the server, sentence by sentence,
 * so the first sentence starts quickly); falls back to the phone's own voice for Urdu or if Bhashini fails.
 * `canSpeak` is false only when neither is available; the text stays large on screen.
 */
export function useSpeaker(locale: VoiceLocale) {
  const { guestToken } = useVoicePrefs();
  const speakRemote = useAction(api.voiceAudio.speak);
  const natural = BHASHINI_VOICE_LOCALES.includes(locale);
  const [language, setLanguage] = useState<string | null | undefined>(undefined);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  // Word-boundary listeners (drives the avatar's lips) kept in a ref so words don't re-render the screen.
  const wordListeners = useRef(new Set<() => void>());
  const onWord = useCallback((listener: () => void) => {
    wordListeners.current.add(listener);
    return () => void wordListeners.current.delete(listener);
  }, []);
  const tickWord = useCallback(() => wordListeners.current.forEach((listener) => listener()), []);

  // Each speak() gets a new session number; anything from an older session is ignored.
  const session = useRef(0);
  const player = useRef<AudioPlayer | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishClip = useRef<((completed: boolean) => void) | null>(null);

  useEffect(() => {
    let active = true;
    deviceVoices().then((voices) => {
      if (!active) return;
      // Some Android engines report no list but still speak; try the tag anyway in that case.
      setLanguage(voices.length === 0 ? speechTagFor(locale) : chooseSpeechLanguage(voices, speechTagFor(locale)));
    });
    return () => {
      active = false;
    };
  }, [locale]);

  const halt = useCallback(() => {
    session.current += 1;
    if (ticker.current) clearInterval(ticker.current);
    ticker.current = null;
    try {
      player.current?.remove();
    } catch {
      // Already released.
    }
    player.current = null;
    finishClip.current?.(false);
    finishClip.current = null;
    void Speech.stop();
  }, []);

  useEffect(() => halt, [halt]);

  const done = useCallback((id: string, mine: number) => {
    if (session.current === mine) setSpeakingId((current) => (current === id ? null : current));
  }, []);

  const speakOnDevice = useCallback((id: string, text: string, mine: number) => {
    if (!language) return done(id, mine);
    Speech.speak(text, {
      language,
      rate: 0.92,
      onBoundary: tickWord,
      onDone: () => done(id, mine),
      onStopped: () => done(id, mine),
      onError: () => done(id, mine),
    });
  }, [done, language, tickWord]);

  // Plays one clip; resolves true when it finished, false if it was stopped or failed.
  const playClip = useCallback((url: string, mine: number) => new Promise<boolean>((resolve) => {
    if (session.current !== mine) return resolve(false);
    let settled = false;
    const finish = (completed: boolean) => {
      if (settled) return;
      settled = true;
      if (ticker.current) clearInterval(ticker.current);
      ticker.current = null;
      subscription?.remove();
      try {
        clip.remove();
      } catch {
        // Already released.
      }
      if (player.current === clip) player.current = null;
      if (finishClip.current === finish) finishClip.current = null;
      resolve(completed);
    };
    const clip = createAudioPlayer({ uri: url });
    player.current = clip;
    finishClip.current = finish;
    const subscription = clip.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) finish(true);
    });
    ticker.current = setInterval(() => {
      if (clip.playing) tickWord();
    }, LIP_TICK_MS);
    try {
      clip.play();
    } catch {
      finish(false);
    }
  }), [tickWord]);

  const speak = useCallback((id: string, text: string) => {
    if (!text.trim()) return;
    halt();
    const mine = session.current;
    setSpeakingId(id);
    if (!natural) return speakOnDevice(id, text, mine);
    const pieces = splitForSpeech(text);
    const fetchPiece = (piece: string) => speakRemote({ locale, text: piece, ...(guestToken ? { guestToken } : {}) })
      .then((result) => (result.kind === "audio" ? result.url : null))
      .catch(() => null);
    void (async () => {
      let next: Promise<string | null> | null = fetchPiece(pieces[0]!);
      for (let index = 0; index < pieces.length; index++) {
        const url: string | null = await next!;
        if (session.current !== mine) return;
        // Start making the next sentence while this one plays.
        next = index + 1 < pieces.length ? fetchPiece(pieces[index + 1]!) : null;
        if (!url) return speakOnDevice(id, pieces.slice(index).join(" "), mine);
        if (!(await playClip(url, mine))) {
          if (session.current === mine) speakOnDevice(id, pieces.slice(index).join(" "), mine);
          return;
        }
      }
      done(id, mine);
    })();
  }, [done, guestToken, halt, locale, natural, playClip, speakOnDevice, speakRemote]);

  const stop = useCallback(() => {
    halt();
    setSpeakingId(null);
  }, [halt]);

  return { ready: natural || language !== undefined, canSpeak: natural || Boolean(language), speakingId, speak, stop, onWord };
}
