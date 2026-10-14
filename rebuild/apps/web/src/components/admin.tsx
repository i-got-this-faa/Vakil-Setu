"use client";

import { Button, Input, Textarea, Label } from "@vakil/ui";

import { useEffect, useState, type FormEvent } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@vakil/backend/api";
import type { Doc, Id } from "@vakil/backend/data-model";
import type { BookingState, ConsultationMode } from "@vakil/domain";
import { RequireRole, useAccount } from "./workspace-gate";
import {
  EmptyState,
  LoadMore,
  consultationModeLabel,
  formatTime,
} from "./shared";
import { CredentialDownload, type CredentialMetadata } from "./credentials";
import { errorMessage } from "@/lib/errors";
import { useLocale } from "./locale";

export function AdminPage() {
  const { messages } = useLocale();
  return (
    <>
      <div className="workspace-heading">
        <div>
          <div className="eyebrow">Private administrative review</div>
          <h1>{messages.admin.title}</h1>
          <p className="page-description">
            Review credential evidence before approving the current application
            revision. Reasons are recorded on the service. Accepted
            consultations affected by a lost approval wait below for an explicit
            retain-or-cancel decision.
          </p>
        </div>
      </div>
      <RequireRole role="admin">
        <ReviewQueue />
        <AccountManagement />
        <AffectedBookings />
      </RequireRole>
    </>
  );
}

type QueueStatus = "pending" | "approved" | "rejected" | "suspended";

const queueStatusLabels: Record<QueueStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

function ReviewQueue() {
  const [statusFilter, setStatusFilter] = useState<QueueStatus>("pending");
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.queue,
    { status: statusFilter },
    { initialNumItems: 20 },
  );
  return (
    <section aria-label="Advocate application queue">
      <div className="workspace-heading" style={{ marginBottom: 18 }}>
        <div>
          <div className="eyebrow">Application queue</div>
          <h2>Profile review.</h2>
        </div>
        <div className="field" style={{ minWidth: 220 }}>
          <Label htmlFor="admin-queue-status">Application status</Label>
          <select
            id="admin-queue-status"
            value={statusFilter}
            onChange={(event) => {
              const value = event.target.value;
              if (
                value === "pending" ||
                value === "approved" ||
                value === "rejected" ||
                value === "suspended"
              ) {
                setStatusFilter(value);
              }
            }}
          >
            {(Object.keys(queueStatusLabels) as QueueStatus[]).map((value) => (
              <option key={value} value={value}>
                {queueStatusLabels[value]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {results.length ? (
        <div className="stack">
          {results.map((item) => (
            <ApplicationCard
              key={`${item.advocate._id}:${item.advocate.revision}`}
              advocate={item.advocate}
              credentials={item.credentials}
            />
          ))}
        </div>
      ) : (
        status !== "LoadingFirstPage" && (
          <EmptyState title={`No ${statusFilter} applications.`}>
            The {statusFilter} queue is empty. Approved profiles stay reachable
            here for suspension; rejected and suspended profiles stay reachable
            for reapproval.
          </EmptyState>
        )
      )}
      <LoadMore status={status} loadMore={loadMore} />
    </section>
  );
}

function ApplicationCard({
  advocate,
  credentials,
}: {
  advocate: Doc<"advocates">;
  credentials: CredentialMetadata[];
}) {
  const review = useMutation(api.admin.review);
  const [reason, setReason] = useState("");
  const [decision, setDecision] = useState<"approve" | "reject" | "suspend">(
    "approve",
  );
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const valid = credentials.some(
    (credential) => credential.review.kind === "valid",
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await review({
        advocateId: advocate._id,
        revision: advocate.revision,
        decision,
        reason: reason.trim(),
      });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPending(false);
    }
  }
  return (
    <article className="card">
      <div className="actions" style={{ justifyContent: "space-between" }}>
        <h2>{advocate.displayName}</h2>
        <span className="badge neutral">Revision {advocate.revision}</span>
      </div>
      <p className="muted" style={{ marginBlock: 14 }}>
        {advocate.city} · {advocate.yearsExperience} years of practice
        <br />
        Bar registration: {advocate.barRegistration}
        <br />
        Areas: {advocate.domains.join(", ")} · Languages:{" "}
        {advocate.locales.join(", ")}
        <br />
        Consultation modes:{" "}
        {advocate.consultationModes
          .map((mode) => consultationModeLabel(mode))
          .join(", ")}
      </p>
      <p>{advocate.bio}</p>
      <div className="divider" />
      <h3>Credential evidence</h3>
      {credentials.length ? (
        credentials.map((credential) => (
          <CredentialReview key={credential._id} credential={credential} />
        ))
      ) : (
        <p className="status-message" style={{ marginTop: 18 }}>
          No credential uploaded. This application cannot be approved yet.
        </p>
      )}
      <div className="divider" />
      <form className="form-stack" onSubmit={submit}>
        <div className="field">
          <Label htmlFor={`decision-${advocate._id}`}>
            Application decision
          </Label>
          <select
            id={`decision-${advocate._id}`}
            value={decision}
            onChange={(event) => {
              const value = event.target.value;
              if (
                value === "approve" ||
                value === "reject" ||
                value === "suspend"
              ) {
                setDecision(value);
                setConfirm(false);
              }
            }}
          >
            <option value="approve">Approve current revision</option>
            <option value="reject">Reject application</option>
            <option value="suspend">Suspend profile</option>
          </select>
        </div>
        <div className="field">
          <Label htmlFor={`admin-reason-${advocate._id}`}>
            Review reason (required)
          </Label>
          <Textarea
            id={`admin-reason-${advocate._id}`}
            rows={3}
            style={{ minHeight: 100 }}
            required
            maxLength={1000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <Label className="checkbox-line">
          <Input
            type="checkbox"
            checked={confirm}
            onChange={(event) => setConfirm(event.target.checked)}
          />
          I reviewed this application and its private evidence. I understand
          that rejecting or suspending closes pending requests and flags
          accepted consultations for explicit handling. Record this decision for
          revision {advocate.revision}.
        </Label>
        {decision === "approve" && !valid && (
          <p className="muted">
            Mark at least one inspected credential valid before approval.
          </p>
        )}
        {decision !== "approve" && (
          <p className="status-message">
            Rejecting or suspending closes every pending request for this
            advocate. Accepted consultations are preserved until an
            administrator retains or cancels each one below.
          </p>
        )}
        {error && (
          <p role="alert" className="status-message error">
            {error}
          </p>
        )}
        <Button
          className="btn"
          disabled={
            pending ||
            !confirm ||
            !reason.trim() ||
            (decision === "approve" && !valid)
          }
        >
          {pending ? "Recording decision…" : "Record application decision"}
        </Button>
      </form>
    </article>
  );
}

function AccountManagement() {
  const { copy } = useLocale();
  const current = useAccount();
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.accounts,
    {},
    { initialNumItems: 20 },
  );
  return (
    <section aria-label="Account management" style={{ marginTop: 32 }}>
      <div className="workspace-heading">
        <div>
          <div className="eyebrow">Authenticated accounts</div>
          <h2>Account access.</h2>
          <p className="page-description">
            Disable or reactivate user, advocate, and administrator accounts
            with an explicit recorded reason. Disabling flags live
            consultations for explicit handling below; reactivation does not
            restore advocate approval. Account identifiers only — no Clerk
            subjects are shown here.
          </p>
        </div>
      </div>
      {results.length ? (
        <div className="stack">
          {results.map((account) => (
            <AccountRow
              key={account._id}
              account={account}
              isSelf={current?._id === account._id}
              selfNote={copy.selfDisableNote}
            />
          ))}
        </div>
      ) : (
        status !== "LoadingFirstPage" && (
          <EmptyState title="No accounts found.">
            Accounts appear here after registration.
          </EmptyState>
        )
      )}
      <LoadMore status={status} loadMore={loadMore} />
    </section>
  );
}

type ManagedAccount = {
  _id: Id<"accounts">;
  displayName: string;
  role: Doc<"accounts">["role"];
  locale: Doc<"accounts">["locale"];
  disabled: boolean;
};

function AccountRow({
  account,
  isSelf,
  selfNote,
}: {
  account: ManagedAccount;
  isSelf: boolean;
  selfNote: string;
}) {
  const setDisabled = useMutation(api.admin.setDisabled);
  const [disabled, setDisabledValue] = useState(account.disabled);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSaved("");
    try {
      await setDisabled({
        accountId: account._id,
        disabled,
        reason: reason.trim(),
      });
      setSaved(
        disabled
          ? "Account disabled. Live consultations were flagged for handling."
          : "Account reactivated. Advocate approval still requires review.",
      );
      setConfirm(false);
      setReason("");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPending(false);
    }
  }
  const selfBlock = isSelf && disabled;
  return (
    <article className="card">
      <div className="actions" style={{ justifyContent: "space-between" }}>
        <h3>{account.displayName}</h3>
        <span className={`badge${account.disabled ? " neutral" : ""}`}>
          {account.disabled ? "disabled" : "active"} · {account.role}
        </span>
      </div>
      <p className="muted" style={{ marginBlock: 14 }}>
        Role: {account.role} · Intake language:{" "}
        {account.locale.toUpperCase()} · Reference {account._id}
      </p>
      <form className="form-stack" onSubmit={submit}>
        <div className="field">
          <Label htmlFor={`account-disabled-${account._id}`}>
            Account access
          </Label>
          <select
            id={`account-disabled-${account._id}`}
            value={disabled ? "disabled" : "active"}
            onChange={(event) => {
              setDisabledValue(event.target.value === "disabled");
              setConfirm(false);
            }}
          >
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
        <div className="field">
          <Label htmlFor={`account-reason-${account._id}`}>
            Account status reason (required)
          </Label>
          <Textarea
            id={`account-reason-${account._id}`}
            rows={3}
            style={{ minHeight: 100 }}
            required
            maxLength={1000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <Label className="checkbox-line">
          <Input
            type="checkbox"
            checked={confirm}
            onChange={(event) => setConfirm(event.target.checked)}
          />
          I reviewed this account and understand that disabling flags its live
          consultations for explicit handling.
        </Label>
        {selfBlock ? (
          <p className="status-message" role="note">
            {selfNote}
          </p>
        ) : null}
        {error && (
          <p role="alert" className="status-message error">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="status-message">
            {saved}
          </p>
        )}
        <Button
          className="btn"
          disabled={pending || !confirm || !reason.trim() || selfBlock}
        >
          {pending ? "Recording account status…" : "Record account status"}
        </Button>
      </form>
    </article>
  );
}

type AffectedBooking = {
  _id: Id<"bookings">;
  start: number;
  end: number;
  consultationMode: ConsultationMode;
  state: BookingState;
  adminHandling:
    | { kind: "pending"; reason: string; flaggedAt: number }
    | {
        kind: "resolved";
        action: "retain" | "cancel";
        reason: string;
        adminId: Id<"accounts">;
        handledAt: number;
      }
    | undefined;
};

function AffectedBookings() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.affectedBookings,
    {},
    { initialNumItems: 20 },
  );
  return (
    <div className="stack" style={{ marginTop: 32 }}>
      <div className="workspace-heading">
        <div>
          <div className="eyebrow">Explicit handling required</div>
          <h2>Affected consultations.</h2>
          <p className="page-description">
            Accepted consultations flagged when a profile lost approval or a
            participant account was disabled. Retain or cancel each one with a
            recorded reason. Operational metadata only — no case content is
            shown here.
          </p>
        </div>
      </div>
      {results.length ? (
        <div className="stack">
          {results.map((booking) => (
            <AffectedBookingCard key={booking._id} booking={booking} />
          ))}
        </div>
      ) : (
        status !== "LoadingFirstPage" && (
          <EmptyState title="No consultations awaiting handling.">
            Flagged accepted consultations will appear here for an explicit
            decision.
          </EmptyState>
        )
      )}
      <LoadMore status={status} loadMore={loadMore} />
    </div>
  );
}

function AffectedBookingCard({ booking }: { booking: AffectedBooking }) {
  const { copy } = useLocale();
  const handle = useMutation(api.admin.handleAffectedBooking);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const canCancel = now < booking.start;
  const [action, setAction] = useState<"retain" | "cancel">("retain");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await handle({
        bookingId: booking._id,
        action,
        reason: reason.trim(),
      });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPending(false);
    }
  }
  return (
    <article className="card">
      <div className="actions" style={{ justifyContent: "space-between" }}>
        <h3>{formatTime(booking.start)} IST</h3>
        <span className="badge neutral">{booking.state}</span>
      </div>
      <p className="muted" style={{ marginBlock: 14 }}>
        {Math.round((booking.end - booking.start) / 60000)} minutes ·{" "}
        {consultationModeLabel(booking.consultationMode)} · Reference{" "}
        {booking._id}
      </p>
      {booking.adminHandling?.kind === "pending" ? (
        <p className="status-message">
          Flagged for handling: {booking.adminHandling.reason}
        </p>
      ) : (
        <p className="muted">This consultation no longer requires handling.</p>
      )}
      <form className="form-stack" style={{ marginTop: 18 }} onSubmit={submit}>
        <div className="field">
          <Label htmlFor={`handling-action-${booking._id}`}>
            Handling decision
          </Label>
          <select
            id={`handling-action-${booking._id}`}
            value={action}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "retain" || value === "cancel") {
                setAction(value);
                setConfirm(false);
              }
            }}
          >
            <option value="retain">Retain the accepted consultation</option>
            <option value="cancel" disabled={!canCancel}>Cancel the accepted consultation</option>
          </select>
          <small>{copy.cancelBeforeStart}</small>
        </div>
        <div className="field">
          <Label htmlFor={`handling-reason-${booking._id}`}>
            Handling reason (required)
          </Label>
          <Textarea
            id={`handling-reason-${booking._id}`}
            rows={3}
            style={{ minHeight: 100 }}
            required
            maxLength={1000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <Label className="checkbox-line">
          <Input
            type="checkbox"
            checked={confirm}
            onChange={(event) => setConfirm(event.target.checked)}
          />
          I reviewed the flagged consultation metadata. Record this handling
          decision.
        </Label>
        {error && (
          <p role="alert" className="status-message error">
            {error}
          </p>
        )}
        <Button
          className="btn"
          disabled={pending || !confirm || !reason.trim() || (action === "cancel" && !canCancel)}
        >
          {pending ? "Recording handling…" : "Record handling decision"}
        </Button>
      </form>
    </article>
  );
}

function CredentialReview({ credential }: { credential: CredentialMetadata }) {
  const review = useMutation(api.credentials.review);
  const [reason, setReason] = useState("");
  const [inspected, setInspected] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function record(decision: "valid" | "rejected") {
    setPending(true);
    setError("");
    try {
      await review({
        credentialId: credential._id,
        decision,
        reason: reason.trim(),
      });
      setInspected(false);
      setReason("");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPending(false);
    }
  }
  return (
    <div
      style={{
        marginBlock: 22,
        padding: 18,
        border: "1px solid #d9dfd3",
        borderRadius: 6,
      }}
    >
      <div className="actions" style={{ justifyContent: "space-between" }}>
        <strong>{credential.fileName}</strong>
        <span className="badge neutral">{credential.review.kind}</span>
      </div>
      <div style={{ marginBlock: 13 }}>
        <CredentialDownload credentialId={credential._id} />
      </div>
      {credential.review.kind !== "pending" && (
        <p className="muted">Previous review: {credential.review.reason}</p>
      )}
      <div className="field" style={{ marginTop: 15 }}>
        <Label htmlFor={`credential-reason-${credential._id}`}>
          Credential review reason
        </Label>
        <Input
          id={`credential-reason-${credential._id}`}
          maxLength={1000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
      <Label className="checkbox-line" style={{ marginTop: 13 }}>
        <Input
          type="checkbox"
          checked={inspected}
          onChange={(event) => setInspected(event.target.checked)}
        />
        I downloaded and inspected this evidence.
      </Label>
      <div className="actions" style={{ marginTop: 13 }}>
        <Button
          className="btn small"
          disabled={pending || !inspected || !reason.trim()}
          onClick={() => record("valid")}
        >
          Mark credential valid
        </Button>
        <Button
          className="btn secondary small"
          disabled={pending || !inspected || !reason.trim()}
          onClick={() => record("rejected")}
        >
          Reject credential
        </Button>
      </div>
      {error && (
        <p
          className="status-message error"
          role="alert"
          style={{ marginTop: 13 }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
