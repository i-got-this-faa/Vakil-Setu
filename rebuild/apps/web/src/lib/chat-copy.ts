import { localizedChatCopy } from "./localization";
import type { PilotLocale } from "@vakil/domain";

export interface ChatCopy {
  title: string;
  description: string;
  intakeDisclosure: string;
  disclaimer: string;
  turnsLimitReached: string;
  loadingTurns: string;
  loadingDocuments: string;
  noTurns: string;
  youLabel: string;
  assistantLabel: string;
  pendingStatus: string;
  readAloudLabel: string;
  removedAttachment: string;
  historyTitle: string;

  // Documents
  documentsTitle: string;
  documentsGuidance: string;
  uploadButton: string;
  uploading: string;
  removeButton: string;
  removing: string;
  noDocuments: string;
  selectCheckboxLabel: (fileName: string) => string;
  documentCount: (current: number, max: number) => string;
  selectedAttachmentsCount: (
    current: number,
    max: number,
    currentBytes: string,
    maxBytes: string,
  ) => string;

  // Form / Send
  messageLabel: string;
  messagePlaceholder: string;
  charCount: (current: number, max: number) => string;
  consentLabel: string;
  sendButton: string;
  sending: string;
  retryButton: string;
  restoreMessage: string;

  // Errors / validation
  errors: {
    emptyMessage: string;
    consentRequired: string;
    sendBusy: string;
    doubleSubmitPrevented: string;
    maxFilesReached: string;
    fileTooLarge: string;
    invalidFileType: string;
    uploadFailed: string;
    removeFailed: string;
    maxAttachmentsSelected: string;
    attachmentsTooLarge: string;
    timeout: string;
    in_progress: string;
    rate_limited: string;
    limit_exceeded: string;
    provider_failed: string;
    response_too_large: string;
    truncated: string;
    blocked: string;
    malformed: string;
    state_changed: string;
    generic: string;
  };
}

export const chatCopy: Record<PilotLocale, ChatCopy> = localizedChatCopy;
