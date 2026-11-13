import { useRef, useState } from "react";
import CaseControls from "../components/CaseControls";
import SpeechConsent from "../components/SpeechConsent";
import { api } from "@convex-api";
import { serviceError } from "../services/convexConfig";
import { Link } from "react-router-dom";
import VoiceRecorder from "../components/VoiceRecorder";
import { useLegalChat } from "../hooks/useLegalChat";
import { useAppState } from "../state/AppContext";

export default function ChatPage() {
  const state = useAppState();
  const { classification, sessionGeneration } = state;
  const saveRequest = useRef(null);
  const [consent, setConsent] = useState(false), [vertex, setVertex] = useState(false), [saveError, setSaveError] = useState("");
  async function savePrivately(text, language) {
    setSaveError("");
    const version = state.sessionGeneration.current;
    try {
      if (state.services.status !== "ready") throw new Error("Sign in first.");
      if (state.activeCaseId) {
        const current = await state.services.client.query(api.cases.getMine, { caseId: state.activeCaseId });
        await state.services.client.mutation(api.cases.appendFollowUp, { caseId: state.activeCaseId, expectedVersion: current.case.summaryVersion, expectedContextRevision: current.case.contextRevision, text, reviewed: true });
      } else {
        const signature = `${version}:${language}:${text}`;
        if (saveRequest.current?.signature !== signature) saveRequest.current = { signature, id: crypto.randomUUID() };
        const id = await state.services.client.mutation(api.cases.create, { title: text.slice(0, 100), text, locale: language === "hindi" || (language === "auto" && /[\u0900-\u097F]/u.test(text)) ? "hi" : language === "punjabi" || /[\u0A00-\u0A7F]/u.test(text) ? "pa" : "en", context: [], requestId: saveRequest.current.id });
        if (version !== state.sessionGeneration.current) return false;
        state.setActiveCaseId(id);
      }
      return version === state.sessionGeneration.current;
    } catch (error) { setSaveError(serviceError(error)); return false; }
  }
  const { chatMessages, loading, loadingLabel, error, submitMessage } = useLegalChat();
  const hi = classification?.response_language === "hi";
  return (
    <main className="chat-page">
      <div className="chat-page-head">
        <div><p className="eyebrow">YOUR LEGAL WORKSPACE</p><h1>Your conversation</h1><p className="muted">Tell us what happened. Take it one question at a time.</p></div>
        {classification && <Link to="/results" className="chat-summary-link">{hi ? "सारांश और वकील देखें →" : "View case summary & advocates →"}</Link>}
      </div>
      <CaseControls consent={consent} setConsent={setConsent} vertex={vertex} setVertex={setVertex} />
      <SpeechConsent />
      {state.currentCase.data && <details className="case-controls"><summary>Saved intake: {state.currentCase.data.case.title}</summary><p>{state.currentCase.data.case.text}</p>{state.currentCase.data.case.context.map((c, i) => <p key={i}>{c.content}</p>)}<Link to="/results">Review summary and find advocates</Link></details>}
      <VoiceRecorder key={sessionGeneration.current} messages={chatMessages} onDraftChange={() => setConsent(false)} languageLocked={Boolean(state.activeCaseId)} canSubmit={state.services.status === "ready" && consent} onSavePrivate={state.services.status === "ready" ? savePrivately : undefined} onSubmit={async (text, language) => { const result = await submitMessage(text, language, consent, vertex); setConsent(false); return result; }} isSubmitting={loading} loadingLabel={loadingLabel} compact />
      {saveError && <p role="alert">{saveError}</p>}
      {error && <p className="error-banner" role="alert">{error}</p>}
    </main>
  );
}
