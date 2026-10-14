"use client";

import { Button, Input, Textarea, Label } from "@vakil/ui";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useAction,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { api } from "@vakil/backend/api";
import type { Doc, Id } from "@vakil/backend/data-model";
import {
  LEGAL_DOMAINS,
  URGENCIES,
  isLegalDomain,
  isUrgency,
  LIMITS,
  type LegalDomain,
  type Urgency,
} from "@vakil/domain";
import { useEffect, useState, type FormEvent } from "react";
import { RequireRole } from "./workspace-gate";
import { EmptyState, formatTime, LoadMore, urgencyLabel } from "./shared";
import { errorMessage } from "@/lib/errors";
import { ReadAloud } from "./speech";
import { useLocale } from "./locale";

export function CasesPage() {
  return (
    <>
      <div className="workspace-heading">
        <div>
          <div className="eyebrow">Your private records</div>
          <h1>My cases.</h1>
          <p className="page-description">
            Intake and summary versions are visible to you. Only a summary you
            approve is shared through a consultation request.
          </p>
        </div>
        <Link className="btn" href="/workspace/intake">
          New intake
        </Link>
      </div>
      <RequireRole role="user">
        <CasesList />
      </RequireRole>
    </>
  );
}

function CasesList() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.cases.listMine,
    {},
    { initialNumItems: 20 },
  );
  return (
    <>
      {results.length ? (
        <div className="card">
          {results.map((item) => (
            <div className="list-row" key={item._id}>
              <div>
                <h3>{item.title}</h3>
                <p className="muted">
                  {item.locale.toUpperCase()} · {item.state} · summary version{" "}
                  {item.summaryVersion}
                </p>
              </div>
              <Link
                className="btn secondary small"
                href={`/workspace/cases/${item._id}`}
              >
                Open case
              </Link>
            </div>
          ))}
        </div>
      ) : (
        status !== "LoadingFirstPage" && (
          <EmptyState
            title="Your story starts here."
            action={
              <Link className="btn" href="/workspace/intake">
                Create a private intake
              </Link>
            }
          >
            You haven’t saved a case yet.
          </EmptyState>
        )
      )}
      <LoadMore status={status} loadMore={loadMore} />
    </>
  );
}

export function CasePage({ caseId }: { caseId: string }) {
  return (
    <RequireRole role="user">
      <ResolveCase caseId={caseId} />
    </RequireRole>
  );
}

function ResolveCase({ caseId }: { caseId: string }) {
  const resolvedId = useQuery(api.cases.resolveMine, { routeId: caseId });
  if (resolvedId === undefined) return <p className="loading" role="status">Loading your case…</p>;
  if (resolvedId === null) return <EmptyState title="Case unavailable.">A case can only be opened by its owner.</EmptyState>;
  return <CaseDetail caseId={resolvedId} />;
}

function CaseDetail({ caseId }: { caseId: Id<"cases"> }) {
  const data = useQuery(api.cases.getMine, { caseId });
  const remove = useMutation(api.cases.deleteDraft);
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  if (!data)
    return (
      <p className="loading" role="status">
        Loading private case…
      </p>
    );
  const latest = data.summaries[0];
  async function deleteDraft() {
    setDeleting(true);
    try {
      await remove({ caseId });
      router.push("/workspace/cases");
    } catch (failure) {
      setError(errorMessage(failure));
      setDeleting(false);
    }
  }
  return (
    <>
      <div className="workspace-heading">
        <div>
          <div className="eyebrow">
            Private case · {data.case.locale.toUpperCase()}
          </div>
          <h1>{data.case.title}</h1>
          <p className="page-description">
            Version {data.case.summaryVersion} · {data.case.state}. Changes here
            never overwrite a shared consultation snapshot.
          </p>
        </div>
        <Link className="btn secondary" href="/workspace/cases">
          All cases
        </Link>
      </div>
      <div className="stack">
        <article className="card">
          <h2>Your saved intake</h2>
          <p className="summary-text muted" style={{ marginTop: 20 }}>
            {data.case.text}
          </p>
          <div style={{ marginTop: 20 }}>
            <ReadAloud text={data.case.text} locale={data.case.locale} />
          </div>
        </article>
        <FollowUp
          key={`${data.case.summaryVersion}:${data.case.contextRevision}`}
          legalCase={data.case}
        />
        <SummaryEditor
          key={data.case.summaryVersion}
          legalCase={data.case}
          latest={latest}
        />
        <AiAnalysis
          caseId={caseId}
          expectedVersion={data.case.summaryVersion}
          expectedContextRevision={data.case.contextRevision}
        />
        <article className="card">
          <h2>Version history</h2>
          {data.summaries.length ? (
            data.summaries.map((version: Doc<"caseSummaries">) => (
              <details key={version._id} style={{ marginTop: 18 }}>
                <summary>
                  Version {version.version} ·{" "}
                  {version.source.kind === "manual"
                    ? "Written by you"
                    : "Provider draft"}{" "}
                  · {version.summary.domain} ·{" "}
                  {urgencyLabel(version.summary.urgency)} ·{" "}
                  {formatTime(version.createdAt)}
                </summary>
                <p className="summary-text muted" style={{ paddingBlock: 15 }}>
                  {version.summary.text}
                </p>
              </details>
            ))
          ) : (
            <p className="muted" style={{ marginTop: 14 }}>
              No summary saved yet. Write your first version above.
            </p>
          )}
        </article>
        {data.case.state === "draft" && (
          <article className="card">
            <h2>Delete this unshared draft</h2>
            <p className="muted" style={{ marginBlock: 14 }}>
              This permanently removes the intake and all summary versions.
              Shared cases cannot be deleted as drafts.
            </p>
            <Label className="checkbox-line">
              <Input
                type="checkbox"
                checked={confirmDelete}
                onChange={(event) => setConfirmDelete(event.target.checked)}
              />
              I want to permanently delete this draft.
            </Label>
            <Button
              className="btn danger"
              disabled={!confirmDelete || deleting}
              style={{ marginTop: 16 }}
              onClick={deleteDraft}
            >
              {deleting ? "Deleting…" : "Delete draft and summary history"}
            </Button>
            {error && (
              <p
                className="status-message error"
                role="alert"
                style={{ marginTop: 14 }}
              >
                {error}
              </p>
            )}
          </article>
        )}
      </div>
    </>
  );
}

function FollowUp({ legalCase }: { legalCase: Doc<"cases"> }) {
  const { copy } = useLocale();
  const append = useMutation(api.cases.appendFollowUp);
  const [text, setText] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await append({
        caseId: legalCase._id,
        expectedVersion: legalCase.summaryVersion,
        expectedContextRevision: legalCase.contextRevision,
        text: text.trim(),
        reviewed: true,
      });
      setText("");
      setReviewed(false);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPending(false);
    }
  }
  return (
    <article className="card">
      <h2>Follow-up context</h2>
      <p className="muted" style={{ marginBlock: 14 }}>
        Follow-ups stay in {legalCase.locale.toUpperCase()} and within this
        case. Only reviewed text is appended; the service keeps the most recent
        messages within its configured bound. Appending never rewrites your
        intake or summaries.
      </p>
      {legalCase.context.length ? (
        <div className="stack" style={{ gap: 12 }}>
          {legalCase.context.map((message, index) => (
            <div key={`${legalCase.contextRevision}:${index}`}>
              <p className="muted small-text">
                {message.role === "user" ? "You" : "Assistant draft"}
              </p>
              <p style={{ marginTop: 4 }}>{message.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">No follow-up messages saved on this case yet.</p>
      )}
      <form className="form-stack" style={{ marginTop: 18 }} onSubmit={submit}>
        <div className="field">
          <Label htmlFor="followup-text">Add a reviewed follow-up</Label>
          <Textarea
            id="followup-text"
            lang={legalCase.locale}
            rows={4}
            maxLength={LIMITS.contextMessage}
            required
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setReviewed(false);
            }}
          />
          <small>
            Up to {LIMITS.contextMessage.toLocaleString()} characters. Saved
            follow-ups are included when you request an AI draft; summaries are
            never updated automatically.
          </small>
        </div>
        <Label className="checkbox-line">
          <Input
            type="checkbox"
            checked={reviewed}
            onChange={(event) => setReviewed(event.target.checked)}
          />
          {copy.followUpConsent}
        </Label>
        {error && (
          <p className="status-message error" role="alert">
            {error}
          </p>
        )}
        <Button
          className="btn secondary"
          disabled={pending || !reviewed || !text.trim()}
        >
          {pending ? "Appending…" : "Append reviewed follow-up"}
        </Button>
      </form>
    </article>
  );
}

export function SummaryEditor({
  legalCase,
  latest,
}: {
  legalCase: Doc<"cases">;
  latest: Doc<"caseSummaries"> | undefined;
}) {
  const { messages, copy } = useLocale();
  const save = useMutation(api.cases.updateSummary);
  const [text, setText] = useState(latest?.summary.text ?? "");
  const [domain, setDomain] = useState<LegalDomain>(
    latest?.summary.domain ?? "unknown",
  );
  const [urgency, setUrgency] = useState<Urgency>(
    latest?.summary.urgency ?? "low",
  );
  const [actions, setActions] = useState(
    latest?.summary.actions.join("\n") ?? "",
  );
  const [reviewed, setReviewed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await save({
        caseId: legalCase._id,
        expectedVersion: legalCase.summaryVersion,
        summary: {
          locale: legalCase.locale,
          domain,
          urgency,
          text: text.trim(),
          actions: actions
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        },
      });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPending(false);
    }
  }
  return (
    <article className="card">
      <h2>Review your private summary</h2>
      <p className="muted" style={{ marginBlock: 14 }}>
        Write or edit a summary in the intake language. Category and urgency are
        your selections, not verified legal findings. Saving creates a new
        private version.
      </p>
      <form className="form-stack" onSubmit={submit}>
        <div className="field">
          <Label htmlFor="summary-text">
            {messages.intake.issueSummaryLabel}
          </Label>
          <Textarea
            id="summary-text"
            lang={legalCase.locale}
            rows={7}
            maxLength={LIMITS.summaryText}
            required
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setReviewed(false);
            }}
          />
        </div>
        <div className="card-grid">
          <div className="field">
            <Label htmlFor="summary-domain">
              {messages.intake.categoryLabel}
            </Label>
            <select
              id="summary-domain"
              value={domain}
              onChange={(event) => {
                if (isLegalDomain(event.target.value)) {
                  setDomain(event.target.value);
                  setReviewed(false);
                }
              }}
            >
              {LEGAL_DOMAINS.map((value) => (
                <option key={value} value={value}>
                  {copy.domainLabels[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <Label htmlFor="summary-urgency">
              {messages.intake.urgencyLabel}
            </Label>
            <select
              id="summary-urgency"
              value={urgency}
              onChange={(event) => {
                if (isUrgency(event.target.value)) {
                  setUrgency(event.target.value);
                  setReviewed(false);
                }
              }}
            >
              {URGENCIES.map((value) => (
                <option key={value} value={value}>
                  {urgencyLabel(value)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {urgency === "emergency" && (
          <p className="status-message" role="note">
            {messages.consent.emergencyDisclaimer}
          </p>
        )}
        <div className="field">
          <Label htmlFor="summary-actions">
            Questions or next steps (one per line)
          </Label>
          <Textarea
            id="summary-actions"
            rows={3}
            style={{ minHeight: 100 }}
            value={actions}
            onChange={(event) => {
              setActions(event.target.value);
              setReviewed(false);
            }}
          />
          <small>
            Up to eight items, each up to 300 characters. These are your notes,
            not legal instructions.
          </small>
        </div>
        <ReadAloud text={text} locale={legalCase.locale} />
        <Label className="checkbox-line">
          <Input
            type="checkbox"
            checked={reviewed}
            onChange={(event) => setReviewed(event.target.checked)}
          />
          {copy.summaryConsent}
        </Label>
        {error && (
          <p className="status-message error" role="alert">
            {error}
          </p>
        )}
        <div className="actions">
          <Button
            className="btn"
            disabled={pending || !reviewed || !text.trim()}
          >
            {pending ? "Saving version…" : "Save reviewed summary"}
          </Button>
          {latest && (
            <Link className="btn secondary" href="/discover">
              Choose an advocate
            </Link>
          )}
        </div>
      </form>
    </article>
  );
}

function AiAnalysis({
  caseId,
  expectedVersion,
  expectedContextRevision,
}: {
  caseId: Id<"cases">;
  expectedVersion: number;
  expectedContextRevision: number;
}) {
  const analyze = useAction(api.triage.analyze);
  const { copy } = useLocale();
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState("");
  useEffect(() => { setConsent(false); }, [caseId, expectedVersion, expectedContextRevision]);
  async function run() {
    if (!consent || pending) return;
    setPending(true);
    setResult("");
    try {
      const response = await analyze({
        caseId,
        expectedVersion,
        expectedContextRevision,
        consent: true,
      });
      setResult(
        response.kind === "available"
          ? "A provider draft was saved as a new private version. Read and correct it before using it."
          : `AI assistance is unavailable (${response.reason.replaceAll("_", " ")}). No AI summary was created. You can write and save a manual summary.`,
      );
    } catch (failure) {
      setResult(errorMessage(failure));
    } finally {
      setPending(false);
    }
  }
  return (
    <article className="card">
      <h2>Optional AI assistance</h2>
      <p className="muted" style={{ marginBlock: 14 }}>
        A compatible, configured provider is required. DGX documentation and
        deployment verification are unavailable; no provider capability or legal
        accuracy is promised. Up to five attempts per hour.
      </p>
      <Label className="checkbox-line">
        <Input
          type="checkbox"
          checked={consent}
          disabled={pending}
          onChange={(event) => setConsent(event.target.checked)}
        />
        {copy.aiConsent}
      </Label>
      <Button
        className="btn secondary"
        disabled={!consent || pending}
        style={{ marginTop: 18 }}
        onClick={run}
      >
        {pending ? "Checking AI provider…" : "Request an AI draft"}
      </Button>
      {result && (
        <p role="status" className="status-message" style={{ marginTop: 18 }}>
          {result}
        </p>
      )}
    </article>
  );
}
