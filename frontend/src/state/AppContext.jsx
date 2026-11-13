import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "@convex-api";
import { useServices, useServiceQuery } from "./ConvexServices";
import { SpeechProvider } from "./SpeechContext";
const Context = createContext(null);
export function AppProvider({ children }) {
  const { userId } = useServices();
  return <SessionState key={userId || "public"}>{children}</SessionState>;
}
function SessionState({ children }) {
  const services = useServices();
  const sessionGeneration = useRef(0);
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [selectedAdvocate, setSelectedAdvocate] = useState(null);
  const [preferredLanguage, setPreferredLanguage] = useState("auto");
  const [now, setNow] = useState(Date.now);
  const [cursor, setCursor] = useState(null);
  const cases = useServiceQuery(api.cases.listMine, { paginationOpts: { cursor, numItems: 20 } });
  const currentCase = useServiceQuery(api.cases.getMine, activeCaseId ? { caseId: activeCaseId } : null);
  const conversation = useServiceQuery(api.chat.listMine, activeCaseId ? { caseId: activeCaseId } : null);
  const capabilities = useServiceQuery(api.chat.capabilities, {}, false);
  const hasPending = conversation.data?.turns.some(t => t.result.kind === "pending");
  useEffect(() => { if (!hasPending) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [hasPending]);
  useEffect(() => { const locale = currentCase.data?.case.locale; if (locale) setPreferredLanguage(locale === "hi" ? "hindi" : locale === "pa" ? "punjabi" : "english"); }, [currentCase.data?.case._id]);
  const summary = currentCase.data?.summaries[0]?.summary;
  const classification = summary ? { domain: summary.domain, domain_label: summary.domain, urgency: summary.urgency, summary: summary.text, actions: summary.actions, response_language: summary.locale } : null;
  const chatMessages = (conversation.data?.turns || []).flatMap(t => [{ id: `${t._id}-user`, role: "user", content: t.text, createdAt: t.createdAt }, ...(t.result.kind === "pending" && t.expiresAt > now ? [] : [{ id: `${t._id}-reply`, turnId: t._id, role: "assistant", createdAt: t.createdAt, content: t.result.kind === "reply" ? t.result.text : `Reply unavailable: ${t.result.kind === "pending" ? "timeout" : t.result.reason}. You may retry with your consent.`, language: currentCase.data?.case.locale || "en", legalAnswer: t.result.kind === "reply" ? t.result.legalEvidence ? { ...t.result.legalEvidence, status: ["answered", "source_excerpts"].includes(t.result.legalEvidence.status) ? t.result.legalEvidence.status : "general_guidance", answer: t.result.text } : { status: "general_guidance", citations: [], warnings: ["General information; no verified source evidence accompanies this reply."] } : null }])]);
  const clearSession = () => { sessionGeneration.current++; setActiveCaseId(null); setSelectedAdvocate(null); window.speechSynthesis?.cancel(); };
  const selectCase = id => { sessionGeneration.current++; setActiveCaseId(id || null); setSelectedAdvocate(null); window.speechSynthesis?.cancel(); };
  useEffect(() => () => { sessionGeneration.current++; window.speechSynthesis?.cancel(); }, []);
  return <Context.Provider value={{ services, now, sessionGeneration, activeCaseId, setActiveCaseId, selectCase, cases, setCaseCursor: setCursor, currentCase, conversation, capabilities: capabilities.data, chatMessages, classification, selectedAdvocate, setSelectedAdvocate, preferredLanguage, setPreferredLanguage, ttsLang: currentCase.data?.case.locale === "hi" ? "hi-IN" : "en-IN", clearSession }}><SpeechProvider activeCaseId={activeCaseId}>{children}</SpeechProvider></Context.Provider>;
}
export const useAppState = () => useContext(Context);
