import { useAction } from "convex/react";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@legal-setu/backend/api";
import type { VoiceLocale } from "@legal-setu/domain";
import { chooseSpeechLanguage, greetingForSpeech, type DeviceVoice } from "../lib/speech";
import { phrasesFor, speechTagFor } from "./languages";
import { SERVER_VOICE_LOCALES, splitForSpeech } from "./logic";
import { useVoicePrefs } from "./prefs";

let voicesRequest: Promise<DeviceVoice[]> | null = null;
function deviceVoices(): Promise<DeviceVoice[]> {
  voicesRequest ??= Speech.getAvailableVoicesAsync().catch((): DeviceVoice[] => []);
  return voicesRequest;
}

/** How often the avatar's lips move while a server clip plays without word timings. */
const LIP_TICK_MS = 260;
const CLIP_WAIT_MS = 12_000;

/**
 * Plays server-generated speech sentence by sentence and falls back to the phone's own voice when needed.
 * `canSpeak` is false only when neither is available; the text stays large on screen.
 */
export function useSpeaker(locale: VoiceLocale) {
  const { guestToken } = useVoicePrefs();
  const speakRemote = useAction(api.voiceAudio.speak);
  const natural = SERVER_VOICE_LOCALES.includes(locale);
  const bhashiniOnly = locale === "doi";
  const [language, setLanguage] = useState<string | null | undefined>(undefined);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [notice, setNotice] = useState("");
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
  const finishClip = useRef<((completed: boolean) => void) | null>(null);

  useEffect(() => {
    if (bhashiniOnly) return;
    let active = true;
    deviceVoices().then((voices) => {
      if (!active) return;
      // Some Android engines report no list but still speak; try the tag anyway in that case.
      const tag = speechTagFor(locale);
      setLanguage(voices.length === 0 ? tag : chooseSpeechLanguage(voices, tag));
    });
    return () => {
      active = false;
    };
  }, [bhashiniOnly, locale]);

  const halt = useCallback(() => {
    session.current += 1;
    try {
      // Pause first: on some phones remove() alone lets the clip keep sounding for a moment,
      // and the microphone then records the app's own voice.
      player.current?.pause();
    } catch {
      // Already released.
    }
    finishClip.current?.(false);
    void Speech.stop();
  }, []);

  useEffect(() => halt, [halt]);

  const done = useCallback((id: string, mine: number) => {
    if (session.current !== mine) return;
    setIsPlaying(false);
    setSpeakingId((current) => (current === id ? null : current));
  }, []);

  const speakOnDevice = useCallback((id: string, text: string, mine: number) => {
    if (!language) {
      setNotice(phrasesFor(locale).audioUnavailable);
      return done(id, mine);
    }
    Speech.speak(text, {
      language,
      rate: 0.92,
      onStart: () => {
        if (session.current === mine) setIsPlaying(true);
      },
      onBoundary: () => {
        if (session.current === mine) tickWord();
      },
      onDone: () => done(id, mine),
      onStopped: () => done(id, mine),
      onError: () => {
        if (session.current !== mine) return;
        setNotice(phrasesFor(locale).audioFailed);
        done(id, mine);
      },
    });
  }, [done, language, locale, tickWord]);

  // Plays one clip; resolves true when it finished, false if it was stopped or failed.
  const playClip = useCallback((url: string, mine: number) => new Promise<boolean>((resolve) => {
    if (session.current !== mine) return resolve(false);
    let settled = false;
    let clip: AudioPlayer | null = null;
    let subscription: { remove(): void } | null = null;
    let waitTimer: ReturnType<typeof setTimeout> | undefined;
    let endTimer: ReturnType<typeof setTimeout> | undefined;
    let ticker: ReturnType<typeof setInterval> | undefined;
    let playing = false;
    const finish = (completed: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(waitTimer);
      clearTimeout(endTimer);
      clearInterval(ticker);
      if (session.current === mine && playing) setIsPlaying(false);
      subscription?.remove();
      try {
        clip?.remove();
      } catch {
        // Already released.
      }
      if (player.current === clip) player.current = null;
      if (finishClip.current === finish) finishClip.current = null;
      resolve(completed);
    };
    finishClip.current = finish;
    try {
      clip = createAudioPlayer({ uri: url }, { updateInterval: 100 });
      player.current = clip;
      // Bound both the initial download and a stall after playback has started.
      waitTimer = setTimeout(() => finish(false), CLIP_WAIT_MS);
      endTimer = setTimeout(() => finish(false), 120000);
      subscription = clip.addListener("playbackStatusUpdate", (status) => {
        if (settled || session.current !== mine) return;
        if (status.didJustFinish) return finish(true);
        if (status.error) return finish(false);
        const nowPlaying = status.isLoaded && status.playing && !status.isBuffering;
        if (nowPlaying === playing) return;
        playing = nowPlaying;
        clearTimeout(waitTimer);
        if (!playing) waitTimer = setTimeout(() => finish(false), CLIP_WAIT_MS);
        setIsPlaying(playing);
      });
      ticker = setInterval(() => {
        if (playing) tickWord();
      }, LIP_TICK_MS);
      clip.play();
    } catch {
      finish(false);
    }
  }), [tickWord]);

  const speak = useCallback((id: string, displayText: string) => {
    const text = id === "greeting" ? greetingForSpeech(displayText) : displayText;
    if (!text.trim()) return;
    halt();
    setIsPlaying(false);
    setNotice("");
    const mine = session.current;
    setSpeakingId(id);
    const pieces = splitForSpeech(text);
    const lookahead = bhashiniOnly ? 2 : 1;
    const requestClip = (piece: string) => speakRemote({ locale, text: piece, ...(guestToken ? { guestToken } : {}) })
      .catch(() => ({ kind: "unavailable" as const, reason: "request_failed" }));
    const fetchPiece = async (piece: string) => {
      let result = await requestClip(piece);
      if (bhashiniOnly && session.current === mine && result.kind === "unavailable"
        && ["provider_failed", "request_failed", "storage_failed"].includes(result.reason)) {
        result = await requestClip(piece);
      }
      return result.kind === "audio" ? result.url : null;
    };
    function recover(index: number, notice: "audioUnavailable" | "audioFailed") {
      if (session.current !== mine) return;
      if (bhashiniOnly) {
        setNotice(phrasesFor(locale)[notice]);
        done(id, mine);
        return;
      }
      speakOnDevice(id, pieces.slice(index).join(" "), mine);
    }
    void (async () => {
      try {
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false });
      } catch {
        // Device speech may still work if player session setup fails.
      }
      if (session.current !== mine) return;
      if (!natural) return speakOnDevice(id, text, mine);
      if (!pieces.length) return done(id, mine);
      // Give the first sentence a head start, then keep upcoming clips in flight during playback.
      const pending = [fetchPiece(pieces[0]!)];
      for (let index = 0; index < pieces.length; index++) {
        const url = await pending[index]!;
        if (session.current !== mine) return;
        if (!url) return recover(index, "audioUnavailable");
        while (pending.length <= index + lookahead && pending.length < pieces.length) {
          pending.push(fetchPiece(pieces[pending.length]!));
        }
        if (await playClip(url, mine)) continue;
        if (session.current !== mine) return;
        // Retry just the interrupted sentence with a fresh native player.
        if (bhashiniOnly && await playClip(url, mine)) continue;
        return recover(index, "audioFailed");
      }
      done(id, mine);
    })();
  }, [done, guestToken, halt, bhashiniOnly, locale, natural, playClip, speakOnDevice, speakRemote]);

  const stop = useCallback(() => {
    halt();
    setIsPlaying(false);
    setSpeakingId(null);
  }, [halt]);

  return { ready: bhashiniOnly || language !== undefined, canSpeak: natural || Boolean(language), speakingId, isPlaying, speak, stop, onWord, notice };
}
