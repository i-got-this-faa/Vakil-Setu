import { Link } from "react-router-dom";
import VoiceRecorder from "../components/VoiceRecorder";
import { useLegalChat } from "../hooks/useLegalChat";
import { useAppState } from "../state/AppContext";

export default function HomePage() {
  const { classification } = useAppState();
  const { chatMessages, loading, loadingLabel, error, submitMessage } = useLegalChat({
    navigateAfterFirstResult: true
  });

  const hi = classification?.response_language === "hi";
  const hasResults = Boolean(classification);

  return (
    <main className="container page-home">
      <section className="hero">
        <p className="eyebrow">AI powered legal triage</p>
        <h1>Voice-Based Legal Assistance for Faster Justice Access</h1>
        <p className="muted">
          Speak your issue in Hindi or English using your browser. We classify legal urgency and match
          you with the right advocate. Your chat is saved for this session.
        </p>
        {hasResults ? (
          <Link to="/results" className="home-results-link">
            {hi ? "परिणाम और वकील देखें →" : "View results & advocates →"}
          </Link>
        ) : null}
      </section>
      <VoiceRecorder
        messages={chatMessages}
        onSubmit={submitMessage}
        isSubmitting={loading}
        loadingLabel={loadingLabel}
      />
      {error ? (
        <p className="error-banner" role="alert">
          {error}
        </p>
      ) : null}
    </main>
  );
}
