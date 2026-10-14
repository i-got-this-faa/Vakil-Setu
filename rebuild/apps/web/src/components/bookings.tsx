"use client";

import { Button, Input, Label } from "@vakil/ui";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@vakil/backend/api";
import type { Doc, Id } from "@vakil/backend/data-model";
import { nextBookingState, type BookingAction } from "@vakil/domain";
import {
  EmptyState,
  bookingActorLabel,
  bookingEventLabel,
  consultationModeLabel,
  formatTime,
  LoadMore,
  urgencyLabel,
} from "./shared";
import { useAccount } from "./workspace-gate";
import { ServiceBoundary } from "./providers";
import { errorMessage } from "@/lib/errors";
import { useLocale } from "./locale";

export function BookingsPage() {
  const { messages } = useLocale();
  const account = useAccount();
  return (
    <>
      <div className="workspace-heading">
        <div>
          <div className="eyebrow">Your next steps</div>
          <h1>{messages.navigation.consultations}</h1>
          <p className="page-description">
            Requests, acceptance, cancellations, completion, and expiry. All
            times are in Indian Standard Time.
          </p>
        </div>
        <Link className="btn secondary" href="/discover">
          Find an advocate
        </Link>
      </div>
      <ServiceBoundary>
        {account?.role === "admin" ? (
          <p className="status-message">
            Private consultation records are available only to the participating
            user and advocate.
          </p>
        ) : (
          <BookingsList />
        )}
      </ServiceBoundary>
    </>
  );
}

function BookingsList() {
  const account = useAccount();
  const { results, status, loadMore } = usePaginatedQuery(
    api.bookings.mine,
    {},
    { initialNumItems: 20 },
  );
  if (!account || account.role === "admin") return null;
  const actor = account.role;
  return (
    <>
      {results.length ? (
        <div className="stack">
          {results.map((booking) => (
            <BookingCard key={booking._id} booking={booking} actor={actor} />
          ))}
        </div>
      ) : (
        status !== "LoadingFirstPage" && (
          <EmptyState
            title="No consultation requests yet."
            action={
              <Link
                className="btn"
                href={
                  account.role === "advocate"
                    ? "/workspace/advocate"
                    : "/discover"
                }
              >
                {account.role === "advocate"
                  ? "Manage profile and availability"
                  : "Browse approved advocates"}
              </Link>
            }
          >
            Requests appear here after they are saved by the service. A pending
            request is waiting for advocate acceptance.
          </EmptyState>
        )
      )}
      <LoadMore status={status} loadMore={loadMore} />
    </>
  );
}

function BookingCard({
  booking,
  actor,
}: {
  booking: Doc<"bookings">;
  actor: "user" | "advocate";
}) {
  const { copy } = useLocale();
  const transition = useMutation(api.bookings.transition);
  const [now, setNow] = useState(() => Date.now());
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<BookingAction | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const actions: BookingAction[] = ["accept", "decline", "cancel", "complete"];
  const allowed = actions.filter(
    (action) =>
      nextBookingState({
        state: booking.state,
        action,
        actor,
        now,
        start: booking.start,
        end: booking.end,
      }) !== null,
  );
  async function act(action: BookingAction) {
    setPending(action);
    setError("");
    try {
      await transition({
        bookingId: booking._id,
        action,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPending(null);
    }
  }
  const labels: Record<BookingAction, string> = {
    accept: "Accept consultation",
    decline: "Decline request",
    cancel: "Cancel consultation",
    complete: "Mark completed",
  };
  return (
    <article className="card">
      <div className="actions" style={{ justifyContent: "space-between" }}>
        <h2>{formatTime(booking.start)}</h2>
        <span
          className={`badge${booking.state === "accepted" ? "" : " neutral"}`}
        >
          {booking.state}
        </span>
      </div>
      <p className="muted" style={{ marginBlock: 14 }}>
        {Math.round((booking.end - booking.start) / 60000)} minutes ·{" "}
        {consultationModeLabel(booking.consultationMode)} · Summary version{" "}
        {booking.summaryVersion} · Reference {booking._id}
      </p>
      {booking.state === "pending" && (
        <p className="status-message">
          Awaiting advocate acceptance. Expires {formatTime(booking.expiresAt)}{" "}
          IST.{" "}
          {now >= booking.expiresAt &&
            "The expiry deadline has passed; the service will finalize its state."}
        </p>
      )}
      {booking.reason && (
        <p className="muted">Recorded reason: {booking.reason}</p>
      )}
      {booking.adminHandling?.kind === "pending" && (
        <p className="status-message">
          This accepted consultation requires administrator handling before
          completion: {booking.adminHandling.reason}
        </p>
      )}
      {booking.adminHandling?.kind === "resolved" && (
        <p className="muted">
          Administrator handling resolved ({booking.adminHandling.action}):{" "}
          {booking.adminHandling.reason}
        </p>
      )}
      <details style={{ marginTop: 20 }}>
        <summary>View the shared summary snapshot</summary>
        <p className="muted" style={{ marginTop: 13 }}>
          {booking.summarySnapshot.locale.toUpperCase()} ·{" "}
          {booking.summarySnapshot.domain} ·{" "}
          {urgencyLabel(booking.summarySnapshot.urgency)} urgency ·{" "}
          {booking.summarySource.kind} source
        </p>
        <p className="summary-text" style={{ paddingBlock: 15 }}>
          {booking.summarySnapshot.text}
        </p>
        {booking.summarySnapshot.actions.length > 0 && (
          <ul>
            {booking.summarySnapshot.actions.map((action, index) => (
              <li key={`${index}:${action}`}>{action}</li>
            ))}
          </ul>
        )}
        <p className="muted small-text">
          This approved snapshot is immutable. Later changes to the private case
          do not change it. Urgency and category are preliminary information,
          not legal advice or a professional assessment.
        </p>
      </details>
      <BookingHistory bookingId={booking._id} />
      {(booking.state === "pending" || booking.state === "accepted") && (
        <p className="muted small-text" style={{ marginTop: 16 }}>
          {copy.cancelBeforeStart}
        </p>
      )}
      {allowed.length > 0 && (
        <>
          <div className="field" style={{ marginTop: 20 }}>
            <Label htmlFor={`reason-${booking._id}`}>
              {actor === "advocate"
                ? "Reason (required when the advocate cancels)"
                : "Reason or note (optional)"}
            </Label>
            <Input
              id={`reason-${booking._id}`}
              maxLength={1000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <div className="actions" style={{ marginTop: 16 }}>
            {allowed.map((action) => (
              <Button
                key={action}
                className={`btn${action === "cancel" || action === "decline" ? " secondary" : ""}`}
                disabled={
                  pending !== null ||
                  (booking.state === "pending" && now >= booking.expiresAt) ||
                  (actor === "advocate" &&
                    action === "cancel" &&
                    !reason.trim())
                }
                onClick={() => act(action)}
              >
                {pending === action ? "Saving…" : labels[action]}
              </Button>
            ))}
          </div>
        </>
      )}
      {error && (
        <p
          className="status-message error"
          role="alert"
          style={{ marginTop: 16 }}
        >
          {error}
        </p>
      )}
    </article>
  );
}

function BookingHistory({ bookingId }: { bookingId: Id<"bookings"> }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.bookings.history,
    { bookingId },
    { initialNumItems: 20 },
  );
  return (
    <details style={{ marginTop: 20 }}>
      <summary>Recorded status history</summary>
      {results.length ? (
        <div className="stack" style={{ marginTop: 13, gap: 10 }}>
          {results.map((entry) => (
            <div key={entry._id}>
              <p>{bookingEventLabel(entry.event)}</p>
              <p className="muted small-text">
                {bookingActorLabel(entry.actor)} · {formatTime(entry.at)} IST
              </p>
            </div>
          ))}
        </div>
      ) : (
        status !== "LoadingFirstPage" && (
          <p className="muted" style={{ marginTop: 13 }}>
            No recorded events yet.
          </p>
        )
      )}
      <LoadMore status={status} loadMore={loadMore} />
    </details>
  );
}
