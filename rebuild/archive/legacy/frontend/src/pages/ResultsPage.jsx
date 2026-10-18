import { Link, useNavigate } from "react-router-dom";
import CaseHero from "../components/dashboard/CaseHero";
import AnalysisDashboard from "../components/dashboard/AnalysisDashboard";
import AdvocateMatchPanel from "../components/dashboard/AdvocateMatchPanel";
import LegalAssistantChat from "../components/dashboard/LegalAssistantChat";
import { useLegalChat } from "../hooks/useLegalChat";
import { useAppState } from "../state/AppContext";
import { speakWithWebSpeech } from "../utils/webSpeech";
import { speakableAnalysisText } from "../utils/classificationSpeak";

export default function ResultsPage() {
  const ttsEnabled = (import.meta.env.VITE_ENABLE_TTS || "true") === "true";
  const navigate = useNavigate();
  const { classification, advocates, setSelectedAdvocate, ttsLang } = useAppState();
  const { chatMessages, loading, loadingLabel, error, submitMessage } = useLegalChat({
    navigateAfterFirstResult: false
  });

  const hi = classification?.response_language === "hi";
  const lang = hi ? "hi" : "en";
  const domainLabel = classification?.domain_label || classification?.domain;

  const L = hi
    ? {
        emptyTitle: "पहले अपना मामला बताएं",
        emptySub: "होम पर जाकर अपनी समस्या लिखें — हम विश्लेषण और वकील मिलान दिखाएंगे।",
        emptyCta: "होम पर जाएं",
        speak: "सुनें",
        book: "वकील बुक करें",
        trust1: "NAAC मान्यता",
        trust2: "एन्क्रिप्टेड सत्र",
        trust3: "भारतीय कानून पर आधारित"
      }
    : {
        emptyTitle: "Describe your issue first",
        emptySub: "Start on Home — we'll analyze your case and match advocates.",
        emptyCta: "Go to Home",
        speak: "Listen",
        book: "Book a lawyer",
        trust1: "NAAC accredited",
        trust2: "Encrypted session",
        trust3: "Indian law focused"
      };

  const handleBook = (advocate) => {
    setSelectedAdvocate(advocate);
    navigate("/booking");
  };

  const handleViewProfile = (advocate) => {
    setSelectedAdvocate(advocate);
    navigate("/booking");
  };

  const handleStickyBook = () => {
    const first = advocates?.[0];
    if (first) handleBook(first);
    else navigate("/booking");
  };

  const speakSummary = () => {
    const text = speakableAnalysisText(classification);
    if (!text) return;
    speakWithWebSpeech(text, ttsLang);
  };

  if (!classification) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-page-inner">
          <section className="dashboard-empty dash-fade-in">
            <h1>{L.emptyTitle}</h1>
            <p>{L.emptySub}</p>
            <Link to="/" className="dash-btn dash-btn--primary">
              {L.emptyCta}
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-page-inner">
        <CaseHero classification={classification} lang={lang} />

        {ttsEnabled ? (
          <div className="dashboard-tts-row" style={{ marginBottom: 16 }}>
            <button type="button" className="dash-btn dash-btn--ghost" onClick={speakSummary}>
              🔊 {L.speak}
            </button>
          </div>
        ) : null}

        <div className="dashboard-split">
          <AnalysisDashboard classification={classification} lang={lang} />
          <AdvocateMatchPanel
            advocates={advocates}
            domainLabel={domainLabel}
            onBook={handleBook}
            onViewProfile={handleViewProfile}
            lang={lang}
          />
        </div>

        <LegalAssistantChat
          messages={chatMessages}
          onSubmit={submitMessage}
          isSubmitting={loading}
          loadingLabel={loadingLabel}
          lang={lang}
        />

        <div className="dashboard-trust dash-fade-in" role="list">
          <div className="dashboard-trust-item" role="listitem">
            <span aria-hidden="true">✓</span>
            <span>{L.trust1}</span>
          </div>
          <div className="dashboard-trust-item" role="listitem">
            <span aria-hidden="true">🔒</span>
            <span>{L.trust2}</span>
          </div>
          <div className="dashboard-trust-item" role="listitem">
            <span aria-hidden="true">⚖</span>
            <span>{L.trust3}</span>
          </div>
        </div>

        {error ? (
          <p className="error-banner" role="alert" style={{ marginTop: 16 }}>
            {error}
          </p>
        ) : null}
      </div>

      <aside className="dashboard-sticky-cta" aria-label={L.book}>
        <button type="button" className="dash-btn dash-btn--primary" onClick={handleStickyBook}>
          {L.book}
        </button>
      </aside>
    </main>
  );
}
