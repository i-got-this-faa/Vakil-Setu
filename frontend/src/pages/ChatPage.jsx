import { Link } from "react-router-dom";
import VoiceRecorder from "../components/VoiceRecorder";
import { useLegalChat } from "../hooks/useLegalChat";
import { useAppState } from "../state/AppContext";

export default function ChatPage() {
  const { classification, sessionGeneration } = useAppState();
  const { chatMessages, loading, loadingLabel, error, submitMessage } = useLegalChat();
  const hi = classification?.response_language === "hi";
  return (
    <main className="chat-page">
      <div className="chat-page-head">
        <div><p className="eyebrow">YOUR LEGAL WORKSPACE</p><h1>Your conversation</h1><p className="muted">Tell us what happened. Take it one question at a time.</p></div>
        {classification && <Link to="/results" className="chat-summary-link">{hi ? "सारांश और वकील देखें →" : "View case summary & advocates →"}</Link>}
      </div>
      <VoiceRecorder key={sessionGeneration.current} messages={chatMessages} onSubmit={submitMessage} isSubmitting={loading} loadingLabel={loadingLabel} compact />
      {error && <p className="error-banner" role="alert">{error}</p>}
    </main>
  );
}
