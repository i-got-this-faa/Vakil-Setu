import { useAction, useQuery } from "convex/react";
import { api } from "@legal-setu/backend/api";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "@legal-setu/backend/data-model";
import { CHAT_LIMITS } from "@legal-setu/domain";
import { ConvexError } from "convex/values";
import { randomUUID } from "expo-crypto";
import { useEffect, useRef, useState } from "react";
import { Linking, ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, Checkbox, Heading, Loading, Notice, Small, Stack, TextField } from "../../components/ui";
import { aiAllowedForLocale, vertexFallbackEnabled } from "../../lib/capabilities";
import { vertexFallbackNotice } from "../../lib/consent";
import { convexErrorMessage } from "../../lib/errors";
import { formatIst } from "../../lib/format";
import { chatReasonMessage, keepsHeldChatRequest, RESTORABLE_CHAT_REASONS } from "../../lib/chat";
import { interpolate } from "../../lib/i18n-template";
import { useLocale } from "../../providers/locale";
import { ReadAloud } from "../../speech/read-aloud";
import { colors, radius, space } from "../../theme";
import { STRINGS } from "../../lib/strings";

interface HeldRequest {
  readonly requestId: string;
  readonly message: string;
  readonly contextKey: string;
  readonly allowVertexFallback: boolean;
}

type Turn = FunctionReturnType<typeof api.chat.listMine>["turns"][number];

/**
 * Case chat mirrors the web contract: a consented send carries the server's contextKey and a
 * stable request ID; retries reuse that ID only while the server reports the request in progress.
 * Attachments are not uploaded from the phone; prior turns that used attachments say so.
 */
export function CaseChat({ caseId, caseLocale, onUseText }: { caseId: Id<"cases">; caseLocale: string; onUseText: (text: string) => void }) {
  const { copy, locale: interfaceLocale, messages } = useLocale();
  const chatData = useQuery(api.chat.listMine, { caseId });
  const capabilities = useQuery(api.chat.capabilities, {});
  const send = useAction(api.chat.send);
  const aiAllowed = aiAllowedForLocale(capabilities, caseLocale);
  const vertex = vertexFallbackEnabled(capabilities);
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [held, setHeld] = useState<HeldRequest | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const contextKey = chatData?.contextKey;
  const priorContextKey = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (contextKey !== undefined && priorContextKey.current !== undefined && contextKey !== priorContextKey.current) setConsent(false);
    priorContextKey.current = contextKey;
  }, [contextKey]);
  useEffect(() => {
    setConsent(false);
  }, [vertex]);

  const turns: readonly Turn[] = chatData?.turns ?? [];
  const loaded = chatData !== undefined;
  const limitReached = Boolean(chatData?.limitReached);
  const hasPendingTurn = turns.some((turn) => turn.result.kind === "pending");
  const trimmed = message.trim();
  const canSend = loaded && aiAllowed && !sending && trimmed.length > 0 && consent && !limitReached && !(hasPendingTurn && held === null);

  function changeMessage(value: string) {
    setMessage(value);
    setConsent(false);
    setSendError(null);
    setHeld(null);
  }

  function restore(turn: Turn) {
    if (sending || trimmed) return;
    setMessage(turn.text);
    setConsent(false);
    setSendError(null);
    setHeld(null);
  }

  async function submit() {
    if (!chatData || !aiAllowed || sendingRef.current) return;
    if (!consent) {
      setSendError(copy.chat.errors.consentRequired);
      return;
    }
    if (limitReached) {
      setSendError(copy.chat.turnsLimitReached);
      return;
    }
    if (!trimmed) {
      setSendError(copy.chat.errors.emptyMessage);
      return;
    }
    const retry = held !== null && held.message === trimmed;
    if (hasPendingTurn && !retry) {
      setSendError(copy.chat.errors.in_progress);
      return;
    }
    const payload: HeldRequest = retry && held
      ? held
      : { requestId: randomUUID(), message: trimmed, contextKey: chatData.contextKey, allowVertexFallback: vertex };
    if (!retry) setHeld(payload);
    sendingRef.current = true;
    setSending(true);
    setSendError(null);
    try {
      const result = await send({
        caseId,
        message: payload.message,
        documentIds: [],
        requestId: payload.requestId,
        consent: true,
        contextKey: payload.contextKey,
        ...(payload.allowVertexFallback ? { allowVertexFallback: true as const } : {}),
      });
      if (result.kind === "available") {
        setMessage("");
        setConsent(false);
        setHeld(null);
      } else {
        setSendError(chatReasonMessage(result.reason, copy.chat.errors));
        if (!keepsHeldChatRequest(result.reason)) setHeld(null);
      }
    } catch (failure) {
      if (failure instanceof ConvexError) {
        setHeld(null);
        setConsent(false);
      }
      setSendError(convexErrorMessage(failure));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  return (
    <Card>
      <Heading>{copy.chat.title}</Heading>
      <Small>{copy.chat.description}</Small>
      <Notice tone="info">{copy.chat.intakeDisclosure}</Notice>
      {!aiAllowed ? (
        <Notice tone="warning">{capabilities === undefined ? STRINGS.loading : messages.failure.aiUnavailable}</Notice>
      ) : null}

      {!loaded ? (
        <Loading label={copy.chat.loadingTurns} />
      ) : turns.length === 0 ? (
        <Small>{copy.chat.noTurns}</Small>
      ) : (
        <Stack>
          {turns.map((turn) => (
            <View key={turn._id} style={styles.turn}>
              <View style={styles.userBubble}>
                <Small>
                  {copy.chat.youLabel} · {formatIst(turn.createdAt, interfaceLocale)}
                </Small>
                <Text selectable style={styles.bubbleText}>{turn.text}</Text>
                {turn.documentIds.length > 0 ? <Small>{STRINGS.attachmentsUsedNote}</Small> : null}
              </View>
              {turn.result.kind === "reply" ? (
                <View style={styles.assistantBubble}>
                  <Small>{copy.chat.assistantLabel}</Small>
                  <Text selectable style={styles.bubbleText}>{turn.result.text}</Text>
                  <Notice tone="warning">{copy.chat.disclaimer}</Notice>
                  <ReadAloud text={turn.result.text} languageCode={caseLocale} />
                  {turn.result.legalEvidence && <View>
                    <Small>{turn.result.legalEvidence.status === "answered" ? "Source-grounded answer" : "Legal evidence: " + turn.result.legalEvidence.status}</Small>
                    {turn.result.legalEvidence.citations.map((citation, index) => <View key={`${citation.passageId}-${index}`}>
                      <Small>{citation.source.title}{citation.source.sectionNumber ? ` · Section ${citation.source.sectionNumber}` : ""}</Small>
                      <Text selectable>{citation.quote}</Text>
                      {citation.source.url.startsWith("https://") && <Button variant="secondary" label="Open original source" onPress={() => { void Linking.openURL(citation.source.url); }} />}
                    </View>)}
                    {turn.result.legalEvidence.warnings.map(warning => <Notice key={warning}>{warning}</Notice>)}
                  </View>}
                  <Button
                    variant="secondary"
                    label={copy.feature.summaryUse}
                    onPress={() => onUseText(`${turn.text}\n\n${turn.result.kind === "reply" ? turn.result.text : ""}`)}
                  />
                </View>
              ) : null}
              {turn.result.kind === "pending" ? (
                <View style={styles.pending} accessibilityRole="progressbar">
                  <ActivityIndicator color={colors.primary} />
                  <Small>{copy.chat.pendingStatus}</Small>
                </View>
              ) : null}
              {turn.result.kind === "unavailable" ? (
                <View style={styles.assistantBubble}>
                  <Badge label={STRINGS.unavailableBadge} tone="danger" />
                  <Notice tone="error">{chatReasonMessage(turn.result.reason, copy.chat.errors)}</Notice>
                  {RESTORABLE_CHAT_REASONS.includes(turn.result.reason) ? (
                    <Button
                      variant="secondary"
                      label={copy.chat.restoreMessage}
                      disabled={sending || trimmed.length > 0 || hasPendingTurn || limitReached}
                      onPress={() => restore(turn)}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          ))}
        </Stack>
      )}

      {limitReached ? (
        <Notice tone="warning">{copy.chat.turnsLimitReached}</Notice>
      ) : (
        <Stack>
          <TextField
            label={copy.chat.messageLabel}
            value={message}
            onChangeText={changeMessage}
            editable={loaded && !sending}
            multiline
            maxLength={CHAT_LIMITS.messageChars}
            placeholder={copy.chat.messagePlaceholder}
            hint={interpolate(copy.chat.charCount, { current: message.length, max: CHAT_LIMITS.messageChars })}
          />
          <Checkbox
            checked={consent}
            disabled={!loaded || sending || !aiAllowed}
            onChange={(value) => {
              setConsent(value);
              setSendError(null);
            }}
            label={
              <>
                <Small>{copy.chat.consentLabel}</Small>
                {vertex ? <Small>{vertexFallbackNotice(interfaceLocale)}</Small> : null}
              </>
            }
          />
          {sendError ? <Notice tone="error">{sendError}</Notice> : null}
          <View style={styles.actions}>
            {held ? (
              <Button
                variant="secondary"
                label={copy.chat.retryButton}
                busyLabel={copy.chat.sending}
                busy={sending}
                disabled={!aiAllowed || !loaded || sending || !consent}
                onPress={() => void submit()}
              />
            ) : null}
            <Button label={copy.chat.sendButton} busyLabel={copy.chat.sending} busy={sending} disabled={!canSend} onPress={() => void submit()} />
          </View>
        </Stack>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  turn: { gap: space.sm },
  userBubble: { gap: space.xs, padding: space.lg, borderRadius: radius.md, borderBottomRightRadius: 3, borderWidth: 1, borderColor: colors.primaryBorder, backgroundColor: colors.primarySurface },
  assistantBubble: { gap: space.sm, padding: space.lg, borderRadius: radius.md, borderBottomLeftRadius: 3, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  bubbleText: { fontSize: 16, lineHeight: 23, color: colors.ink },
  pending: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.md },
  actions: { gap: space.md },
});
