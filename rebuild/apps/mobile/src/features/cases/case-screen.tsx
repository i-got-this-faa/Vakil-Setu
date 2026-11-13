import { useMutation, useQuery } from "convex/react";
import { api } from "@legal-setu/backend/api";
import type { Doc, Id } from "@legal-setu/backend/data-model";
import { router } from "expo-router";
import { useState } from "react";
import { Text, StyleSheet } from "react-native";
import { Badge, Body, Button, Card, Checkbox, EmptyState, Heading, Loading, Notice, Screen, Small, Stack, Title } from "../../components/ui";
import { AccountGate } from "../account/account-gate";
import { formatIst } from "../../lib/format";
import { caseStateLabel, urgencyLabel } from "../../lib/labels";
import { convexErrorMessage } from "../../lib/errors";
import { useLocale } from "../../providers/locale";
import { ReadAloud } from "../../speech/read-aloud";
import { CaseChat } from "./case-chat";
import { SummaryEditor } from "./summary-editor";
import { AiDraft } from "./ai-draft";
import { STRINGS } from "../../lib/strings";
import { colors, radius, space } from "../../theme";

export function CaseScreen({ routeId }: { routeId: string }) {
  return (
    <AccountGate>
      <CaseResolver routeId={routeId} />
    </AccountGate>
  );
}

function CaseResolver({ routeId }: { routeId: string }) {
  const resolved = useQuery(api.cases.resolveMine, { routeId });
  if (resolved === undefined) return <Screen><Loading label={STRINGS.loading} /></Screen>;
  if (resolved === null) {
    return (
      <Screen>
        <EmptyState title={STRINGS.caseUnavailable}>{STRINGS.caseUnavailableBody}</EmptyState>
      </Screen>
    );
  }
  return <CaseDetail caseId={resolved} />;
}

function CaseDetail({ caseId }: { caseId: Id<"cases"> }) {
  const data = useQuery(api.cases.getMine, { caseId });
  if (data === undefined) return <Screen><Loading label={STRINGS.loading} /></Screen>;
  return <LoadedCase key={caseId} caseId={caseId} data={data} />;
}

type CaseData = { case: Doc<"cases">; summaries: Doc<"caseSummaries">[] };

function LoadedCase({ caseId, data }: { caseId: Id<"cases">; data: CaseData }) {
  const { copy, messages } = useLocale();
  const [summaryDraft, setSummaryDraft] = useState<string | null>(null);
  const latest = data.summaries[0];
  const hasReviewedSummary = latest?.source.kind === "manual";
  const legalCase = data.case;
  const nextStep = hasReviewedSummary
    ? STRINGS.nextReadyForAdvocate
    : latest
      ? STRINGS.nextReviewDraft
      : copy.caseCopy.savedTitle;

  return (
    <Screen>
      <Title>{legalCase.title}</Title>
      <Small>
        {caseStateLabel(legalCase.state)} · {legalCase.locale.toUpperCase()} · {STRINGS.summaryVersionShort} {legalCase.summaryVersion}
      </Small>

      <Card>
        <Heading>{nextStep}</Heading>
        <Body muted>{hasReviewedSummary ? STRINGS.nextAdvocateBody : latest ? STRINGS.nextDraftBody : copy.caseCopy.savedBody}</Body>
        {hasReviewedSummary ? (
          <Button label={STRINGS.chooseAdvocate} onPress={() => router.push("/(tabs)/discover")} />
        ) : null}
      </Card>

      <Card>
        <Heading>{STRINGS.savedIntake}</Heading>
        <Text selectable style={styles.text}>{legalCase.text}</Text>
        <ReadAloud text={legalCase.text} languageCode={legalCase.locale} />
      </Card>

      {latest ? (
        <Card>
          <Heading>{STRINGS.yourSummary}</Heading>
          <Small>
            {copy.product.domainLabels[latest.summary.domain]} · {urgencyLabel(latest.summary.urgency)} · {STRINGS.summaryVersionShort} {latest.version}
          </Small>
          <Text selectable style={styles.text}>{latest.summary.text}</Text>
          {latest.summary.urgency === "emergency" ? <Notice tone="warning">{messages.consent.emergencyDisclaimer}</Notice> : null}
        </Card>
      ) : null}

      <CaseChat caseId={caseId} caseLocale={legalCase.locale} onUseText={setSummaryDraft} />

      <Card>
        <Heading>{latest ? STRINGS.editSummary : STRINGS.writeSummary}</Heading>
        <SummaryEditor
          key={legalCase.summaryVersion}
          caseId={caseId}
          caseLocale={legalCase.locale}
          expectedVersion={legalCase.summaryVersion}
          originalText={legalCase.text}
          latest={latest}
          incomingDraft={summaryDraft}
          onDraftConsumed={() => setSummaryDraft(null)}
        />
      </Card>

      <AiDraft
        caseId={caseId}
        caseLocale={legalCase.locale}
        expectedVersion={legalCase.summaryVersion}
        expectedContextRevision={legalCase.contextRevision}
      />

      <Card>
        <Heading>{STRINGS.summaryHistory(data.summaries.length)}</Heading>
        {data.summaries.length === 0 ? <Small>{STRINGS.noSummaryYet}</Small> : null}
        <Stack>
          {data.summaries.map((version) => (
            <Card key={version._id}>
              <Badge label={version.source.kind === "manual" ? STRINGS.writtenByYou : STRINGS.providerDraft} />
              <Small>
                {STRINGS.summaryVersionShort} {version.version} · {copy.product.domainLabels[version.summary.domain]} · {urgencyLabel(version.summary.urgency)} · {formatIst(version.createdAt, legalCase.locale)}
              </Small>
              <Text selectable style={styles.text}>{version.summary.text}</Text>
            </Card>
          ))}
        </Stack>
      </Card>

      {legalCase.state === "draft" ? <DeleteDraft caseId={caseId} /> : null}
    </Screen>
  );
}

function DeleteDraft({ caseId }: { caseId: Id<"cases"> }) {
  const remove = useMutation(api.cases.deleteDraft);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function deleteDraft() {
    setBusy(true);
    setError("");
    try {
      await remove({ caseId });
      router.replace("/(tabs)/cases");
    } catch (failure) {
      setError(convexErrorMessage(failure));
      setBusy(false);
    }
  }
  return (
    <Card>
      <Heading>{STRINGS.deleteDraftTitle}</Heading>
      <Body muted>{STRINGS.deleteDraftBody}</Body>
      <Checkbox checked={confirmed} onChange={setConfirmed} disabled={busy} label={STRINGS.deleteDraftConfirm} />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button variant="danger" label={STRINGS.deleteDraftButton} busyLabel={STRINGS.deleting} busy={busy} disabled={!confirmed} onPress={() => void deleteDraft()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 16, lineHeight: 23, color: colors.ink, padding: space.md, borderRadius: radius.sm, backgroundColor: colors.subtle },
});

