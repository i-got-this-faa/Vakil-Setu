import { useNavigate } from "react-router-dom";
import { useState } from "react";
import VoiceRecorder from "../components/VoiceRecorder";
import { matchAdvocates, classifyIssue } from "../api/client";
import { useAppState } from "../state/AppContext";
import { bcp47FromUiLanguage, speakWithWebSpeech } from "../utils/webSpeech";
import { speakableAnalysisText, ttsLocaleFromClassification } from "../utils/classificationSpeak";

export default function HomePage() {
  const ttsEnabled = (import.meta.env.VITE_ENABLE_TTS || "true") === "true";
  const navigate = useNavigate();
  const { setVoiceText, setClassification, setAdvocates, setTtsLang } = useAppState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTranscript = async (text, preferredLanguage = "auto") => {
    try {
      setLoading(true);
      setError("");
      const classification = await classifyIssue(text);
      const speakLocale = ttsLocaleFromClassification(
        classification,
        bcp47FromUiLanguage(preferredLanguage)
      );
      setTtsLang(speakLocale);

      const matched = await matchAdvocates(classification.domain);
      setVoiceText(text);
      setClassification(classification);
      setAdvocates(matched.advocates || []);

      if (ttsEnabled) {
        const toSpeak =
          speakableAnalysisText(classification) ||
          classification.summary ||
          "Analysis complete";
        speakWithWebSpeech(toSpeak, speakLocale);
      }

      navigate("/results");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <section className="hero">
        <p className="eyebrow">AI powered legal triage</p>
        <h1>Voice-Based Legal Assistance for Faster Justice Access</h1>
        <p className="muted">
          Speak your issue in Hindi or English using your browser. We classify legal urgency and match
          you with the right advocate.
        </p>
      </section>
      <VoiceRecorder onSubmit={handleTranscript} />
      {loading ? <p className="muted pulse">Processing voice and matching advocates...</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
