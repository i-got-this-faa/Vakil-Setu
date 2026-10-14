"use client";

import { Button } from "@vakil/ui";

import Link from "next/link";
import { useState } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@vakil/backend/api";
import type { Doc } from "@vakil/backend/data-model";
import { ServiceBoundary } from "./providers";
import { EmptyState, formatTime, LoadMore } from "./shared";
import { errorMessage } from "@/lib/errors";

export function NotificationsPage() {
  return (
    <>
      <div className="workspace-heading">
        <div>
          <div className="eyebrow">Keep informed</div>
          <h1>Notifications.</h1>
          <p className="page-description">
            In-app updates from actual booking and application changes. Email
            and push delivery are not part of this pilot.
          </p>
        </div>
      </div>
      <ServiceBoundary>
        <NotificationList />
      </ServiceBoundary>
    </>
  );
}

function NotificationList() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.notifications.mine,
    {},
    { initialNumItems: 20 },
  );
  return (
    <>
      {results.length ? (
        <div className="card">
          {results.map((notification) => (
            <NotificationRow
              key={notification._id}
              notification={notification}
            />
          ))}
        </div>
      ) : (
        status !== "LoadingFirstPage" && (
          <EmptyState title="Nothing to catch up on.">
            Updates will appear here when a request or application changes.
          </EmptyState>
        )
      )}
      <LoadMore status={status} loadMore={loadMore} />
    </>
  );
}

function NotificationRow({
  notification,
}: {
  notification: Doc<"notifications">;
}) {
  const markRead = useMutation(api.notifications.markRead);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function read() {
    setPending(true);
    try {
      await markRead({ notificationId: notification._id });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="list-row">
      <div>
        <p>{notification.message}</p>
        <p className="muted small-text">
          {formatTime(notification._creationTime)} ·{" "}
          {notification.readAt ? "Read" : "Unread"}
        </p>
        {error && (
          <p role="alert" className="status-message error">
            {error}
          </p>
        )}
      </div>
      <div className="actions">
        {notification.bookingId && (
          <Link className="btn secondary small" href="/workspace/bookings">
            View consultations
          </Link>
        )}
        {!notification.readAt && (
          <Button
            className="btn secondary small"
            disabled={pending}
            onClick={read}
          >
            {pending ? "Saving…" : "Mark as read"}
          </Button>
        )}
      </div>
    </div>
  );
}
