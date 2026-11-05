import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { approvedAdvocate, fail, requireAccount } from "./lib/access";
import { boundedText, integer, page } from "./lib/input";
import { completedReviewOwner, eligiblePublishedReviews, isPublicReview, ownReviewBooking, PUBLIC_CONSENT_TEXT, ratingFromReviews, recordReviewAudit, REVIEW_LIMITS, reviewForOwner, reviewOffset } from "./lib/reviews";

export const forBooking = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const { booking } = await ownReviewBooking(ctx, args.bookingId);
    const review = await ctx.db.query("reviews").withIndex("by_booking", q => q.eq("bookingId", booking._id)).unique();
    return { eligibility: booking.state === "completed" ? { eligible: true, reason: null } : { eligible: false, reason: "booking_not_completed" }, review: review ? reviewForOwner(review) : null, publicConsentText: PUBLIC_CONSENT_TEXT };
  },
});

export const save = mutation({
  args: { bookingId: v.id("bookings"), rating: v.number(), text: v.string(), publicConsent: v.literal(true) },
  handler: async (ctx, args) => {
    const { account, booking } = await ownReviewBooking(ctx, args.bookingId);
    if (booking.state !== "completed") fail("CONFLICT", "Only completed consultations can be reviewed.");
    const rating = integer(args.rating, "Rating", 1, 5);
    const text = boundedText(args.text, "Review", REVIEW_LIMITS.text);
    const existing = await ctx.db.query("reviews").withIndex("by_booking", q => q.eq("bookingId", booking._id)).unique();
    const now = Date.now();
    const content = { rating, text, status: "pending", publicConsent: args.publicConsent, consentVersion: "public-confidentiality-v1", consentedAt: now, updatedAt: now, needsModeration: true } as const;
    const reviewId = existing ? existing._id : await ctx.db.insert("reviews", { ...content, bookingId: booking._id, advocateId: booking.advocateId, ownerId: account._id, revision: 1, createdAt: now });
    if (existing) await ctx.db.patch(reviewId, { ...content, revision: existing.revision + 1 });
    const saved = await ctx.db.get(reviewId);
    if (!saved) fail("NOT_FOUND", "Review not found.");
    await recordReviewAudit(ctx, saved, account._id, existing ? { kind: "edited", previousStatus: existing.status } : { kind: "created" });
    return reviewForOwner(saved);
  },
});

export const withdraw = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const { account, booking } = await ownReviewBooking(ctx, args.bookingId);
    const review = await ctx.db.query("reviews").withIndex("by_booking", q => q.eq("bookingId", booking._id)).unique();
    if (!review) fail("NOT_FOUND", "Review not found.");
    if (review.status === "withdrawn") return reviewForOwner(review);
    const changes = { status: "withdrawn", needsModeration: false, updatedAt: Date.now(), revision: review.revision + 1 } as const;
    await ctx.db.patch(review._id, changes);
    const withdrawn = { ...review, ...changes };
    await recordReviewAudit(ctx, withdrawn, account._id, { kind: "withdrawn", previousStatus: review.status });
    return reviewForOwner(withdrawn);
  },
});

export const report = mutation({
  args: { reviewId: v.id("reviews"), reason: v.string() },
  handler: async (ctx, args) => {
    const account = await requireAccount(ctx);
    const reason = boundedText(args.reason, "Report reason", REVIEW_LIMITS.reason);
    const review = await ctx.db.get(args.reviewId);
    if (!review || !(await isPublicReview(ctx, review))) fail("NOT_FOUND", "Public review not found.");
    const duplicate = await ctx.db.query("reviewReports").withIndex("by_review_reporter_revision", q => q.eq("reviewId", review._id).eq("reporterId", account._id).eq("revision", review.revision)).unique();
    if (duplicate) fail("CONFLICT", "You have already reported this review revision.");
    const reports = await ctx.db.query("reviewReports").withIndex("by_review", q => q.eq("reviewId", review._id)).take(REVIEW_LIMITS.reports + 1);
    if (reports.length >= REVIEW_LIMITS.reports) fail("LIMIT_EXCEEDED", "This review has reached the report limit and requires administrator handling.");
    const reportId = await ctx.db.insert("reviewReports", { reviewId: review._id, reporterId: account._id, reason, revision: review.revision, at: Date.now() });
    await ctx.db.patch(review._id, { needsModeration: true });
    await recordReviewAudit(ctx, review, account._id, { kind: "reported", reportId, reason });
    return { reported: true };
  },
});

export const publicForAdvocate = query({
  args: { advocateId: v.id("advocates"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const options = page(args.paginationOpts);
    const offset = reviewOffset(options.cursor, args.advocateId);
    const advocate = await approvedAdvocate(ctx, args.advocateId);
    const reviews = advocate ? await eligiblePublishedReviews(ctx, advocate) : [];
    const nextOffset = Math.min(offset + options.numItems, reviews.length);
    return {
      page: reviews.slice(offset, nextOffset).map(({ _id, rating, text, createdAt, updatedAt }) => ({ _id, rating, text, createdAt, updatedAt, label: "Verified consultation" })),
      isDone: nextOffset >= reviews.length,
      continueCursor: JSON.stringify({ advocateId: args.advocateId, offset: nextOffset }),
      rating: ratingFromReviews(reviews),
    };
  },
});

export const adminQueue = query({
  args: { paginationOpts: paginationOptsValidator, includeResolved: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireAccount(ctx, "admin");
    const reviews = args.includeResolved ? ctx.db.query("reviews") : ctx.db.query("reviews").withIndex("by_queue", q => q.eq("needsModeration", true));
    const result = await reviews.order("desc").paginate(page(args.paginationOpts));
    return { ...result, page: await Promise.all(result.page.map(async review => {
      const reports = await ctx.db.query("reviewReports").withIndex("by_review", q => q.eq("reviewId", review._id)).take(REVIEW_LIMITS.reports + 1);
      if (reports.length > REVIEW_LIMITS.reports) fail("LIMIT_EXCEEDED", "Review reports exceed the moderation scan limit.");
      return { ...reviewForOwner(review), advocateId: review.advocateId, reportCount: reports.length, reports: reports.map(({ _id, reason, revision, at }) => ({ _id, reason, revision, at })) };
    })) };
  },
});

export const moderate = mutation({
  args: { reviewId: v.id("reviews"), expectedRevision: v.number(), expectedReportCount: v.number(), decision: v.union(v.literal("publish"), v.literal("hide")), reason: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAccount(ctx, "admin");
    const reason = boundedText(args.reason, "Moderation reason", REVIEW_LIMITS.reason);
    const review = await ctx.db.get(args.reviewId);
    if (!review) fail("NOT_FOUND", "Review not found.");
    if (review.revision !== integer(args.expectedRevision, "Review revision", 1, Number.MAX_SAFE_INTEGER)) fail("CONFLICT", "Review changed since moderation began. Reload and review the current text.");
    const reports = await ctx.db.query("reviewReports").withIndex("by_review", q => q.eq("reviewId", review._id)).take(REVIEW_LIMITS.reports + 1);
    if (reports.length !== integer(args.expectedReportCount, "Report count", 0, REVIEW_LIMITS.reports)) fail("CONFLICT", "New reports arrived. Reload and review them before moderating.");
    if (review.status === "withdrawn") fail("CONFLICT", "A withdrawn review cannot be moderated. Its author must resubmit it.");
    if (args.decision === "publish") {
      const advocate = await approvedAdvocate(ctx, review.advocateId);
      if (!advocate || !review.publicConsent || !(await completedReviewOwner(ctx, review, advocate))) fail("NOT_APPROVED", "Only eligible reviews of active approved advocates can be published.");
    }
    const changes = { status: args.decision === "publish" ? "published" : "hidden", needsModeration: false, updatedAt: Date.now(), revision: review.revision + 1 } as const;
    await ctx.db.patch(review._id, changes);
    const moderated = { ...review, ...changes };
    await recordReviewAudit(ctx, moderated, admin._id, { kind: "moderated", decision: args.decision, reason, previousStatus: review.status });
    return reviewForOwner(moderated);
  },
});

export const audit = query({
  args: { reviewId: v.id("reviews"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireAccount(ctx, "admin");
    return await ctx.db.query("reviewAudits").withIndex("by_review", q => q.eq("reviewId", args.reviewId)).order("asc").paginate(page(args.paginationOpts));
  },
});
