import { useMutation, useQuery, usePaginatedQuery } from "convex/react";
import { api } from "@legal-setu/backend/api";
import type { Doc, Id } from "@legal-setu/backend/data-model";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { randomUUID } from "expo-crypto";
import { Body, Button, Card, Checkbox, Chip, EmptyState, Heading, Loading, Notice, Screen, Small, Stack, Title } from "../../components/ui";
import { AccountGate } from "../account/account-gate";
import { consultationDurationMinutes } from "../../lib/booking";
import { formatIst } from "../../lib/format";
import { convexErrorMessage } from "../../lib/errors";
import { consultationModeLabel, urgencyLabel } from "../../lib/labels";
import { useLocale } from "../../providers/locale";
import { colors, radius, space } from "../../theme";
import { STRINGS } from "../../lib/strings";

export function RequestScreen({ routeId, slotId }: { routeId: string; slotId: string }) {
  return (
    <AccountGate>
      <RequestContent routeId={routeId} slotId={slotId} />
    </AccountGate>
  );
}

function RequestContent({ routeId, slotId }: { routeId: string; slotId: string }) {
  const resolved = useQuery(api.advocates.resolvePublic, { routeId });
  if (resolved === undefined) return <Screen><Loading label={STRINGS.loading} /></Screen>;
  if (resolved === null) return <Screen><EmptyState title={STRINGS.profileUnavailable}>{STRINGS.profileUnavailableBody}</EmptyState></Screen>;
  return <RequestForm advocateId={resolved} slotId={slotId} />;
}

function RequestForm({ advocateId, slotId }: { advocateId: Id<"advocates">; slotId: string }) {
  const { locale } = useLocale();
  const profile = useQuery(api.advocates.getPublic, { advocateId });
  const slots = useQuery(api.slots.listPublic, { advocateId });
  const slot = slots?.find((candidate) => candidate._id === slotId);
  if (profile === undefined || slots === undefined) return <Screen><Loading label={STRINGS.loadingProfile} /></Screen>;
  if (!profile || !slot) {
    return (
      <Screen>
        <EmptyState title={STRINGS.slotNoLongerTitle}>{STRINGS.slotNoLongerBody}</EmptyState>
        <Button variant="secondary" label={STRINGS.backToAdvocate} onPress={() => router.back()} />
      </Screen>
    );
  }
  return (
    <Screen>
      <Title>{STRINGS.requestTitle}</Title>
      <Card>
        <Heading>{profile.displayName}</Heading>
        <Body>
          {formatIst(slot.start, locale)} IST · {consultationDurationMinutes(slot.start, slot.end)} min · {consultationModeLabel(slot.consultationMode)}
        </Body>
        <Small>{STRINGS.requestNotConfirmed}</Small>
      </Card>
      <CasePicker advocateId={advocateId} advocateName={profile.displayName} slotId={slot._id} />
    </Screen>
  );
}

function CasePicker({ advocateId, advocateName, slotId }: { advocateId: Id<"advocates">; advocateName: string; slotId: Id<"slots"> }) {
  const { results, status, loadMore } = usePaginatedQuery(api.cases.listMine, {}, { initialNumItems: 20 });
  const [caseId, setCaseId] = useState<Id<"cases"> | null>(null);
  const withSummary = results.filter((item) => item.summaryVersion > 0);
  if (status === "LoadingFirstPage") return <Loading label={STRINGS.loading} />;
  if (withSummary.length === 0) {
    return (
      <EmptyState title={STRINGS.noSummaryTitle}>{STRINGS.noSummaryBody}</EmptyState>
    );
  }
  return (
    <Stack>
      <Card>
        <Heading>{STRINGS.chooseCaseTitle}</Heading>
        <Body muted>{STRINGS.chooseCaseBody}</Body>
        <View style={styles.wrap}>
          {withSummary.map((item) => (
            <Chip
              key={item._id}
              label={`${item.title} · v${item.summaryVersion}`}
              selected={caseId === item._id}
              onPress={() => setCaseId(item._id)}
            />
          ))}
        </View>
        {status === "CanLoadMore" ? <Button variant="secondary" label={STRINGS.loadMore} onPress={() => loadMore(20)} /> : null}
      </Card>
      {caseId ? <ReviewSummary key={caseId} caseId={caseId} advocateId={advocateId} advocateName={advocateName} slotId={slotId} /> : null}
    </Stack>
  );
}

function ReviewSummary({ caseId, advocateId, advocateName, slotId }: { caseId: Id<"cases">; advocateId: Id<"advocates">; advocateName: string; slotId: Id<"slots">; }) {
  const data = useQuery(api.cases.getMine, { caseId });
  if (data === undefined) return <Loading label={STRINGS.loadingSummary} />;
  const latest = data.summaries[0];
  if (!latest) {
    return <Notice tone="warning">{STRINGS.saveSummaryFirst}</Notice>;
  }
  return <SendRequest key={`${slotId}:${latest.version}`} advocateId={advocateId} advocateName={advocateName} slotId={slotId} caseId={caseId} summary={latest} />;
}

function SendRequest({
  advocateId,
  advocateName,
  slotId,
  caseId,
  summary,
}: {
  advocateId: Id<"advocates">;
  advocateName: string;
  slotId: Id<"slots">;
  caseId: Id<"cases">;
  summary: Doc<"caseSummaries">;
}) {
  const request = useMutation(api.bookings.request);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [requested, setRequested] = useState(false);
  // Stable for this screen so an uncertain network acknowledgement can be replayed safely.
  const [idempotencyKey] = useState(() => randomUUID());
  const { copy } = useLocale();

  async function send() {
    setBusy(true);
    setError("");
    try {
      await request({
        slotId,
        caseId,
        summaryVersion: summary.version,
        idempotencyKey,
        consent: { recipientAdvocateId: advocateId, summaryVersion: summary.version, granted: true },
      });
      setRequested(true);
    } catch (failure) {
      setError(convexErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  if (requested) {
    return (
      <Card>
        <Heading>{STRINGS.requestSavedTitle}</Heading>
        <Body muted>{STRINGS.requestSavedBody}</Body>
        <Button label={STRINGS.viewConsultations} onPress={() => router.replace("/(tabs)/bookings")} />
      </Card>
    );
  }

  return (
    <Card>
      <Heading>{STRINGS.summaryVersion(summary.version)}</Heading>
      <Small>
        {STRINGS.recipient}: {advocateName} · {summary.summary.locale.toUpperCase()} · {copy.product.domainLabels[summary.summary.domain]} · {urgencyLabel(summary.summary.urgency)} · {summary.source.kind === "manual" ? STRINGS.writtenByYou : STRINGS.providerDraft}
      </Small>
      <Text style={styles.summaryText}>{summary.summary.text}</Text>
      {summary.summary.actions.length > 0 ? (
        <Stack>
          {summary.summary.actions.map((action, index) => (
            <Text key={`${index}:${action}`} style={styles.bullet}>• {action}</Text>
          ))}
        </Stack>
      ) : null}
      <Checkbox
        checked={consent}
        onChange={setConsent}
        disabled={busy}
        label={`${STRINGS.consentShare(summary.version, advocateName)}`}
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button
        label={STRINGS.shareAndRequest}
        busyLabel={STRINGS.sendingRequest}
        busy={busy}
        disabled={!consent}
        onPress={() => void send()}
      />
      <Small>{STRINGS.requestExpiryNote}</Small>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  summaryText: { fontSize: 16, lineHeight: 23, color: colors.ink, padding: space.md, borderRadius: radius.sm, backgroundColor: colors.subtle },
  bullet: { fontSize: 16, color: colors.ink, lineHeight: 22 },
});
