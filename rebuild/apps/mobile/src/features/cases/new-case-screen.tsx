import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@legal-setu/backend/api";
import type { Id } from "@legal-setu/backend/data-model";
import { LIMITS } from "@legal-setu/domain";
import { locales, type Locale } from "@legal-setu/i18n";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { randomUUID } from "expo-crypto";
import { Body, Button, Checkbox, Chip, Loading, Notice, Screen, Small, TextField, Title } from "../../components/ui";
import { AccountGate } from "../account/account-gate";
import { convexErrorMessage } from "../../lib/errors";
import { validateIntake, TITLE_MAX_CHARS, type IntakeProblem } from "../../lib/drafts";
import { aiAllowedForLocale, vertexFallbackEnabled } from "../../lib/capabilities";
import { vertexFallbackNotice } from "../../lib/consent";
import { copyFor, useLocale } from "../../providers/locale";
import { interpolate } from "../../lib/i18n-template";
import { STRINGS } from "../../lib/strings";
import { space } from "../../theme";

export function NewCaseScreen() {
  return (
    <AccountGate>
      <IntakeForm />
    </AccountGate>
  );
}

function problemMessage(problem: IntakeProblem): string {
  switch (problem) {
    case "title_required": return STRINGS.titleRequired;
    case "title_too_long": return interpolate(STRINGS.titleTooLong, { max: TITLE_MAX_CHARS });
    case "text_required": return STRINGS.textRequired;
    case "text_too_long": return interpolate(STRINGS.textTooLong, { max: LIMITS.intakeText });
    default: {
      const exhaustive: never = problem;
      return exhaustive;
    }
  }
}

function IntakeForm() {
  const { locale: interfaceLocale, copy, messages } = useLocale();
  const create = useMutation(api.cases.create);
  const send = useAction(api.chat.send);
  const capabilities = useQuery(api.chat.capabilities, {});
  const [intakeLocale, setIntakeLocale] = useState<Locale>(interfaceLocale);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedCaseId, setSavedCaseId] = useState<Id<"cases"> | null>(null);
  const submitting = useRef(false);
  const creation = useRef<{ fingerprint: string; requestId: string } | null>(null);
  const aiAllowed = aiAllowedForLocale(capabilities, intakeLocale);
  const vertex = vertexFallbackEnabled(capabilities);
  const intakeCopy = copyFor(intakeLocale).intake;
  const locked = busy || savedCaseId !== null;

  // Consent never carries over to a changed intake, locale or provider configuration (web parity).
  useEffect(() => {
    setAiConsent(false);
  }, [title, text, intakeLocale, aiAllowed, vertex]);

  async function save(withAi: boolean) {
    if (submitting.current || savedCaseId !== null) return;
    const problem = validateIntake({ title, text });
    if (problem) {
      setError(problemMessage(problem));
      return;
    }
    if (!reviewed) {
      setError(STRINGS.reviewRequired);
      return;
    }
    if (withAi && (!aiConsent || !aiAllowed)) {
      setError(STRINGS.aiConsentRequired);
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const fingerprint = JSON.stringify([title.trim(), text.trim(), intakeLocale]);
      if (creation.current?.fingerprint !== fingerprint) creation.current = { fingerprint, requestId: randomUUID() };
      const caseId = await create({
        title: title.trim(),
        text: text.trim(),
        locale: intakeLocale,
        context: [],
        requestId: creation.current.requestId,
      });
      setSavedCaseId(caseId);
      if (withAi) {
        try {
          await send({
            caseId,
            message: intakeCopy.initialMessage,
            documentIds: [],
            requestId: `initial-${caseId}`,
            contextKey: "0:0:",
            consent: true,
            ...(vertex ? { allowVertexFallback: true as const } : {}),
          });
        } catch {
          // The intake is saved even when the acknowledgement fails; the case screen shows its state.
          setError(intakeCopy.failed);
          return;
        }
      }
      router.replace(`/case/${caseId}`);
    } catch (failure) {
      setError(convexErrorMessage(failure));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>{copy.product.concernTitle}</Title>
      <Body muted>{copy.product.concernDescription}</Body>
      <Small>{copy.product.intakeLanguage}</Small>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {locales.map((language) => (
          <Chip
            key={language.shortCode}
            label={language.nativeName}
            selected={intakeLocale === language.shortCode}
            onPress={() => {
              if (locked) return;
              setIntakeLocale(language.shortCode);
              setReviewed(false);
            }}
          />
        ))}
      </ScrollView>
      <Small>{copy.product.noTranslation}</Small>
      <TextField
        label={copy.product.shortTitle}
        value={title}
        editable={!locked}
        maxLength={TITLE_MAX_CHARS}
        placeholder={copy.product.intakeTitlePlaceholder}
        onChangeText={(value) => {
          setTitle(value);
          setReviewed(false);
        }}
      />
      {/* TODO(voice-input): speech-to-text dictation is out of scope for this mobile MVP. Add it with a verified
          microphone adapter and locale-specific speech availability checks before enabling it. */}
      <TextField
        label={messages.intake.detailedDescriptionLabel}
        value={text}
        editable={!locked}
        multiline
        maxLength={LIMITS.intakeText}
        placeholder={copy.product.intakeTextPlaceholder}
        hint={`${text.length.toLocaleString()} / ${LIMITS.intakeText.toLocaleString()} ${copy.product.charactersUnit}. ${copy.product.intakeStaysNote}`}
        onChangeText={(value) => {
          setText(value);
          setReviewed(false);
        }}
      />
      <Checkbox
        checked={reviewed}
        disabled={locked}
        onChange={setReviewed}
        label={copy.product.reviewIntake}
      />
      {capabilities === undefined ? (
        <Loading label={STRINGS.loading} />
      ) : !aiAllowed ? (
        <Notice tone="warning">{messages.failure.aiUnavailable}</Notice>
      ) : (
        <Checkbox
          checked={aiConsent}
          disabled={locked || !reviewed}
          onChange={setAiConsent}
          label={
            <>
              <Small>{intakeCopy.consent}</Small>
              {vertex ? <Small>{vertexFallbackNotice(interfaceLocale)}</Small> : null}
            </>
          }
        />
      )}
      <Small>{intakeCopy.documents}</Small>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {savedCaseId && error ? <Button variant="secondary" label={STRINGS.openSavedCase} onPress={() => router.replace(`/case/${savedCaseId}`)} /> : null}
      <View style={styles.actions}>
        <Button
          label={intakeCopy.send}
          busyLabel={intakeCopy.pending}
          busy={busy}
          disabled={locked || !reviewed || !aiConsent || !aiAllowed || !title.trim() || !text.trim()}
          onPress={() => void save(true)}
        />
        <Button
          variant="secondary"
          label={intakeCopy.saveOnly}
          disabled={locked || !reviewed || !title.trim() || !text.trim()}
          onPress={() => void save(false)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { gap: space.sm, paddingVertical: space.xs },
  actions: { gap: space.md },
});
