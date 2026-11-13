import { deviceLangFor, useSpeech } from "../state/SpeechContext";
import { speechReasonMessage } from "../services/speechPlayback";

// Listen / stop / replay controls for one persisted assistant reply. Labels name the provider, because the two
// options send data differently: the device voice never leaves the browser; natural voice sends this reply's text to ElevenLabs.
export default function ReplySpeech({ message }) {
  const speech = useSpeech();
  const { playback, naturalVoice } = speech;
  const locale = message.language || "en";
  const item = { id: message.id, turnId: message.turnId, text: message.content, locale: deviceLangFor(locale) };
  const mine = playback.id === message.id;
  const busy = mine && playback.status === "loading";
  const playing = mine && playback.status === "playing";
  const active = busy || playing;
  const naturalEligible = Boolean(message.turnId) && speech.naturalSupportsLocale(locale);
  const naturalCached = Boolean(message.turnId) && playback.cached.includes(message.turnId);
  const error = playback.errorId === message.id ? playback.error : "";
  const naturalNote = !naturalVoice.loaded ? "" : !naturalVoice.configured ? "Natural voice is not set up on this server." : !naturalEligible ? `Natural voice is not available for ${locale === "pa" ? "Punjabi" : "this language"}.` : "";

  return <div className="reply-speech" role="group" aria-label="Reply audio">
    <div className="reply-speech-buttons">
      {active && <button type="button" className="secondary-btn" aria-label="Stop reply audio" onClick={speech.stop}>Stop</button>}
      <button type="button" className="secondary-btn" aria-label="Play this reply with the device voice in this browser" title="Uses this browser's voice. Nothing is sent to a server." disabled={!speech.deviceSupported || busy} onClick={() => speech.speak(item, "device")}>Device voice</button>
      {naturalEligible && <button type="button" className="secondary-btn" aria-label={naturalCached ? "Replay this reply with natural voice from ElevenLabs" : "Play this reply with natural voice from ElevenLabs"} title="Sends this reply's text to ElevenLabs to make audio. Requires the consent option above." disabled={!speech.consent || busy} onClick={() => speech.speak(item, "elevenlabs")}>{naturalCached ? "Replay natural voice" : "Natural voice"}</button>}
    </div>
    {naturalNote && <p className="reply-speech-note">{naturalNote}</p>}
    {naturalEligible && !speech.consent && <p className="reply-speech-note">Turn on natural voice above to use it for replies.</p>}
    <p role="status" className="reply-speech-status">{busy ? "Preparing audio…" : playing ? (playback.provider === "device" ? "Speaking with the device voice…" : "Playing natural voice…") : ""}</p>
    {error && <p role="alert" className="legal-evidence-warning">{error || speechReasonMessage("provider_failed")}</p>}
  </div>;
}
