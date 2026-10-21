import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { approvedAdvocate, fail, requireAccount } from "./access";

export const REVIEW_LIMITS = { text: 2000, reason: 1000, candidates: 500, reports: 100 } as const;
export const PUBLIC_CONSENT_TEXT = "I agree to publish this review after moderation. I confirm that it contains no confidential case details, names, contact information, or private documents, and understand that the text and rating will be public.";
export const reviewStatus = v.union(v.literal("pending"), v.literal("published"), v.literal("hidden"), v.literal("withdrawn"));
export const reviewSnapshot = v.object({ rating: v.number(), text: v.string(), status: reviewStatus, revision: v.number(), publicConsent: v.literal(true), consentVersion: v.literal("public-confidentiality-v1"), consentedAt: v.number() });
export const reviewAuditEvent = v.union(
  v.object({ kind: v.literal("created") }),
  v.object({ kind: v.literal("edited"), previousStatus: reviewStatus }),
  v.object({ kind: v.literal("withdrawn"), previousStatus: reviewStatus }),
  v.object({ kind: v.literal("reported"), reportId: v.id("reviewReports"), reason: v.string() }),
  v.object({ kind: v.literal("moderated"), decision: v.union(v.literal("publish"), v.literal("hide")), reason: v.string(), previousStatus: reviewStatus }),
);

export async function ownReviewBooking(ctx: QueryCtx | MutationCtx, bookingId: Id<"bookings">) {
  const account = await requireAccount(ctx, "user");
  const booking = await ctx.db.get(bookingId);
  if (!booking || booking.userId !== account._id) fail("NOT_FOUND", "Booking not found.");
  return { account, booking };
}

export function reviewForOwner(review: Doc<"reviews">) {
  return { _id: review._id, status: review.status, rating: review.rating, text: review.text, revision: review.revision, createdAt: review.createdAt, updatedAt: review.updatedAt };
}

export function snapshot(review: Doc<"reviews">) {
  const { rating, text, status, revision, publicConsent, consentVersion, consentedAt } = review;
  return { rating, text, status, revision, publicConsent, consentVersion, consentedAt };
}

export async function recordReviewAudit(ctx: MutationCtx, review: Doc<"reviews">, actorId: Id<"accounts">, event: Doc<"reviewAudits">["event"]) {
  // Audit rows are append-only; no endpoint patches or deletes them.
  await ctx.db.insert("reviewAudits", { reviewId: review._id, actorId, at: Date.now(), event, snapshot: snapshot(review) });
}

export async function completedReviewOwner(ctx: QueryCtx | MutationCtx, review: Doc<"reviews">, advocate: Doc<"advocates">) {
  const booking = await ctx.db.get(review.bookingId);
  if (!booking || booking.state !== "completed" || booking.userId !== review.ownerId || booking.advocateId !== advocate._id || review.advocateId !== advocate._id || booking.advocateAccountId !== advocate.accountId) return false;
  const owner = await ctx.db.get(review.ownerId);
  return !!owner && owner.role === "user" && !owner.disabled;
}

export async function isPublicReview(ctx: QueryCtx | MutationCtx, review: Doc<"reviews">) {
  if (review.status !== "published" || !review.publicConsent) return false;
  const advocate = await approvedAdvocate(ctx, review.advocateId);
  return !!advocate && await completedReviewOwner(ctx, review, advocate);
}

// Read current booking/account state every time; historical publication is not eligibility.
export async function eligiblePublishedReviews(ctx: QueryCtx, advocate: Doc<"advocates">) {
  const candidates = await ctx.db.query("reviews").withIndex("by_advocate", q => q.eq("advocateId", advocate._id)).order("desc").take(REVIEW_LIMITS.candidates + 1);
  if (candidates.length > REVIEW_LIMITS.candidates) fail("LIMIT_EXCEEDED", "Reviews exceed the pilot scan limit. Ask the operator to upgrade review aggregation.");
  const published = [];
  for (const review of candidates) {
    if (review.status === "published" && review.publicConsent && await completedReviewOwner(ctx, review, advocate)) published.push(review);
  }
  return published;
}

export function ratingFromReviews(reviews: Doc<"reviews">[]): { average: number | null; count: number } {
  return { average: reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null, count: reviews.length };
}

export async function publicRating(ctx: QueryCtx, advocate: Doc<"advocates">) {
  if (!(await approvedAdvocate(ctx, advocate._id))) return { average: null, count: 0 };
  return ratingFromReviews(await eligiblePublishedReviews(ctx, advocate));
}

// Like discovery, pagination describes live offsets over the bounded eligible cohort.
export function reviewOffset(cursor: string | null, advocateId: Id<"advocates">) {
  if (cursor === null) return 0;
  let value: unknown;
  try { value = JSON.parse(cursor); } catch { fail("INVALID_INPUT", "Invalid review cursor."); }
  if (typeof value !== "object" || value === null || !("offset" in value) || !("advocateId" in value) || value.advocateId !== advocateId || typeof value.offset !== "number" || !Number.isSafeInteger(value.offset) || value.offset < 0 || value.offset > REVIEW_LIMITS.candidates) fail("INVALID_INPUT", "Review cursor does not match this advocate.");
  return value.offset;
}
