// DEMO MODE ONLY: stands in for src/voice/recorder.ts. Same states and timer as the real recorder,
// but no microphone: stopping hands back a placeholder clip (the demo store supplies the transcript).
import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceAudioType } from "@legal-setu/domain";

export type Recording = { mimeType: VoiceAudioType; data: ArrayBuffer; durationMs: number };
export type RecorderState = "idle" | "recording" | "stopping";

export function useVoiceRecorder(onFinished: (recording: Recording | null) => void) {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAt = useRef(0);
  const finished = useRef(onFinished);
  finished.current = onFinished;

  useEffect(() => {
    if (state !== "recording") return;
    const timer = setInterval(() => setElapsedMs(Date.now() - startedAt.current), 250);
    return () => clearInterval(timer);
  }, [state]);

  const start = useCallback(async () => {
    if (state !== "idle") return false;
    startedAt.current = Date.now();
    setElapsedMs(0);
    setState("recording");
    return true;
  }, [state]);

  const stop = useCallback(async () => {
    if (state !== "recording") return;
    const durationMs = Date.now() - startedAt.current;
    setState("stopping");
    await new Promise((resolve) => setTimeout(resolve, 150));
    setState("idle");
    finished.current({ mimeType: "audio/webm", data: new ArrayBuffer(16), durationMs });
  }, [state]);

  const cancel = useCallback(async () => {
    if (state === "recording") setState("idle");
  }, [state]);

  return { state, start, stop, cancel, permissionDenied: false, elapsedMs: state === "recording" ? elapsedMs : 0 };
}
