import { useEffect, useState } from "react";
import { api } from "@convex-api";
import { useAppState } from "../state/AppContext";
import { serviceError } from "../services/convexConfig";
export default function SummaryEditor() {
  const state = useAppState();
  const saved = state.currentCase.data;
  return saved ? <Editor key={`${saved.case._id}:${saved.case.summaryVersion}`} state={state} saved={saved} /> : <p>Select a saved case in Chat to review its summary.</p>;
}
function Editor({ state, saved }) {
  const summary = saved.summaries[0]?.summary;
  const [text, setText] = useState(summary?.text || saved.case.text), [actions, setActions] = useState(summary?.actions.join("\n") || ""), [domain, setDomain] = useState(summary?.domain || "unknown"), [urgency, setUrgency] = useState(summary?.urgency || "unknown"), [reviewed, setReviewed] = useState(false), [aiConsent, setAiConsent] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { setReviewed(false); setAiConsent(false); }, [text, actions, domain, urgency, saved.case.contextRevision]);
  async function save(e) {
    e.preventDefault(); if (!reviewed || busy) return; setBusy(true); setError("");
    try { await state.services.client.mutation(api.cases.updateSummary, { caseId: saved.case._id, expectedVersion: saved.case.summaryVersion, summary: { locale: saved.case.locale, text, actions: actions.split("\n").map(a => a.trim()).filter(Boolean), domain, urgency } }); } catch (err) { setError(serviceError(err)); } finally { setBusy(false); }
  }
  return <section className="analysis-dashboard dash-surface"><h2>Review your case summary</h2><p>A summary is separate from AI chat. Review the exact version before sharing it with an advocate.</p>
    <form onSubmit={save}><label>Summary <textarea value={text} maxLength={4000} onChange={e => setText(e.target.value)} required rows={6} /></label>
      <label>Practice area <select value={domain} onChange={e => setDomain(e.target.value)}>{["unknown", "criminal", "civil", "family", "property", "employment", "consumer", "other"].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>Urgency <select value={urgency} onChange={e => setUrgency(e.target.value)}>{["unknown", "low", "medium", "high", "emergency"].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>Preparation steps (one per line, up to eight) <textarea value={actions} onChange={e => setActions(e.target.value)} /></label>
      <label className="consent-check"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} /> I reviewed this text and want to save this summary version.</label>
      <button disabled={busy || !reviewed}>Save reviewed summary</button>
    </form>
    <label className="consent-check"><input type="checkbox" checked={aiConsent} onChange={e => setAiConsent(e.target.checked)} /> Send this case to Google Gemini to draft a new summary. I will review it before sharing.</label>
    <button type="button" className="secondary-btn" disabled={busy || !aiConsent || !state.capabilities?.configured} onClick={async () => { setBusy(true); setError(""); try { const result = await state.services.client.action(api.triage.analyze, { caseId: saved.case._id, expectedVersion: saved.case.summaryVersion, expectedContextRevision: saved.case.contextRevision, consent: true }); if (result.kind !== "available") setError(`Draft unavailable: ${result.reason}`); } catch (err) { setError(serviceError(err)); } finally { setBusy(false); setAiConsent(false); } }}>Draft with AI</button>
    {error && <p role="alert">{error}</p>}<p>Saved version: {saved.case.summaryVersion}</p>
  </section>;
}
