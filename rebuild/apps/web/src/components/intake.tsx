"use client";

import { Button, Input, Textarea, Label } from "@vakil/ui";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@vakil/backend/api";
import { isPilotLocale, LIMITS, type PilotLocale } from "@vakil/domain";
import { useLocale } from "./locale";
import { useServices } from "./providers";
import { useAccount } from "./workspace-gate";
import { SpeechCapture, ReadAloud } from "./speech";
import { errorMessage } from "@/lib/errors";

export function Intake() {
  const { locale: uiLocale, messages, copy } = useLocale();
  const [locale, setLocale] = useState<PilotLocale>(uiLocale);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const config = useServices();
  const account = useAccount();
  const ready = config.kind === "configured" && account?.role === "user";
  function editText(value: string) {
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
        <div className="card form-stack">
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
        </div>
      </div>
    </>
  );
}

function SaveIntake({
  title,
  text,
  locale,
  reviewed,
}: {
  title: string;
  text: string;
  locale: PilotLocale;
  reviewed: boolean;
}) {
  const { copy } = useLocale();
  const create = useMutation(api.cases.create);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const caseId = await create({
        title: title.trim(),
        text: text.trim(),
        locale,
        context: [],
      });
      router.push(`/workspace/cases/${caseId}`);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={save}>
      {error && (
        <p
          className="status-message error"
          role="alert"
          style={{ marginBottom: 15 }}
        >
          {error}
        </p>
      )}
      <Button
        className="btn"
        disabled={pending || !reviewed || !title.trim() || !text.trim()}
      >
        {pending ? "Saving private intake…" : copy.saveIntake}
      </Button>
    </form>
  );
}
