import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@legal-setu/backend/api";
import type { Doc, Id } from "@legal-setu/backend/data-model";
import { router } from "expo-router";
import { Alert, Text, StyleSheet } from "react-native";
import { useState } from "react";
import { Badge, Body, Button, Card, EmptyState, Heading, LoadMoreButton, Loading, Notice, Screen, Small, Stack, TextField, Title } from "../../components/ui";
import { AccountGate } from "../account/account-gate";
import { useNow } from "../../hooks/use-now";
import { participantBookingActions, consultationDurationMinutes, pendingRequestExpired } from "../../lib/booking";
import { convexErrorMessage } from "../../lib/errors";
import { formatIst } from "../../lib/format";
import { bookingActorLabel, bookingEventText, bookingStateLabel, bookingStateTone, consultationModeLabel, urgencyLabel } from "../../lib/labels";
import { useLocale } from "../../providers/locale";
import { colors, radius, space } from "../../theme";
import { STRINGS } from "../../lib/strings";

export function BookingsScreen() {
  return (
    <AccountGate>
      <BookingsList />
    </AccountGate>
  );
}

function BookingsList() {
  const { messages } = useLocale();
  const now = useNow(30_000);
  const { results, status, loadMore } = usePaginatedQuery(api.bookings.mine, {}, { initialNumItems: 20 });
  return (
    <Screen>
      <Title>{messages.navigation.consultations}</Title>
      <Body muted>{STRINGS.bookingsIntro}</Body>
      <Button variant="secondary" label={messages.discovery.title} onPress={() => router.push("/(tabs)/discover")} />
      {status === "LoadingFirstPage" ? (
        <Loading label={STRINGS.loading} />
      ) : results.length === 0 ? (
        <EmptyState title={STRINGS.noBookingsTitle}>{STRINGS.noBookingsBody}</EmptyState>
      ) : (
        <Stack>
          {results.map((booking) => (
            <BookingCard key={booking._id} booking={booking} now={now} />
          ))}
        </Stack>
      )}
      <LoadMoreButton status={status} onLoadMore={() => loadMore(20)} />
    </Screen>
  );
}

function BookingCard({ booking, now }: { booking: Doc<"bookings">; now: number }) {
  const { locale } = useLocale();
  const transition = useMutation(api.bookings.transition);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const actions = participantBookingActions({ state: booking.state, start: booking.start, end: booking.end, now });
  const expired = booking.state === "pending" && pendingRequestExpired(booking.expiresAt, now);

  async function cancel(bookingId: Id<"bookings">) {
    setBusy(true);
    setError("");
    try {
      await transition({ bookingId, action: "cancel", ...(reason.trim() ? { reason: reason.trim() } : {}) });
    } catch (failure) {
      setError(convexErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  function confirmCancel() {
    Alert.alert(STRINGS.cancelConfirmTitle, STRINGS.cancelConfirmBody, [
      { text: STRINGS.keepConsultation, style: "cancel" },
      { text: STRINGS.cancelConsultation, style: "destructive", onPress: () => void cancel(booking._id) },
    ]);
  }

  return (
    <Card>
      <Heading>{formatIst(booking.start, locale)}</Heading>
      <Badge label={bookingStateLabel(booking.state)} tone={bookingStateTone(booking.state)} />
      <Small>
        {consultationDurationMinutes(booking.start, booking.end)} min · {consultationModeLabel(booking.consultationMode)} · {STRINGS.summaryVersionShort} {booking.summaryVersion}
      </Small>
      {booking.state === "pending" ? (
        <Notice tone="warning">
          {STRINGS.awaitingAdvocate} {formatIst(booking.expiresAt, locale)} IST.{expired ? ` ${STRINGS.expiryPassed}` : ""}
        </Notice>
      ) : null}
      {booking.reason ? <Body muted>{STRINGS.recordedReason}: {booking.reason}</Body> : null}
      {booking.adminHandling?.kind === "pending" ? (
        <Notice tone="warning">{STRINGS.adminHandlingPending}: {booking.adminHandling.reason}</Notice>
      ) : null}
      {booking.adminHandling?.kind === "resolved" ? (
        <Small>{STRINGS.adminHandlingResolved(booking.adminHandling.action)}: {booking.adminHandling.reason}</Small>
      ) : null}

      <Button variant="secondary" label={showSnapshot ? STRINGS.hideSnapshot : STRINGS.viewSnapshot} onPress={() => setShowSnapshot((value) => !value)} />
      {showSnapshot ? (
        <Stack>
          <Small>
            {booking.summarySnapshot.locale.toUpperCase()} · {urgencyLabel(booking.summarySnapshot.urgency)} · {booking.summarySource.kind === "manual" ? STRINGS.writtenByYou : STRINGS.providerDraft}
          </Small>
          <Text selectable style={styles.snapshot}>{booking.summarySnapshot.text}</Text>
          {booking.summarySnapshot.actions.map((action, index) => (
            <Text key={`${index}:${action}`} style={styles.bullet}>• {action}</Text>
          ))}
          <Small>{STRINGS.snapshotImmutable}</Small>
        </Stack>
      ) : null}

      <Button variant="secondary" label={showHistory ? STRINGS.hideHistory : STRINGS.viewHistory} onPress={() => setShowHistory((value) => !value)} />
      {showHistory ? <BookingHistory bookingId={booking._id} /> : null}

      {actions.includes("cancel") ? (
        <Stack>
          <TextField
            label={STRINGS.reasonOptional}
            value={reason}
            onChangeText={setReason}
            maxLength={1000}
            editable={!busy}
          />
          <Small>{STRINGS.cancelBeforeStart}</Small>
          <Button variant="danger" label={STRINGS.cancelConsultation} busyLabel={STRINGS.saving} busy={busy} onPress={confirmCancel} />
        </Stack>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Card>
  );
}

function BookingHistory({ bookingId }: { bookingId: Id<"bookings"> }) {
  const { locale } = useLocale();
  const { results, status, loadMore } = usePaginatedQuery(api.bookings.history, { bookingId }, { initialNumItems: 20 });
  if (status === "LoadingFirstPage") return <Loading label={STRINGS.loading} />;
  if (results.length === 0) return <Small>{STRINGS.noEvents}</Small>;
  return (
    <Stack>
      {results.map((entry) => (
        <Card key={entry._id}>
          <Body>{bookingEventText(entry.event)}</Body>
          <Small>
            {bookingActorLabel(entry.actor.kind)} · {formatIst(entry.at, locale)}
          </Small>
        </Card>
      ))}
      <LoadMoreButton status={status} onLoadMore={() => loadMore(20)} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  snapshot: { fontSize: 16, lineHeight: 23, color: colors.ink, padding: space.md, borderRadius: radius.sm, backgroundColor: colors.subtle },
  bullet: { fontSize: 16, color: colors.ink },
});
