import { useSpeech } from "../state/SpeechContext";

// Separate opt-in for natural voice. Off by default; reset when the user, case or route scope changes.
export default function SpeechConsent() {
  const speech = useSpeech();
  if (!speech.naturalVoice.loaded) return null;
  if (!speech.naturalVoice.configured) {
    return <p className="service-note">Natural voice is not set up on this server. Replies can still be read with the device voice.</p>;
  }
  return <label className="consent-check"><input type="checkbox" checked={speech.consent} onChange={e => speech.setConsent(e.target.checked)} /> Allow natural voice for replies I choose to hear. Only the text of each reply I play is sent to ElevenLabs to make audio, and ElevenLabs may keep request history under its terms. Off by default. The device voice never sends text to a server.</label>;
}
