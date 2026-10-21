"use client";

import {
  useState,
  useRef,
  useCallback,
  useId,
  useEffect,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@vakil/backend/api";
import type { Id } from "@vakil/backend/data-model";
import { CHAT_LIMITS, type PilotLocale } from "@vakil/domain";
import { Button, Input, Textarea, Label, Badge } from "@vakil/ui";
import {
  FileText,
  Image as ImageIcon,
  Paperclip,
  AlertCircle,
  RotateCw,
  Trash2,
  Send,
  CheckCircle2,
} from "lucide-react";
import { useLocale } from "./locale";
import { ReadAloud } from "./speech";
import { formatTime } from "./shared";
import { chatCopy, type ChatCopy } from "@/lib/chat-copy";
import { errorMessage } from "@/lib/errors";
import { getFeatureCopy } from "@/lib/feature-copy";

export interface CaseChatProps {
  caseId: Id<"cases">;
  locale: PilotLocale; // PilotLocale representing the case's language
  onUseSummary?: (text: string) => void;
}

interface ActiveSendPayload {
  requestId: string;
  message: string;
  documentIds: Id<"caseDocuments">[];
  contextKey: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function resolveContentType(file: File): string | null {
  if (file.type === "application/pdf") return "application/pdf";
  if (file.type === "image/png") return "image/png";
  if (file.type === "image/jpeg") return "image/jpeg";
  if (file.type === "text/plain") return "text/plain";
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt")) return "text/plain";
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return null;
}

function getReasonMessage(reason: string, errors: ChatCopy["errors"]): string {
  switch (reason) {
    case "timeout":
      return errors.timeout;
    case "in_progress":
      return errors.in_progress;
    case "rate_limited":
      return errors.rate_limited;
    case "limit_exceeded":
      return errors.limit_exceeded;
    case "provider_failed":
      return errors.provider_failed;
    case "response_too_large":
      return errors.response_too_large;
    case "truncated":
      return errors.truncated;
    case "blocked":
      return errors.blocked;
    case "malformed":
      return errors.malformed;
    case "state_changed":
      return errors.state_changed;
    default:
      return `${errors.generic} (${reason})`;
  }
}

export function CaseChat({ caseId, locale, onUseSummary }: CaseChatProps) {
  const { locale: uiLocale, messages } = useLocale();
  const copy = chatCopy[uiLocale];

  // Queries & Actions
  const chatData = useQuery(api.chat.listMine, { caseId });
  const capabilities = useQuery(api.chat.capabilities, {});
  const aiAllowed = Boolean(capabilities?.configured && capabilities.locales.includes(locale));
  const documents = useQuery(api.caseDocuments.listMine, { caseId });
  const sendChat = useAction(api.chat.send);
  const uploadDoc = useAction(api.caseDocuments.upload);
  const removeDoc = useMutation(api.caseDocuments.remove);

  // Form states
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<
    Set<Id<"caseDocuments">>
  >(new Set());

  // In-flight & synchronous send guard
  const isSendingRef = useRef(false);
  const [isSending, setIsSending] = useState(false);

  // Held send payload for network retry idempotency
  const [heldRetry, setHeldRetry] = useState<ActiveSendPayload | null>(null);
  const heldRetryRef = useRef<ActiveSendPayload | null>(null);
  heldRetryRef.current = heldRetry;

  // Reset consent on contextKey change (do not lose in-flight payload)
  const priorContextKeyRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (
      chatData?.contextKey &&
      priorContextKeyRef.current !== undefined &&
      chatData.contextKey !== priorContextKeyRef.current
    ) {
      setConsent(false);
    }
    priorContextKeyRef.current = chatData?.contextKey;
  }, [chatData?.contextKey]);

  // Upload & removal states
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [removingDocId, setRemovingDocId] = useState<Id<"caseDocuments"> | null>(
    null,
  );
  const [sendError, setSendError] = useState<string | null>(null);
  useEffect(() => {
    if (!documents || isSendingRef.current) return;
    const available = new Set(documents.map(document => document._id));
    if ([...selectedDocIds].some(id => !available.has(id))) {
      setSelectedDocIds(new Set([...selectedDocIds].filter(id => available.has(id))));
      setConsent(false);
      setHeldRetry(null);
    }
  }, [documents, isSending]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusId = useId();

  // Documents map for historical turns
  const docMap = new Map<string, string>();
  if (documents) {
    for (const doc of documents) {
      docMap.set(doc._id, doc.fileName);
    }
  }

  // Calculate selected documents combined size
  const selectedDocsList = (documents ?? []).filter((doc) =>
    selectedDocIds.has(doc._id),
  );
  const totalSelectedBytes = selectedDocsList.reduce(
    (acc, doc) => acc + doc.size,
    0,
  );

  // Handlers for input modifications (reset consent and invalidates held retry if modified)
  const handleMessageChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(e.target.value);
      setConsent(false);
      setSendError(null);
      if (heldRetryRef.current) {
        setHeldRetry(null);
        heldRetryRef.current = null;
      }
    },
    [],
  );

  function prepareFailedMessage(turn: ChatHistoryProps["turns"][number]) {
    if (isSendingRef.current || uploading || removingDocId || message.trim()) return;
    setMessage(turn.text);
    setSelectedDocIds(new Set(turn.documentIds.filter(id => docMap.has(id))));
    setConsent(false);
    setSendError(null);
    setHeldRetry(null);
    heldRetryRef.current = null;
    document.getElementById("case-chat-message-input")?.focus();
  }

  const toggleDocSelection = useCallback(
    (docId: Id<"caseDocuments">) => {
      setSelectedDocIds((prev) => {
        const next = new Set(prev);
        if (next.has(docId)) {
          next.delete(docId);
        } else {
          if (next.size >= CHAT_LIMITS.attachments) {
            setSendError(copy.errors.maxAttachmentsSelected);
            return prev;
          }
          next.add(docId);
        }
        return next;
      });
      setConsent(false);
      setSendError(null);
      if (heldRetryRef.current) {
        setHeldRetry(null);
        heldRetryRef.current = null;
      }
    },
    [copy.errors.maxAttachmentsSelected],
  );

  // Upload handler
  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isSendingRef.current || isSending) {
      setUploadError(copy.errors.sendBusy);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if ((documents?.length ?? 0) >= CHAT_LIMITS.documentsPerCase) {
      setUploadError(copy.errors.maxFilesReached);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const contentType = resolveContentType(file);
    if (!contentType) {
      setUploadError(copy.errors.invalidFileType);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size === 0 || file.size > CHAT_LIMITS.documentBytes) {
      setUploadError(copy.errors.fileTooLarge);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const content = await file.arrayBuffer();
      const newDocId = await uploadDoc({
        caseId,
        content,
        contentType,
        fileName: file.name.slice(0, 150),
      });

      // Uploaded file is selected by default; resets consent
      setSelectedDocIds((prev) => {
        const next = new Set(prev);
        if (next.size < CHAT_LIMITS.attachments) {
          next.add(newDocId);
        }
        return next;
      });
      setConsent(false);
      if (heldRetryRef.current) {
        setHeldRetry(null);
        heldRetryRef.current = null;
      }
    } catch (err) {
      setUploadError(errorMessage(err) || copy.errors.uploadFailed);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Remove document handler
  async function handleRemoveDoc(docId: Id<"caseDocuments">) {
    if (isSendingRef.current || isSending) {
      setUploadError(copy.errors.sendBusy);
      return;
    }

    setRemovingDocId(docId);
    setUploadError(null);

    try {
      await removeDoc({ documentId: docId });
      setSelectedDocIds((prev) => {
        if (!prev.has(docId)) return prev;
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
      setConsent(false);
      if (heldRetryRef.current) {
        setHeldRetry(null);
        heldRetryRef.current = null;
      }
    } catch (err) {
      setUploadError(errorMessage(err) || copy.errors.removeFailed);
    } finally {
      setRemovingDocId(null);
    }
  }

  // Check state blockers
  const isLoaded = chatData !== undefined && documents !== undefined;
  const turnsLimitReached = Boolean(chatData?.limitReached);
  const hasPersistedPending = Boolean(
    chatData?.turns.some((t) => t.result.kind === "pending"),
  );

  // Send message or retry handler
  async function handleSubmit(e?: FormEvent) {
    if (e) e.preventDefault();

    // Block submit until chatData + documents loaded
    if (!isLoaded || !aiAllowed) return;
    if (uploading || removingDocId) return;
    if (!consent) {
      setSendError(copy.errors.consentRequired);
      return;
    }

    // Block local double submit synchronously via ref
    if (isSendingRef.current) {
      setSendError(copy.errors.doubleSubmitPrevented);
      return;
    }

    if (turnsLimitReached) {
      setSendError(copy.turnsLimitReached);
      return;
    }

    // Determine payload: retry existing held send or assemble new send
    let payload: ActiveSendPayload;
    const isRetry = Boolean(
      heldRetryRef.current &&
        heldRetryRef.current.message === message.trim() &&
        heldRetryRef.current.documentIds.length === selectedDocIds.size &&
        heldRetryRef.current.documentIds.every((id) => selectedDocIds.has(id)),
    );

    // Block when ANY persisted result.kind pending (unless replay heldRetry)
    if (hasPersistedPending && !isRetry) {
      setSendError(copy.errors.in_progress);
      return;
    }

    if (isRetry && heldRetryRef.current) {
      // Reusing identical idempotency requestId for retry
      payload = heldRetryRef.current;
    } else {
      const trimmed = message.trim();
      if (!trimmed) {
        setSendError(copy.errors.emptyMessage);
        return;
      }

      if (selectedDocIds.size > CHAT_LIMITS.attachments) {
        setSendError(copy.errors.maxAttachmentsSelected);
        return;
      }

      if (totalSelectedBytes > CHAT_LIMITS.attachmentBytes) {
        setSendError(copy.errors.attachmentsTooLarge);
        return;
      }

      if (!chatData.contextKey) {
        setSendError(copy.errors.generic);
        return;
      }

      payload = {
        requestId: crypto.randomUUID(),
        message: trimmed,
        documentIds: Array.from(selectedDocIds),
        contextKey: chatData.contextKey,
      };
      setHeldRetry(payload);
      heldRetryRef.current = payload;
    }

    // Synchronous lock
    isSendingRef.current = true;
    setIsSending(true);
    setSendError(null);

    try {
      const result = await sendChat({
        caseId,
        message: payload.message,
        documentIds: payload.documentIds,
        requestId: payload.requestId,
        consent: true,
        contextKey: payload.contextKey,
      });

      if (result.kind === "available") {
        // Clear message, selections, consent, and held retry ONLY on available
        setMessage("");
        setSelectedDocIds(new Set());
        setConsent(false);
        setHeldRetry(null);
        heldRetryRef.current = null;
      } else {
        // Acknowledged unavailable:
        const reasonMsg = getReasonMessage(result.reason, copy.errors);
        setSendError(reasonMsg);

        if (result.reason === "in_progress") {
          // Keep heldRetry so retry can poll or retry identical in-flight request
        } else {
          // On acknowledged unavailable except in_progress, clear heldRetry so next consented Send creates NEW requestId
          setHeldRetry(null);
          heldRetryRef.current = null;
        }
      }
    } catch (err) {
      if (err instanceof ConvexError) {
        setHeldRetry(null);
        heldRetryRef.current = null;
        setConsent(false);
      }
      // A lost network acknowledgement can replay the exact request safely.
      setSendError(errorMessage(err) || copy.errors.generic);
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  }

  const isRetryAvailable = Boolean(heldRetry);
  const submitDisabled =
    !aiAllowed ||
    !isLoaded ||
    isSending ||
    uploading ||
    Boolean(removingDocId) ||
    !message.trim() ||
    !consent ||
    (hasPersistedPending && !isRetryAvailable);

  return (
    <section className="case-chat-container" aria-labelledby="case-chat-heading">
      <div className="case-chat-header">
        <div>
          <h2 id="case-chat-heading">{copy.title}</h2>
          <p className="muted case-chat-description">{copy.description}</p>
        </div>
      </div>

      <div className="case-chat-disclosure-banner">
        <p className="small-text">{copy.intakeDisclosure}</p>
        {!aiAllowed && <p role="status">{capabilities === undefined ? messages.common.loading : messages.failure.aiUnavailable}</p>}
      </div>

      {/* Persistent History */}
      <div className="case-chat-history-section">
        <h3 className="sr-only">{copy.historyTitle}</h3>
        {chatData === undefined ? (
          <p className="loading" role="status">
            {copy.loadingTurns}
          </p>
        ) : (
          <ChatHistory
            turns={chatData.turns}
            docMap={docMap}
            locale={locale}
            uiLocale={uiLocale}
            uiCopy={copy}
            onRetry={prepareFailedMessage}
            onUseSummary={onUseSummary}
            retryDisabled={!isLoaded || isSending || uploading || Boolean(removingDocId) || hasPersistedPending || turnsLimitReached || Boolean(message.trim())}
          />
        )}
      </div>

      {/* Case Documents Management */}
      <div className="case-chat-documents-section">
        <div className="case-chat-documents-header">
          <div>
            <h3>{copy.documentsTitle}</h3>
            <p className="muted small-text">{copy.documentsGuidance}</p>
          </div>
          <div className="case-chat-doc-meta">
            <span className="badge neutral">
              {copy.documentCount(
                documents?.length ?? 0,
                CHAT_LIMITS.documentsPerCase,
              )}
            </span>
          </div>
        </div>

        {uploadError && (
          <div className="status-message error" role="alert">
            <p>{uploadError}</p>
          </div>
        )}

        <div className="case-chat-doc-upload-bar">
          <input
            ref={fileInputRef}
            type="file"
            id="case-doc-upload-input"
            className="sr-only"
            accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
            disabled={
              !isLoaded ||
              uploading ||
              isSending ||
              (documents?.length ?? 0) >= CHAT_LIMITS.documentsPerCase
            }
            onChange={(e) => void handleFileUpload(e)}
          />
          <Button
            type="button"
            className="btn secondary small"
            disabled={
              !isLoaded ||
              uploading ||
              isSending ||
              (documents?.length ?? 0) >= CHAT_LIMITS.documentsPerCase
            }
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={15} />
            {uploading ? copy.uploading : copy.uploadButton}
          </Button>

          {selectedDocIds.size > 0 && (
            <span className="case-chat-selected-badge">
              <CheckCircle2 size={14} />
              {copy.selectedAttachmentsCount(
                selectedDocIds.size,
                CHAT_LIMITS.attachments,
                formatBytes(totalSelectedBytes),
                formatBytes(CHAT_LIMITS.attachmentBytes),
              )}
            </span>
          )}
        </div>

        {documents === undefined ? (
          <p className="loading" role="status">
            {copy.loadingDocuments}
          </p>
        ) : documents.length === 0 ? (
          <p className="muted small-text case-chat-empty-docs">
            {copy.noDocuments}
          </p>
        ) : (
          <ul className="case-chat-doc-list" aria-label={copy.documentsTitle}>
            {documents.map((doc) => {
              const isSelected = selectedDocIds.has(doc._id);
              const isRemoving = removingDocId === doc._id;
              const isImage = doc.contentType.startsWith("image/");
              const checkboxId = `include-doc-${doc._id}`;

              return (
                <li key={doc._id} className="case-chat-doc-item">
                  <div className="case-chat-doc-select-line">
                    <input
                      type="checkbox"
                      id={checkboxId}
                      checked={isSelected}
                      disabled={!isLoaded || isSending || isRemoving}
                      onChange={() => toggleDocSelection(doc._id)}
                      aria-label={copy.selectCheckboxLabel(doc.fileName)}
                    />
                    <label
                      htmlFor={checkboxId}
                      className="case-chat-doc-label"
                    >
                      {isImage ? (
                        <ImageIcon size={16} className="doc-icon" />
                      ) : (
                        <FileText size={16} className="doc-icon" />
                      )}
                      <span className="doc-name">{doc.fileName}</span>
                      <span className="doc-size">({formatBytes(doc.size)})</span>
                    </label>
                  </div>
                  <Button
                    type="button"
                    className="btn secondary small doc-remove-btn"
                    disabled={!isLoaded || isSending || isRemoving}
                    onClick={() => void handleRemoveDoc(doc._id)}
                    aria-label={`${copy.removeButton} ${doc.fileName}`}
                  >
                    <Trash2 size={13} />
                    {isRemoving ? copy.removing : copy.removeButton}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Message Composer & Send Form */}
      {turnsLimitReached ? (
        <div className="status-message" role="status">
          <p>
            <strong>{copy.turnsLimitReached}</strong>
          </p>
        </div>
      ) : (
        <form
          className="case-chat-form"
          onSubmit={(e) => void handleSubmit(e)}
          noValidate
        >
          <div className="field">
            <div className="case-chat-field-header">
              <Label htmlFor="case-chat-message-input">
                {copy.messageLabel}
              </Label>
              <small
                className="case-chat-char-counter"
                aria-live="polite"
              >
                {copy.charCount(message.length, CHAT_LIMITS.messageChars)}
              </small>
            </div>
            <Textarea
              id="case-chat-message-input"
              value={message}
              onChange={handleMessageChange}
              placeholder={copy.messagePlaceholder}
              maxLength={CHAT_LIMITS.messageChars}
              disabled={!isLoaded || isSending}
              rows={4}
              required
            />
          </div>

          <div className="case-chat-consent-row">
            <Label className="checkbox-line">
              <Input
                type="checkbox"
                checked={consent}
                disabled={!isLoaded || isSending}
                onChange={(e) => {
                  setConsent(e.target.checked);
                  setSendError(null);
                }}
              />
              <span>{copy.consentLabel}</span>
            </Label>
          </div>

          {sendError && (
            <div className="status-message error" role="alert">
              <p>
                <AlertCircle size={15} className="inline-icon" /> {sendError}
              </p>
            </div>
          )}

          <div className="case-chat-actions-row">
            {isRetryAvailable ? (
              <Button
                type="button"
                className="btn secondary"
                disabled={!aiAllowed || !isLoaded || isSending || uploading || Boolean(removingDocId) || !consent}
                onClick={() => void handleSubmit()}
              >
                <RotateCw size={15} />
                {isSending ? copy.sending : copy.retryButton}
              </Button>
            ) : null}

            <Button
              type="submit"
              className="btn"
              disabled={submitDisabled}
              aria-describedby={statusId}
            >
              <Send size={15} />
              {isSending ? copy.sending : copy.sendButton}
            </Button>

            {isSending && (
              <span id={statusId} role="status" className="muted small-text">
                {copy.sending}
              </span>
            )}
          </div>
        </form>
      )}
    </section>
  );
}

export interface ChatHistoryProps {
  turns: Array<{
    _id: Id<"chatTurns">;
    text: string;
    createdAt: number;
    documentIds: Id<"caseDocuments">[];
    result:
      | { kind: "pending" }
      | { kind: "reply"; text: string }
      | { kind: "unavailable"; reason: string };
  }>;
  docMap: Map<string, string>;
  locale: PilotLocale;
  uiLocale: PilotLocale;
  uiCopy: ChatCopy;
  onRetry?: (turn: ChatHistoryProps["turns"][number]) => void;
  retryDisabled?: boolean;
  onUseSummary?: (text: string) => void;
}

export function ChatHistory({
  turns,
  docMap,
  locale,
  uiLocale,
  uiCopy,
  onRetry,
  retryDisabled,
  onUseSummary,
}: ChatHistoryProps) {
  if (turns.length === 0) {
    return (
      <div className="case-chat-empty-history">
        <p className="muted">{uiCopy.noTurns}</p>
      </div>
    );
  }

  const timeLocale =
    uiLocale === "hi" ? "hi-IN" : uiLocale === "pa" ? "pa-IN" : "en-IN";

  return (
    <div className="case-chat-turns-list" role="log" aria-live="polite" aria-relevant="additions text" aria-atomic="false">
      {turns.map((turn) => {
        return (
          <article key={turn._id} className="case-chat-turn-group">
            {/* User Message */}
            <div className="case-chat-bubble user">
              <div className="case-chat-turn-header">
                <span className="case-chat-sender-name">
                  {uiCopy.youLabel}
                </span>
                <time
                  className="case-chat-timestamp"
                  dateTime={new Date(turn.createdAt).toISOString()}
                >
                  {formatTime(turn.createdAt, timeLocale)}
                </time>
              </div>

              <div className="case-chat-turn-text">{turn.text}</div>

              {turn.documentIds && turn.documentIds.length > 0 && (
                <div
                  className="case-chat-turn-attachments"
                  aria-label={uiCopy.documentsTitle}
                >
                  {turn.documentIds.map((docId) => {
                    const name = docMap.get(docId) ?? uiCopy.removedAttachment;
                    const isRemoved = !docMap.has(docId);
                    return (
                      <span
                        key={docId}
                        className={`case-chat-attachment-pill ${isRemoved ? "removed" : ""}`}
                      >
                        <Paperclip size={12} />
                        <span className="attachment-filename">{name}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Assistant Result / Pending / Unavailable */}
            {turn.result.kind === "reply" && (
              <div className="case-chat-bubble assistant">
                <div className="case-chat-turn-header">
                  <span className="case-chat-sender-name">
                    {uiCopy.assistantLabel}
                  </span>
                </div>

                <div className="case-chat-turn-text">{turn.result.text}</div>
                {onUseSummary && <Button type="button" className="btn secondary small" onClick={() => onUseSummary(`${turn.text}\n\n${turn.result.kind === "reply" ? turn.result.text : ""}`)}>{getFeatureCopy(uiLocale).summaryUse}</Button>}

                <div className="case-chat-disclaimer">
                  <p className="small-text">{uiCopy.disclaimer}</p>
                </div>

                <div className="case-chat-read-aloud">
                  <ReadAloud text={turn.result.text} locale={locale} />
                </div>
              </div>
            )}

            {turn.result.kind === "pending" && (
              <div className="case-chat-bubble pending">
                <p className="muted small-text case-chat-pending-text">
                  <RotateCw size={14} className="spin-icon" />
                  {uiCopy.pendingStatus}
                </p>
              </div>
            )}

            {turn.result.kind === "unavailable" && (
              <div className="case-chat-bubble unavailable" role="alert">
                <div className="case-chat-turn-header">
                  <span className="case-chat-sender-name">
                    {uiCopy.assistantLabel}
                  </span>
                  <Badge variant="destructive" className="badge-alert">
                    Unavailable
                  </Badge>
                </div>
                <p className="case-chat-unavailable-reason">
                  <AlertCircle size={15} />
                  {getReasonMessage(turn.result.reason, uiCopy.errors)}
                </p>
                {onRetry && ["timeout", "provider_failed", "rate_limited", "truncated", "malformed", "response_too_large", "state_changed"].includes(turn.result.reason) && (
                  <Button type="button" className="btn secondary" disabled={retryDisabled} onClick={() => onRetry(turn)}>
                    {uiCopy.restoreMessage}
                  </Button>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
