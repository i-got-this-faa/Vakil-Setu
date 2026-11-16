import { useAction, useQuery } from "convex/react";
import { api } from "@legal-setu/backend/api";
import type { Doc, Id } from "@legal-setu/backend/data-model";
import { useEffect, useState } from "react";
import { Body, Button, Card, Checkbox, Heading, Loading, Notice, Small } from "../../components/ui";
import { aiAllowedForLocale, vertexFallbackEnabled } from "../../lib/capabilities";
import { vertexFallbackNotice } from "../../lib/consent";
import { convexErrorMessage } from "../../lib/errors";
import { useLocale } from "../../providers/locale";
import { STRINGS } from "../../lib/strings";

type Outcome = { kind: "saved" } | { kind: "unavailable"; reason: string } | { kind: "failed"; message: string };

/** Optional provider draft. Requires explicit consent each time the case version or context changes. */
export function AiDraft({
  caseId,
  caseLocale,
  expectedVersion,
  expectedContextRevision,
}: {
  caseId: Id<"cases">;
  caseLocale: Doc<"cases">["locale"];
  expectedVersion: number;
  expectedContextRevision: number;
}) {
  const { copy, messages, locale } = useLocale();
  const analyze = useAction(api.triage.analyze);
  const capabilities = useQuery(api.chat.capabilities, {});
  const vertex = vertexFallbackEnabled(capabilities);
  const aiAllowed = aiAllowedForLocale(capabilities, caseLocale);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    setConsent(false);
    setOutcome(null);
  }, [caseId, expectedVersion, expectedContextRevision, vertex]);

  async function run() {
    if (!consent || busy || !aiAllowed) return;
    setBusy(true);
    setOutcome(null);
    try {
      const response = await analyze({
        caseId,
        expectedVersion,
        expectedContextRevision,
        consent: true,
        ...(vertex ? { allowVertexFallback: true as const } : {}),
      });
      setOutcome(response.kind === "available" ? { kind: "saved" } : { kind: "unavailable", reason: response.reason });
    } catch (failure) {
      setOutcome({ kind: "failed", message: convexErrorMessage(failure) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Heading>{STRINGS.aiDraftTitle}</Heading>
      <Body muted>{STRINGS.aiDraftBody}</Body>
      {capabilities === undefined ? <Loading label={copy.product.readAloud.checking} /> : null}
      {capabilities !== undefined && !aiAllowed ? <Notice tone="warning">{messages.failure.aiUnavailable}</Notice> : null}
      <Checkbox
        checked={consent}
        disabled={busy || !aiAllowed}
        onChange={setConsent}
        label={
          <>
            <Small>{copy.product.aiConsent}</Small>
            {vertex ? <Small>{vertexFallbackNotice(locale)}</Small> : null}
          </>
        }
      />
      <Button
        variant="secondary"
        label={STRINGS.requestAiDraft}
        busyLabel={STRINGS.checkingAi}
        busy={busy}
        disabled={!consent || !aiAllowed}
        onPress={() => void run()}
      />
      {outcome?.kind === "saved" ? <Notice tone="success">{STRINGS.aiDraftSaved}</Notice> : null}
      {outcome?.kind === "unavailable" ? <Notice tone="warning">{STRINGS.aiUnavailableResult(outcome.reason)}</Notice> : null}
      {outcome?.kind === "failed" ? <Notice tone="error">{outcome.message}</Notice> : null}
      {outcome?.kind === "saved" ? <Small>{messages.consent.aiPreliminaryNotice}</Small> : null}
    </Card>
  );
}
