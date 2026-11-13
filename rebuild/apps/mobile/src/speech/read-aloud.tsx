import * as Speech from "expo-speech";
import { useEffect, useState } from "react";
import { Button, Small } from "../components/ui";
import { chooseSpeechLanguage, type DeviceVoice } from "../lib/speech";
import { languageTagFor } from "../lib/locale";
import { useLocale } from "../providers/locale";

// Device voices rarely change during a session; query them once for every read-aloud control.
let voicesRequest: Promise<DeviceVoice[]> | null = null;
function loadDeviceVoices(): Promise<DeviceVoice[]> {
  voicesRequest ??= Speech.getAvailableVoicesAsync().catch((): DeviceVoice[] => []);
  return voicesRequest;
}

/**
 * Read-aloud uses voices installed on this phone (expo-speech). It is offered only when a
 * matching voice is reported. Browser or cloud TTS is not used by this app.
 */
export function ReadAloud({ text, languageCode }: { text: string; languageCode: string }) {
  const { copy } = useLocale();
  const [voices, setVoices] = useState<DeviceVoice[] | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const trimmed = text.trim();
  const speechLanguage = voices === null ? null : chooseSpeechLanguage(voices, languageTagFor(languageCode));

  useEffect(() => {
    let active = true;
    loadDeviceVoices().then((reported) => {
      if (active) setVoices(reported);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      void Speech.stop();
    };
  }, [trimmed, languageCode]);

  function speak() {
    if (!speechLanguage || !trimmed) return;
    setSpeaking(true);
    Speech.speak(trimmed, {
      language: speechLanguage,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }

  function stop() {
    void Speech.stop();
    setSpeaking(false);
  }

  const status =
    voices === null ? copy.product.readAloud.checking
      : speechLanguage === null ? copy.product.readAloud.noVoice
        : copy.product.readAloud.ready;

  return (
    <>
      <Small>{trimmed ? status : copy.product.readAloud.empty}</Small>
      {speaking ? (
        <Button variant="secondary" label={copy.product.readAloud.stop} onPress={stop} />
      ) : (
        <Button
          variant="secondary"
          label={copy.product.readAloud.label}
          disabled={!speechLanguage || !trimmed}
          onPress={speak}
        />
      )}
    </>
  );
}
