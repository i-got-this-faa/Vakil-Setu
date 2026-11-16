import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@convex-api";
import { useAppState } from "../state/AppContext";
import { serviceError } from "../services/convexConfig";
export function useLegalChat() {
  const state = useAppState(); const navigate = useNavigate();
  const [loading, setLoading] = useState(false), [error, setError] = useState("");
  const held = useRef(null), sending = useRef(false);
  const identity = state.services.userId;
  const generation = state.sessionGeneration.current;
  useEffect(() => { held.current = null; sending.current = false; setLoading(false); setError(""); }, [identity, generation]);
  async function submitMessage(text, preferredLanguage = "auto", consent = false, allowVertex = false) {
    if (sending.current || !text.trim()) return false;
    if (state.services.status !== "ready") { setError("Sign in and complete your client profile first."); return false; }
    if (!consent) { setError("Review and allow this message to be sent to Google for AI processing."); return false; }
    if (!state.capabilities?.configured && !state.capabilities?.retrievalConfigured) { setError("AI and legal sources are unavailable on this deployment. You can still save your case privately."); return false; }
    const version = state.sessionGeneration.current; const requestOwner = identity;
    sending.current = true; setLoading(true); setError("");
    const client = state.services.client;
    const current = () => state.sessionGeneration.current === version && state.services.userId === requestOwner;
    try {
      let caseId = state.activeCaseId;
      const retry = held.current?.message === text.trim() ? held.current : null;
      if (!caseId) {
        const intake = retry?.intake || { title: text.trim().slice(0, 100), text: text.trim(), locale: preferredLanguage === "hindi" || (preferredLanguage === "auto" && /[\u0900-\u097F]/u.test(text)) ? "hi" : preferredLanguage === "punjabi" || /[\u0A00-\u0A7F]/u.test(text) ? "pa" : "en", context: [], requestId: crypto.randomUUID() };
        held.current = { ...retry, message: text.trim(), intake };
        caseId = await client.mutation(api.cases.create, intake);
        if (!current()) return;
        state.setActiveCaseId(caseId);
      }
      const data = await client.query(api.chat.listMine, { caseId });
      if (!current()) return;
      const request = retry?.payload || { caseId, message: text.trim(), documentIds: [], requestId: crypto.randomUUID(), consent: true, contextKey: data.contextKey, ...(allowVertex && state.capabilities?.vertexFallback ? { allowVertexFallback: true } : {}) };
      held.current = { message: text.trim(), payload: request };
      const result = await client.action(api.chat.send, request);
      if (!current()) return;
      if (result.kind !== "available") {
        if (result.reason !== "in_progress") held.current = null;
        setError(`Reply unavailable: ${result.reason}. Review the message and consent before retrying.`);
        return false;
      } else {
        held.current = null;
        // No autoplay: the reply appears as text, and audio starts only when the user presses Listen on it.
        return true;
      }
    } catch (err) { if (current()) setError(serviceError(err)); return false; }
    finally { if (current()) { sending.current = false; setLoading(false); } }
  }
  return { chatMessages: state.chatMessages, loading: loading || state.conversation.data?.turns.some(t => t.result.kind === "pending" && t.expiresAt > state.now), loadingLabel: "Preparing your reply…", error, submitMessage, startNewCase: () => { state.clearSession(); navigate("/chat"); } };
}
