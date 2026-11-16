import { useEffect } from "react";
import { useAppState } from "../state/AppContext";
export default function CaseControls({ consent, setConsent, vertex, setVertex }) {
  const state = useAppState();
  const key = `${state.activeCaseId}:${state.conversation.data?.contextKey}:${Boolean(state.capabilities?.vertexFallback)}`;
  useEffect(() => { setConsent(false); setVertex(false); }, [key, setConsent]);
  return <section className="case-controls">
    <label>Saved cases <select value={state.activeCaseId || ""} onChange={e => state.selectCase(e.target.value)} disabled={state.services.status !== "ready"}>
      <option value="">New case</option>
      {state.activeCaseId && !state.cases.data?.page.some(c => c._id === state.activeCaseId) && <option value={state.activeCaseId}>{state.currentCase.data?.case.title || "Selected case"}</option>}
      {state.cases.data?.page.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
    </select></label>
    {state.cases.data && !state.cases.data.isDone && <button type="button" className="secondary-btn" onClick={() => state.setCaseCursor(state.cases.data.continueCursor)}>Next cases</button>}
    <button type="button" className="secondary-btn" onClick={() => state.setCaseCursor(null)}>Latest cases</button>
    {state.cases.error && <p role="alert">{state.cases.error}</p>}
    <label className="consent-check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={state.services.status !== "ready"} /> I reviewed my message and allow this case and conversation to be sent to Google Gemini for a preliminary AI reply and, when enabled, legal retrieval embeddings.</label>
    {state.capabilities?.vertexFallback && <label className="consent-check"><input type="checkbox" checked={vertex} onChange={e => { setVertex(e.target.checked); setConsent(false); }} /> Also allow Google Cloud Vertex AI if Gemini's quota is exhausted.</label>}
  </section>;
}
