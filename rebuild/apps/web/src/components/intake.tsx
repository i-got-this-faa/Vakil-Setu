"use client";

import { Button, Input, Textarea, Label } from "@vakil/ui";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAction, useMutation } from "convex/react";
import { api } from "@vakil/backend/api";
import { isPilotLocale, LIMITS, type PilotLocale } from "@vakil/domain";
import { useLocale } from "./locale";
import { useServices } from "./providers";
import { useAccount } from "./workspace-gate";
import { SpeechCapture, ReadAloud } from "./speech";
import { errorMessage } from "@/lib/errors";
import { intakeChatCopy } from "@/lib/intake-chat-copy";
import type { Id } from "@vakil/backend/data-model";

export function Intake() {
  const { locale: uiLocale, messages, copy } = useLocale();
  const [locale, setLocale] = useState<PilotLocale>(uiLocale);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [locked, setLocked] = useState(false);
  const inputLocked = useRef(false);
  function lockInput(value: boolean) { inputLocked.current = value; setLocked(value); }
  const config = useServices();
  const account = useAccount();
  const ready = config.kind === "configured" && account?.role === "user";
  function editText(value: string) {
    if (inputLocked.current) return;
    setText(value.slice(0, LIMITS.intakeText));
    setReviewed(false);
  }
  return (
    <>
      <div className="workspace-heading">
        <div>
          <div className="eyebrow">01 / Your words</div>
          <h1>{copy.concernTitle}</h1>
          <p className="page-description">{copy.concernDescription}</p>
        </div>
      </div>
      <div className="stack" style={{ maxWidth: 780 }}>
        <fieldset className="card form-stack" disabled={locked} style={{ minWidth: 0 }}>
          <legend className="sr-only">{copy.concernTitle}</legend>
          <div className="field">
            <Label htmlFor="intake-locale">{copy.intakeLanguage}</Label>
            <select
              id="intake-locale"
              value={locale}
              onChange={(event) => {
                if (isPilotLocale(event.target.value)) {
                  setLocale(event.target.value);
                  setReviewed(false);
                }
              }}
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="pa">ਪੰਜਾਬੀ</option>
            </select>
            <small>{copy.noTranslation}</small>
          </div>
          <div className="field">
            <Label htmlFor="case-title">{copy.shortTitle}</Label>
            <Input
              id="case-title"
              required
              maxLength={160}
              placeholder={copy.intakeTitlePlaceholder}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setReviewed(false);
              }}
            />
          </div>
          <SpeechCapture
            locale={locale}
            onAppend={(transcript) =>
              editText(text ? text + "\n" + transcript : transcript)
            }
          />
          <div className="field">
            <Label htmlFor="intake-text">
              {messages.intake.detailedDescriptionLabel}
            </Label>
            <Textarea
              id="intake-text"
              lang={locale}
              maxLength={LIMITS.intakeText}
              required
              rows={9}
              placeholder={copy.intakeTextPlaceholder}
              value={text}
              onChange={(event) => editText(event.target.value)}
            />
            <small>
              {text.length.toLocaleString()} /{" "}
              {LIMITS.intakeText.toLocaleString()} {copy.charactersUnit}.{" "}
              {copy.intakeStaysNote}
            </small>
          </div>
          <ReadAloud text={text} locale={locale} />
          <Label className="checkbox-line">
            <Input
              type="checkbox"
              checked={reviewed}
              onChange={(event) => setReviewed(event.target.checked)}
            />
            {copy.reviewIntake}
          </Label>
          {ready ? (
            <SaveIntake
              title={title}
              text={text}
              locale={locale}
              reviewed={reviewed}
              onBusy={lockInput}
            />
          ) : (
            <>
              <Button className="btn" disabled>
                {copy.saveUnavailable}
              </Button>
              <p className="muted">
                {account && account.role !== "user"
                  ? copy.intakeRoleNote
                  : copy.notSaved}
              </p>
            </>
          )}
        </fieldset>
      </div>
    </>
  );
}

function SaveIntake({
  title,
  text,
  locale,
  reviewed,
  onBusy,
}: {
  title: string;
  text: string;
  locale: PilotLocale;
  reviewed: boolean;
  onBusy: (value: boolean) => void;
}) {
  const create = useMutation(api.cases.create);
  const send = useAction(api.chat.send);
  const router = useRouter();
  const { locale: uiLocale } = useLocale();
  const chatCopy = intakeChatCopy[uiLocale];
  const [consent, setConsent] = useState(false);
  const submitting = useRef(false);
  const savedCase = useRef<Id<"cases"> | null>(null);
  const creation = useRef<{ fingerprint: string; requestId: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setConsent(false); }, [title, text, locale]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !reviewed || !title.trim() || !text.trim()) return;
    const wantsChat = (event.nativeEvent instanceof SubmitEvent && event.nativeEvent.submitter instanceof HTMLButtonElement)
      ? event.nativeEvent.submitter.value !== "private" : true;
    if (wantsChat && !consent) return;
    submitting.current = true;
    onBusy(true);
    setPending(true);
    setError("");
    try {
      const fingerprint = JSON.stringify([title.trim(), text.trim(), locale]);
      if (creation.current?.fingerprint !== fingerprint) creation.current = { fingerprint, requestId: crypto.randomUUID() };
      const caseId = savedCase.current ?? await create({
        title: title.trim(),
        text: text.trim(),
        locale,
        context: [],
        requestId: creation.current.requestId,
      });
      savedCase.current = caseId;
      if (wantsChat) {
        try {
          await send({ caseId, message: intakeChatCopy[locale].initialMessage, documentIds: [], requestId: `initial-${caseId}`, contextKey: "0:0:", consent: true });
        } catch {
          // The intake remains saved even if dispatch or its acknowledgement fails.
          setError(chatCopy.failed);
          return;
        }
      }
      router.push(`/workspace/cases/${caseId}`);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPending(false);
      submitting.current = false;
      onBusy(Boolean(savedCase.current));
    }
  }
  return (
    <form onSubmit={save}>
      <Label className="checkbox-line" style={{ marginBottom: 14 }}>
        <Input type="checkbox" checked={consent} disabled={pending || !reviewed} onChange={(event) => setConsent(event.target.checked)} />
        {chatCopy.consent}
      </Label>
      <p className="muted small-text" style={{ marginBottom: 16 }}>{chatCopy.documents}</p>
      {error && (
        <p
          className="status-message error"
          role="alert"
          style={{ marginBottom: 15 }}
        >
          {error}
        </p>
      )}
      {savedCase.current && error && (
        <a className="btn secondary" href={`/workspace/cases/${savedCase.current}`} style={{ marginBottom: 14 }}>Open saved case</a>
      )}
      <div className="actions">
      <Button
        className="btn"
        type="submit" value="chat"
        disabled={pending || !reviewed || !consent || !title.trim() || !text.trim() || Boolean(savedCase.current)}
      >
        {pending ? chatCopy.pending : chatCopy.send}
      </Button>
      <Button className="btn secondary" type="submit" value="private" disabled={pending || !reviewed || !title.trim() || !text.trim() || Boolean(savedCase.current)}>{chatCopy.saveOnly}</Button>
      </div>
    </form>
  );
}
