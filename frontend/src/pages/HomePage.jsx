import { Link } from "react-router-dom";
import VakilAvatar from "../components/VakilAvatar";
import { useAppState } from "../state/AppContext";

export default function HomePage() {
  const { classification, chatMessages } = useAppState();
  const hi = classification?.response_language === "hi";
  return (
    <main className="container page-home landing-page">
      <section className="hero">
        <p className="eyebrow">AI powered legal triage</p>
        <h1>Voice-Based Legal Assistance for <span>Faster Justice Access</span></h1>
        <p className="muted">Speak your issue in Hindi or English using your browser. We classify legal urgency and match you with the right advocate. Your chat is saved for this session.</p>
        <div className="landing-actions">
          <Link to="/chat" className="home-results-link">{chatMessages.length ? "Continue chat" : "Start chat"}<span aria-hidden="true"> →</span></Link>
          {classification && <Link to="/results" className="landing-summary-link">{hi ? "सारांश और वकील देखें →" : "View case summary & advocates →"}</Link>}
        </div>
        <p className="landing-note">Type or use your voice. View your case summary whenever you’re ready.</p>
      </section>
      <aside className="landing-avatar" aria-label="Your legal assistant">
        <VakilAvatar />
        <div className="vakil-bubble-card"><p>Welcome! Tell me your case.</p></div>
      </aside>
    </main>
  );
}
