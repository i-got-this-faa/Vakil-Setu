"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@vakil/backend/api";
import type { Id } from "@vakil/backend/data-model";
import { CHAT_LIMITS, isPilotLocale } from "@vakil/domain";
import { Button, Input, Label, Textarea } from "@vakil/ui";
import { createChatStarterAttempt, getChatbotCopy, runChatStarter, type ChatStarterAttempt } from "@/lib/chatbot-copy";
import { RequireRole } from "./workspace-gate";
import { useLocale } from "./locale";
import { LanguageOptions } from "./language-options";
import { VertexFallbackConsentText } from "./vertex-fallback-consent";
import { CaseChat } from "./case-chat";

export function ChatbotPage() {
  return <RequireRole role="user"><ChatStarter /></RequireRole>;
}

function ChatStarter() {
  const { locale: uiLocale } = useLocale();
  const copy = getChatbotCopy(uiLocale);
  const [locale, setLocale] = useState(uiLocale);
  const [question, setQuestion] = useState("");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const attempt = useRef<ChatStarterAttempt<Id<"cases">> | null>(null);
  const attemptsByInput = useRef(new Map<string, ChatStarterAttempt<Id<"cases">>>());
  const create = useMutation(api.cases.create);
  const send = useAction(api.chat.send);
  const capabilities = useQuery(api.chat.capabilities, {});
  const vertexFallback = capabilities?.vertexFallback === true;
  const aiAllowed = Boolean(capabilities?.configured && capabilities.locales.includes(locale));
  const router = useRouter();
  useEffect(() => { setConsent(false); }, [locale, vertexFallback, aiAllowed]);
  const savedId = attempt.current?.caseId;
  const retryCapabilityChanged = Boolean(savedId && attempt.current?.allowVertexFallback !== vertexFallback);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !consent || !aiAllowed || !question.trim() || question.length > CHAT_LIMITS.messageChars || retryCapabilityChanged) return;
    busy.current = true;
    const fingerprint = JSON.stringify([question.trim(), locale]);
    if (!attempt.current || (!attempt.current.caseId && attempt.current.fingerprint !== fingerprint)) {
      const existing = attemptsByInput.current.get(fingerprint);
      attempt.current = existing ?? createChatStarterAttempt<Id<"cases">>(question, locale, vertexFallback);
      attemptsByInput.current.set(fingerprint, attempt.current);
    }
    // Creation retries may use the updated public capability; sent payloads stay fixed.
    if (!attempt.current.caseId) attempt.current.allowVertexFallback = vertexFallback;
    const snapshot = attempt.current;
    setPending(true);
    setError("");
    try {
      const { caseId } = await runChatStarter(snapshot, { create, send });
      // Both available and explicit unavailable results belong in persisted history.
      router.push(`/workspace/chat/${caseId}`);
    } catch {
      setError(snapshot.caseId ? copy.failed : copy.error);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return <section className="card" lang={["hi", "pa"].includes(uiLocale) ? uiLocale : "en-IN"} dir="ltr">
    <h1>{copy.title}</h1><p className="page-description">{copy.intro}</p>
    {!["en", "hi", "pa"].includes(uiLocale) && <p lang="en-IN">{copy.fallback}</p>}
    <form className="form-stack" onSubmit={submit}>
      <div className="field"><Label htmlFor="chatbot-language">{copy.language}</Label>
        <select id="chatbot-language" value={locale} disabled={pending || Boolean(savedId)} onChange={event => {
          if (busy.current) return;
          if (isPilotLocale(event.target.value)) { setLocale(event.target.value); setConsent(false); }
        }}><LanguageOptions /></select>
      </div>
      <div className="field"><Label htmlFor="chatbot-question">{copy.question}</Label>
        <Textarea id="chatbot-question" lang={locale} dir="auto" rows={5} value={question} maxLength={CHAT_LIMITS.messageChars} required disabled={pending || Boolean(savedId)} onChange={event => {
          if (busy.current) return;
          setQuestion(event.target.value); setConsent(false); setError("");
        }} />
        <small>{question.length} / {CHAT_LIMITS.messageChars}</small>
      </div>
      <p className="muted small-text">{copy.documents}</p>
      <Label className="checkbox-line"><Input type="checkbox" checked={consent} disabled={pending || !aiAllowed} onChange={event => { if (!busy.current) setConsent(event.target.checked); }} />
        <span>{copy.consent}<VertexFallbackConsentText enabled={vertexFallback} locale={uiLocale} /></span>
      </Label>
      {!aiAllowed && <p role="status">{capabilities === undefined ? copy.loading : copy.unavailable}</p>}
      {pending && <div aria-live="polite"><div className="case-chat-bubble user">{attempt.current?.message}</div><p role="status">{copy.waiting}</p></div>}
      {error && <p role="alert" className="status-message error">{error}</p>}
      {savedId && <Link className="btn secondary" href={`/workspace/chat/${savedId}`}>{copy.open}</Link>}
      <div className="actions"><Button className="btn" type="submit" disabled={pending || !consent || !aiAllowed || !question.trim() || retryCapabilityChanged}>{pending ? copy.waiting : copy.send}</Button>
        <Link href="/workspace/intake" className="inline-link">{copy.manual}</Link></div>
    </form>
  </section>;
}

export function ChatbotConversationPage({ caseId }: { caseId: string }) {
  return <RequireRole role="user"><ResolveConversation routeId={caseId} /></RequireRole>;
}
function ResolveConversation({ routeId }: { routeId: string }) {
  const { locale } = useLocale();
  const copy = getChatbotCopy(locale);
  const caseId = useQuery(api.cases.resolveMine, { routeId });
  if (caseId === undefined) return <p role="status">{copy.loading}</p>;
  if (caseId === null) return <div className="card"><p role="alert">{copy.missing}</p><Link href="/workspace/chat">{copy.newChat}</Link></div>;
  return <SavedConversation caseId={caseId} />;
}
function SavedConversation({ caseId }: { caseId: Id<"cases"> }) {
  const { locale } = useLocale();
  const copy = getChatbotCopy(locale);
  const data = useQuery(api.cases.getMine, { caseId });
  if (!data) return <p role="status">{copy.loading}</p>;
  return <><div className="workspace-heading"><h1>{copy.title}</h1><div className="actions"><Link className="btn secondary" href={`/workspace/cases/${caseId}`}>{copy.summary}</Link><Link className="btn secondary" href="/workspace/chat">{copy.newChat}</Link></div></div><CaseChat caseId={caseId} locale={data.case.locale} /></>;
}
