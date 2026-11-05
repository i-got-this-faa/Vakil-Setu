import type { PilotLocale } from "@vakil/domain";
import { localizedFeatureCopy } from "./localization";

export const featureEnglish = {
  compare: "Compare advocates", compareHint: "Select up to three approved advocates to compare public information.",
  compareSelect: "Select for comparison", selected: "Selected", remove: "Remove", clear: "Clear selection",
  expertise: "Practice areas", languages: "Languages", location: "Location", modes: "Consultation modes",
  availability: "Requestable availability", unavailable: "Profile unavailable or awaiting approval", noSlots: "No requestable slots",
  rating: "Consultation feedback", noReviews: "No reviews yet", ratingCaveat: "Feedback describes individual experiences. Ratings are not proof of legal competence or a guaranteed outcome.",
  reviewHeading: "Review your completed consultation", reviewText: "Public review text", selectRating: "Rating (1 to 5)",
  publicNotice: "Your rating and review text may be public after moderation. Do not include names, case facts, documents, contact details or other confidential information.",
  publicConsent: "I understand this review is public and have removed confidential case information.",
  submit: "Submit for moderation", edit: "Edit review", withdraw: "Withdraw review", report: "Report abuse", reason: "Reason",
  save: "Save", saving: "Saving…", saved: "Saved. Your review awaits moderation.", reported: "Report recorded for administrator review.",
  pending: "Awaiting moderation", published: "Published", hidden: "Hidden by moderation", withdrawn: "Withdrawn",
  moderation: "Client review moderation", publish: "Publish review", hide: "Hide review", audit: "Moderation audit trail",
  verified: "Verified completed consultation", noEligible: "Reviews are available after your consultation is completed.",
  summaryUse: "Use in my summary", summaryReview: "Conversation text is a draft. Check every fact before saving or sharing your summary.",
  reportHint: "Explain the abuse without repeating confidential case information.", loading: "Loading…", allLanguages: "All languages",
  noPublicReviews: "No published feedback for this advocate yet.", reviewStatus: "Review status", savedChange: "Change saved.",
};
export type FeatureCopy = typeof featureEnglish;
// Draft translation bundles are supplied alongside the broader interface localization.
export function getFeatureCopy(locale: PilotLocale): FeatureCopy { return localizedFeatureCopy[locale]; }
