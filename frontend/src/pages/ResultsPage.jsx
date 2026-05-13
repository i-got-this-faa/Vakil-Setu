import { useNavigate } from "react-router-dom";
import ResultCard from "../components/ResultCard";
import AdvocateList from "../components/AdvocateList";
import { useAppState } from "../state/AppContext";
import { speakWithWebSpeech } from "../utils/webSpeech";
import { speakableAnalysisText } from "../utils/classificationSpeak";

export default function ResultsPage() {
  const ttsEnabled = (import.meta.env.VITE_ENABLE_TTS || "true") === "true";
  const navigate = useNavigate();
  const { classification, advocates, setSelectedAdvocate, ttsLang } = useAppState();

  const handleSelect = (advocate) => {
    setSelectedAdvocate(advocate);
    navigate("/booking");
  };

  const speakSummary = () => {
    const text = speakableAnalysisText(classification);
    if (!text) return;
    speakWithWebSpeech(text, ttsLang);
  };

  return (
    <main className="container">
      <section className="hero compact">
        <p className="eyebrow">Case Intelligence</p>
        <h1>AI Results & Advocate Matches</h1>
        {ttsEnabled ? (
          <button className="secondary-btn" onClick={speakSummary} type="button">
            Speak summary
          </button>
        ) : null}
      </section>
      <ResultCard classification={classification} />
      <AdvocateList advocates={advocates} onSelect={handleSelect} />
    </main>
  );
}
