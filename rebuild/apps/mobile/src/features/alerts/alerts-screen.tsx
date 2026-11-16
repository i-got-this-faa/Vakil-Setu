import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@legal-setu/backend/api";
import type { Doc } from "@legal-setu/backend/data-model";
import { router } from "expo-router";
import { useState } from "react";
import { Badge, Body, Button, Card, EmptyState, LoadMoreButton, Loading, Notice, Screen, Small, Stack, Title } from "../../components/ui";
import { AccountGate } from "../account/account-gate";
import { convexErrorMessage } from "../../lib/errors";
import { formatIst } from "../../lib/format";
import { useLocale } from "../../providers/locale";
import { STRINGS } from "../../lib/strings";

export function AlertsScreen() {
  return (
    <AccountGate>
      <AlertsList />
    </AccountGate>
  );
}

function AlertsList() {
  const { copy } = useLocale();
  const { results, status, loadMore } = usePaginatedQuery(api.notifications.mine, {}, { initialNumItems: 20 });
  return (
    <Screen>
      <Title>{copy.product.notifications}</Title>
      <Body muted>{STRINGS.alertsIntro}</Body>
      {status === "LoadingFirstPage" ? (
        <Loading label={STRINGS.loading} />
      ) : results.length === 0 ? (
        <EmptyState title={STRINGS.noAlertsTitle}>{STRINGS.noAlertsBody}</EmptyState>
      ) : (
        <Stack>
          {results.map((notification) => (
            <NotificationRow key={notification._id} notification={notification} />
          ))}
        </Stack>
      )}
      <LoadMoreButton status={status} onLoadMore={() => loadMore(20)} />
    </Screen>
  );
}

function NotificationRow({ notification }: { notification: Doc<"notifications"> }) {
  const { locale } = useLocale();
  const markRead = useMutation(api.notifications.markRead);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const unread = !notification.readAt;
  async function read() {
    setBusy(true);
    setError("");
    try {
      await markRead({ notificationId: notification._id });
    } catch (failure) {
      setError(convexErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <Badge label={unread ? STRINGS.unread : STRINGS.read} tone={unread ? "warning" : "neutral"} />
      <Body>{notification.message}</Body>
      <Small>{formatIst(notification._creationTime, locale)}</Small>
      {notification.bookingId ? <Button variant="secondary" label={STRINGS.viewConsultations} onPress={() => router.push("/(tabs)/bookings")} /> : null}
      {unread ? <Button variant="secondary" label={STRINGS.markAsRead} busy={busy} busyLabel={STRINGS.saving} onPress={() => void read()} /> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Card>
  );
}
