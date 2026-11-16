import { useMutation } from "convex/react";
import { api } from "@legal-setu/backend/api";
import type { Doc, Id } from "@legal-setu/backend/data-model";
import { LEGAL_DOMAINS, URGENCIES, LIMITS, type LegalDomain, type Urgency } from "@legal-setu/domain";
import { useEffect, useState } from "react";
import { Button, Checkbox, Chip, Notice, Small, Stack, TextField } from "../../components/ui";
import { convexErrorMessage } from "../../lib/errors";
import { ACTION_MAX_CHARS, parseSummaryActions, validateSummary, type SummaryProblem } from "../../lib/drafts";
import { urgencyLabel } from "../../lib/labels";
import { interpolate } from "../../lib/i18n-template";
import { useLocale } from "../../providers/locale";
import { STRINGS } from "../../lib/strings";
import { space } from "../../theme";
import { View } from "react-native";

/** Manual, versioned summary. Saving creates a new version; the reviewed text is what advocates may receive. */
export function SummaryEditor({
  caseId,
  caseLocale,
  expectedVersion,
  originalText,
  latest,
  incomingDraft,
  onDraftConsumed,
}: {
  caseId: Id<"cases">;
  caseLocale: Doc<"cases">["locale"];
  expectedVersion: number;
  originalText: string;
  latest: Doc<"caseSummaries"> | undefined;
  incomingDraft: string | null;
  onDraftConsumed: () => void;
}) {
  const { copy, messages } = useLocale();
  const save = useMutation(api.cases.updateSummary);
  const [text, setText] = useState(latest?.summary.text ?? originalText);
  const [domain, setDomain] = useState<LegalDomain>(latest?.summary.domain ?? "unknown");
  const [urgency, setUrgency] = useState<Urgency>(latest?.summary.urgency ?? "unknown");
  const [actionsText, setActionsText] = useState(latest?.summary.actions.join("\n") ?? "");
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // A reply from the case chat is appended as draft text; the user must still review and save it.
  useEffect(() => {
    if (!incomingDraft) return;
    setText((current) => `${current}${current ? "\n\n" : ""}${incomingDraft}`);
    setReviewed(false);
    onDraftConsumed();
  }, [incomingDraft, onDraftConsumed]);

  async function submit() {
    const actions = parseSummaryActions(actionsText);
    const problem = validateSummary({ text, actions });
    if (problem) {
      setError(summaryProblemMessage(problem));
      return;
    }
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await save({
        caseId,
        expectedVersion,
        summary: { locale: caseLocale, domain, urgency, text: text.trim(), actions },
      });
      setSaved(true);
      setReviewed(false);
    } catch (failure) {
      setError(convexErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack>
      <Notice tone="warning">{copy.feature.summaryReview}</Notice>
      <Small>{STRINGS.summaryEditorIntro}</Small>
      <TextField
        label={messages.intake.issueSummaryLabel}
        value={text}
        onChangeText={(value) => {
          setText(value);
          setReviewed(false);
          setSaved(false);
        }}
        editable={!busy}
        multiline
        maxLength={LIMITS.summaryText}
        hint={`${text.length.toLocaleString()} / ${LIMITS.summaryText.toLocaleString()} ${copy.product.charactersUnit}`}
      />
      <Small>{messages.intake.categoryLabel}</Small>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {LEGAL_DOMAINS.map((value) => (
          <Chip
            key={value}
            label={copy.product.domainLabels[value]}
            selected={domain === value}
            onPress={() => {
              setDomain(value);
              setReviewed(false);
            }}
          />
        ))}
      </View>
      <Small>{messages.intake.urgencyLabel}</Small>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {URGENCIES.map((value) => (
          <Chip
            key={value}
            label={urgencyLabel(value)}
            selected={urgency === value}
            onPress={() => {
              setUrgency(value);
              setReviewed(false);
            }}
          />
        ))}
      </View>
      {urgency === "emergency" ? <Notice tone="warning">{messages.consent.emergencyDisclaimer}</Notice> : null}
      <TextField
        label={STRINGS.nextStepsLabel}
        value={actionsText}
        onChangeText={(value) => {
          setActionsText(value);
          setReviewed(false);
        }}
        editable={!busy}
        multiline
        hint={interpolate(STRINGS.nextStepsHint, { max: LIMITS.actions, chars: ACTION_MAX_CHARS })}
      />
      <Checkbox checked={reviewed} disabled={busy} onChange={setReviewed} label={copy.product.summaryConsent} />
      {error ? <Notice tone="error">{error}</Notice> : null}
      {saved ? <Notice tone="success">{STRINGS.summarySaved}</Notice> : null}
      <Button
        label={STRINGS.saveReviewedSummary}
        busyLabel={STRINGS.savingVersion}
        busy={busy}
        disabled={!reviewed || !text.trim()}
        onPress={() => void submit()}
      />
    </Stack>
  );
}

function summaryProblemMessage(problem: SummaryProblem): string {
  switch (problem) {
    case "text_required": return STRINGS.summaryTextRequired;
    case "text_too_long": return interpolate(STRINGS.summaryTooLong, { max: LIMITS.summaryText });
    case "too_many_actions": return interpolate(STRINGS.tooManyActions, { max: LIMITS.actions });
    case "action_too_long": return interpolate(STRINGS.actionTooLong, { max: ACTION_MAX_CHARS });
    default: {
      const exhaustive: never = problem;
      return exhaustive;
    }
  }
}
