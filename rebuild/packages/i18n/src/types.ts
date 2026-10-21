/**
 * @vakil/i18n - Type definitions
 * Platform-independent, strictly-typed internationalization models
 * for English and the 22 Eighth Schedule languages of India.
 */

/**
 * Truthful capability status labels:
 * - supported: implemented across the interface, independently language-reviewed, acceptance-tested, and active in the current deployment.
 * - available: runtime-level baseline ready (e.g. Unicode text input accepted across all scripts).
 * - unverified: implemented or provisional without a complete language-specific acceptance record (e.g. interface review, AI, or speech).
 * - unavailable: deferred or out-of-scope for the current pilot release.
 */
export type CapabilityStatus = 'supported' | 'available' | 'unverified' | 'unavailable';

export interface LanguageCapabilities {
  /** Localized UI strings for buttons, forms, headings, and system messages. */
  readonly interface: CapabilityStatus;
  /** Full Unicode UTF-8 text entry in input forms, intake fields, and search queries. */
  readonly typedInput: CapabilityStatus;
  /** Legal problem classification and draft intake summarization via AI. */
  readonly aiTriage: CapabilityStatus;
  /** Provider configuration is supplied separately; a bundle is not AI evidence. */
  readonly aiInput: CapabilityStatus;
  readonly aiOutput: CapabilityStatus;
  /** Speech-to-text audio dictation for spoken intake queries. */
  readonly speechInput: CapabilityStatus;
  /** Text-to-speech audio synthesis for spoken playback of summaries and instructions. */
  readonly speechPlayback: CapabilityStatus;
}

/** The 22 Scheduled Indian Languages under Eighth Schedule of the Indian Constitution */
export type ScheduledLanguageCode =
  | 'as-IN' // Assamese
  | 'bn-IN' // Bengali
  | 'brx-IN' // Bodo
  | 'doi-IN' // Dogri
  | 'gu-IN' // Gujarati
  | 'hi-IN' // Hindi
  | 'kn-IN' // Kannada
  | 'ks-IN' // Kashmiri
  | 'kok-IN' // Konkani
  | 'mai-IN' // Maithili
  | 'ml-IN' // Malayalam
  | 'mni-IN' // Manipuri (Meitei)
  | 'mr-IN' // Marathi
  | 'ne-IN' // Nepali
  | 'or-IN' // Odia
  | 'pa-IN' // Punjabi
  | 'sa-IN' // Sanskrit
  | 'sat-IN' // Santali
  | 'sd-IN' // Sindhi
  | 'ta-IN' // Tamil
  | 'te-IN' // Telugu
  | 'ur-IN'; // Urdu

export type EnglishLanguageCode = 'en-IN';

export type SupportedLocaleCode = EnglishLanguageCode | ScheduledLanguageCode;

/** Compatibility name: registered choices, independent of interface translation availability. */
export const pilotLocales = ['en-IN', 'as-IN', 'bn-IN', 'brx-IN', 'doi-IN', 'gu-IN', 'hi-IN', 'kn-IN', 'ks-IN', 'kok-IN', 'mai-IN', 'ml-IN', 'mni-IN', 'mr-IN', 'ne-IN', 'or-IN', 'pa-IN', 'sa-IN', 'sat-IN', 'sd-IN', 'ta-IN', 'te-IN', 'ur-IN'] as const;
export type PilotLocale = (typeof pilotLocales)[number];
export type Locale = SupportedLocaleCode extends `${infer Code}-IN` ? Code : never;

export type TextDirection = 'ltr' | 'rtl';

export interface LanguageDefinition {
  readonly code: SupportedLocaleCode;
  readonly shortCode: Locale;
  /** Script-specific document/speech tag; stored registry codes stay unchanged. */
  readonly languageTag: string;
  readonly aliases: readonly string[];
  readonly name: string;
  readonly nativeName: string;
  readonly script: string;
  readonly direction: TextDirection;
  readonly isPilot: boolean;
  readonly capabilities: LanguageCapabilities;
  readonly notes: string;
}

export interface NavigationMessages {
  readonly brandName: string;
  readonly home: string;
  readonly findAdvocate: string;
  readonly intake: string;
  readonly dashboard: string;
  readonly consultations: string;
  readonly profile: string;
  readonly admin: string;
  readonly signIn: string;
  readonly signOut: string;
  readonly selectLanguage: string;
  readonly switchLanguage: string;
  readonly skipToContent: string;
}

export interface CommonMessages {
  readonly save: string;
  readonly cancel: string;
  readonly confirm: string;
  readonly back: string;
  readonly next: string;
  readonly submit: string;
  readonly loading: string;
  readonly error: string;
  readonly success: string;
  readonly retry: string;
  readonly close: string;
  readonly search: string;
  readonly filter: string;
  readonly clear: string;
  readonly view: string;
  readonly edit: string;
  readonly delete: string;
  readonly status: string;
  readonly required: string;
  readonly optional: string;
  readonly notAvailable: string;
  readonly actions: string;
}

export interface IntakeMessages {
  readonly title: string;
  readonly subtitle: string;
  readonly categoryLabel: string;
  readonly categoryPlaceholder: string;
  readonly issueSummaryLabel: string;
  readonly issueSummaryPlaceholder: string;
  readonly detailedDescriptionLabel: string;
  readonly detailedDescriptionPlaceholder: string;
  readonly preferredLanguageLabel: string;
  readonly urgencyLabel: string;
  readonly urgencyNormal: string;
  readonly urgencyHigh: string;
  readonly audioRecordButton: string;
  readonly audioStopButton: string;
  readonly audioRecordingLabel: string;
  readonly disclaimer: string;
  readonly confidentialNotice: string;
  readonly submitButton: string;
  readonly submitting: string;
  readonly successTitle: string;
  readonly successMessage: string;
  readonly reviewNotice: string;
}

export interface DiscoveryMessages {
  readonly title: string;
  readonly subtitle: string;
  readonly searchPlaceholder: string;
  readonly practiceAreaFilter: string;
  readonly languageFilter: string;
  readonly experienceFilter: string;
  readonly locationFilter: string;
  readonly noResultsFound: string;
  readonly approvedAdvocate: string;
  readonly yearsExperience: string;
  readonly viewProfile: string;
  readonly bookSlot: string;
  readonly filterButton: string;
  readonly resetFilters: string;
}

export interface BookingMessages {
  readonly requestTitle: string;
  readonly selectDateLabel: string;
  readonly selectTimeSlotLabel: string;
  readonly noSlotsAvailable: string;
  readonly consultationTypeLabel: string;
  readonly confirmRequestButton: string;
  readonly statusPending: string;
  readonly statusConfirmed: string;
  readonly statusDeclined: string;
  readonly statusCancelled: string;
  readonly statusExpired: string;
  readonly advocateAccepted: string;
  readonly reasonForCancellation: string;
  readonly cancelBookingButton: string;
  readonly bookingIdLabel: string;
  readonly consultationTimeLabel: string;
  readonly statusBadgeLabel: string;
}

export interface DashboardMessages {
  readonly welcome: string;
  readonly roleCitizen: string;
  readonly roleAdvocate: string;
  readonly roleAdmin: string;
  readonly upcomingTitle: string;
  readonly pendingRequestsTitle: string;
  readonly pastConsultationsTitle: string;
  readonly noConsultations: string;
  readonly actionRequired: string;
  readonly viewAll: string;
}

export interface ProfileMessages {
  readonly title: string;
  readonly personalInfoTab: string;
  readonly fullNameLabel: string;
  readonly emailLabel: string;
  readonly phoneLabel: string;
  readonly barCouncilNumberLabel: string;
  readonly practiceAreasLabel: string;
  readonly experienceYearsLabel: string;
  readonly bioLabel: string;
  readonly languagesSpokenLabel: string;
  readonly credentialStatusLabel: string;
  readonly statusPendingReview: string;
  readonly statusApproved: string;
  readonly statusRejected: string;
  readonly saveChangesButton: string;
  readonly savedSuccessfully: string;
}

export interface AdminMessages {
  readonly title: string;
  readonly pendingApprovalsTab: string;
  readonly advocateNameHeader: string;
  readonly barNumberHeader: string;
  readonly submittedDateHeader: string;
  readonly actionsHeader: string;
  readonly reviewCredentialsButton: string;
  readonly approveButton: string;
  readonly rejectButton: string;
  readonly approvalReasonLabel: string;
  readonly rejectionReasonLabel: string;
  readonly confirmApprovalTitle: string;
  readonly confirmRejectionTitle: string;
  readonly noPendingApprovals: string;
  readonly auditLogTitle: string;
}

export interface FailureMessages {
  readonly genericError: string;
  readonly networkError: string;
  readonly unauthorized: string;
  readonly forbidden: string;
  readonly notFound: string;
  readonly validationError: string;
  readonly serviceUnavailable: string;
  readonly aiUnavailable: string;
  readonly tryAgain: string;
  readonly contactSupport: string;
}

export interface VoiceMessages {
  readonly recordAudio: string;
  readonly recordingInProgress: string;
  readonly stopRecording: string;
  readonly playback: string;
  readonly permissionDenied: string;
  readonly speechNotVerifiedNotice: string;
  readonly microphoneRequired: string;
  readonly unsupportedBrowser: string;
}

export interface ConsentMessages {
  readonly termsTitle: string;
  readonly termsBody: string;
  readonly clientAdvocatePrivilege: string;
  readonly emergencyDisclaimer: string;
  readonly aiPreliminaryNotice: string;
  readonly agreeCheckbox: string;
  readonly requiredConsentWarning: string;
}

export interface CapabilityLabels {
  readonly supported: string;
  readonly available: string;
  readonly unverified: string;
  readonly unavailable: string;
  readonly truthfulNotice: string;
}

export interface Messages {
  readonly navigation: NavigationMessages;
  readonly common: CommonMessages;
  readonly intake: IntakeMessages;
  readonly discovery: DiscoveryMessages;
  readonly booking: BookingMessages;
  readonly dashboard: DashboardMessages;
  readonly profile: ProfileMessages;
  readonly admin: AdminMessages;
  readonly failure: FailureMessages;
  readonly voice: VoiceMessages;
  readonly consent: ConsentMessages;
  readonly capabilities: CapabilityLabels;
}
