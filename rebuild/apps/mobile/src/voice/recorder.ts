import { File } from "expo-file-system";
import {
  AudioQuality,
  IOSOutputFormat,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from "expo-audio";
import { Platform } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { VOICE_LIMITS, type VoiceAudioType } from "@legal-setu/domain";

/**
 * Small speech-friendly recordings that Bhashini speech-to-text (and Gemini, the fallback) accept:
 * Android records AAC in an MP4 container (audio/mp4, .m4a); iOS records 16 kHz mono WAV (audio/wav).
 * Raw ADTS AAC is avoided because Bhashini can't decode it.
 */
const OPTIONS: RecordingOptions = {
  extension: Platform.OS === "ios" ? ".wav" : ".m4a",
  sampleRate: 16_000,
  numberOfChannels: 1,
  bitRate: 32_000,
  android: { extension: ".m4a", outputFormat: "mpeg4", audioEncoder: "aac", sampleRate: 16_000 },
  ios: { extension: ".wav", outputFormat: IOSOutputFormat.LINEARPCM, audioQuality: AudioQuality.MEDIUM, sampleRate: 16_000, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
  web: { mimeType: "audio/webm", bitsPerSecond: 32_000 },
};
const MIME: VoiceAudioType = Platform.OS === "ios" ? "audio/wav" : Platform.OS === "web" ? "audio/webm" : "audio/mp4";

export type Recording = { mimeType: VoiceAudioType; data: ArrayBuffer; durationMs: number };
export type RecorderState = "idle" | "recording" | "stopping";

export function useVoiceRecorder(onFinished: (recording: Recording | null) => void) {
  const recorder = useAudioRecorder(OPTIONS);
  const status = useAudioRecorderState(recorder, 250);
  const [state, setState] = useState<RecorderState>("idle");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const finished = useRef(onFinished);
  finished.current = onFinished;

  const stop = useCallback(async () => {
    if (state !== "recording") return;
    setState("stopping");
    let recording: Recording | null = null;
    try {
      const durationMs = recorder.currentTime * 1000;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
      if (recorder.uri && durationMs >= 500) {
        const data = await new File(recorder.uri).arrayBuffer();
        if (data.byteLength > 0 && data.byteLength <= VOICE_LIMITS.audioBytes) recording = { mimeType: MIME, data, durationMs };
      }
    } catch {
      recording = null;
    } finally {
      setState("idle");
    }
    finished.current(recording);
  }, [recorder, state]);

  // Throw the recording away: nothing is sent and the file is deleted.
  const cancel = useCallback(async () => {
    if (state !== "recording") return;
    setState("stopping");
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
      if (recorder.uri) {
        try {
          new File(recorder.uri).delete();
        } catch {
          // Already gone; nothing to clean up.
        }
      }
    } catch {
      // The recorder may already be stopped.
    } finally {
      setState("idle");
    }
  }, [recorder, state]);

  const start = useCallback(async () => {
    if (state !== "idle") return false;
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setPermissionDenied(true);
      return false;
    }
    setPermissionDenied(false);
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setState("recording");
    return true;
  }, [recorder, state]);

  // Hard stop at the server's audio length limit.
  useEffect(() => {
    if (state === "recording" && status.durationMillis >= VOICE_LIMITS.audioSeconds * 1000) void stop();
  }, [state, status.durationMillis, stop]);

  return { state, start, stop, cancel, permissionDenied, elapsedMs: state === "recording" ? status.durationMillis : 0 };
}
