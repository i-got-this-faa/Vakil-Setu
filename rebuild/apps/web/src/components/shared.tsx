"use client";

import { Button } from "@vakil/ui";

import { FileSearch } from "lucide-react";
import type { ReactNode } from "react";
import type { Doc } from "@vakil/backend/data-model";

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <FileSearch size={34} strokeWidth={1.2} />
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function LoadMore({
  status,
  loadMore,
}: {
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  loadMore: (count: number) => void;
}) {
  return status === "LoadingFirstPage" ? (
    <p className="loading" role="status">
      Loading…
    </p>
  ) : status === "CanLoadMore" || status === "LoadingMore" ? (
    <Button
      className="btn secondary"
      style={{ marginTop: 24 }}
      disabled={status === "LoadingMore"}
      onClick={() => loadMore(20)}
    >
      {status === "LoadingMore" ? "Loading…" : "Load more"}
    </Button>
  ) : null;
}
export function formatTime(time: number, locale = "en-IN") {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(time);
}

// Render backend-controlled enum values tolerantly: unknown future or legacy
// values describe themselves instead of crashing or inventing a meaning.
export function urgencyLabel(value: string): string {
  switch (value) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    case "emergency":
      return "Emergency — no guaranteed response";
    case "unknown":
      return "Unknown";
    default:
      return "Unmarked";
  }
}

export function consultationModeLabel(value: string): string {
  switch (value) {
    case "phone":
      return "Phone";
    case "video":
      return "Video";
    case "in_person":
      return "In person";
    default:
      return "Not listed";
  }
}

export function bookingActorLabel(
  actor: Doc<"bookingEvents">["actor"],
): string {
  switch (actor.kind) {
    case "system":
      return "Service";
    case "user":
      return "User";
    case "advocate":
      return "Advocate";
    case "admin":
      return "Administrator";
    default: {
      const exhaustive: never = actor;
      return exhaustive;
    }
  }
}

export function bookingEventLabel(
  event: Doc<"bookingEvents">["event"],
): string {
  switch (event.kind) {
    case "requested":
      return "Consultation requested and awaiting advocate acceptance.";
    case "state_changed":
      return `Status changed from ${event.from} to ${event.to}.${event.reason ? ` Recorded reason: ${event.reason}` : ""}`;
    case "affected":
      return `Flagged for administrator handling. ${event.reason}`;
    case "admin_handled":
      return `Administrator ${event.action === "retain" ? "retained" : "cancelled"} this consultation. ${event.reason}`;
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}
