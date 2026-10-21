import { convexTest } from "convex-test";
import { makeFunctionReference, type ApiFromModules } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import type * as reviewFunctions from "../convex/reviews";
import { PUBLIC_CONSENT_TEXT, REVIEW_LIMITS } from "../convex/lib/reviews";
import schema from "../convex/schema";

// Derive references without editing generated files owned by the integrating parent.
const reviews: ApiFromModules<{ reviews: typeof reviewFunctions }>["reviews"] = {
  forBooking: makeFunctionReference("reviews:forBooking"),
  save: makeFunctionReference("reviews:save"),
  withdraw: makeFunctionReference("reviews:withdraw"),
  report: makeFunctionReference("reviews:report"),
  publicForAdvocate: makeFunctionReference("reviews:publicForAdvocate"),
  adminQueue: makeFunctionReference("reviews:adminQueue"),
  moderate: makeFunctionReference("reviews:moderate"),
  audit: makeFunctionReference("reviews:audit"),
};
const modules = import.meta.glob("../convex/**/*.ts");
const paginationOpts = { numItems: 50, cursor: null };
const now = Date.UTC(2026, 9, 21, 9);
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

async function fixture() {
  const t = convexTest(schema, modules);
  const user = t.withIdentity({ subject: "review-owner" });
  const stranger = t.withIdentity({ subject: "review-stranger" });
  const advocate = t.withIdentity({ subject: "review-advocate" });
  const admin = t.withIdentity({ subject: "review-admin" });
  const userId = await user.mutation(api.accounts.ensure, { role: "user", displayName: "Private reviewer identity", locale: "en" });
  const strangerId = await stranger.mutation(api.accounts.ensure, { role: "user", displayName: "Private stranger identity", locale: "en" });
  const advocateAccountId = await advocate.mutation(api.accounts.ensure, { role: "advocate", displayName: "Synthetic review advocate", locale: "en" });
  await t.mutation(internal.accounts.bootstrapAdmin, { clerkSubject: "review-admin", displayName: "Test administrator", locale: "en" });
  const adminAccount = await admin.query(api.accounts.me, {});
  if (!adminAccount) throw new Error("Fixture administrator missing.");
  const advocateId = await t.run(ctx => ctx.db.insert("advocates", { accountId: advocateAccountId, displayName: "Synthetic review advocate", city: "Jammu", cityKey: "jammu", bio: "Synthetic consultation fixture.", barRegistration: "PRIVATE-REGISTRATION-FIXTURE", yearsExperience: 7, domains: ["property"], locales: ["en"], consultationModes: ["video"], revision: 1, application: { kind: "approved", reviewerId: adminAccount._id, reviewedAt: now, reason: "Synthetic approved review fixture." } }));
  const caseId = await user.mutation(api.cases.create, { title: "Private case title", text: "Private case facts must never be in public review metadata.", context: [], locale: "en" });
  await user.mutation(api.cases.updateSummary, { caseId, expectedVersion: 0, summary: { locale: "en", domain: "property", urgency: "medium", text: "Private summary fixture.", actions: [] } });
  const [slotId] = await advocate.mutation(api.slots.publish, { slots: [{ start: now + 4 * 60 * 60 * 1000, durationMinutes: 30, consultationMode: "video" }] });
  if (!slotId) throw new Error("Fixture slot missing.");
  const bookingId = await user.mutation(api.bookings.request, { slotId, caseId, summaryVersion: 1, idempotencyKey: "review-fixture", consent: { recipientAdvocateId: advocateId, summaryVersion: 1, granted: true } });
  await advocate.mutation(api.bookings.transition, { bookingId, action: "accept" });
  vi.setSystemTime(now + 5 * 60 * 60 * 1000);
  await advocate.mutation(api.bookings.transition, { bookingId, action: "complete" });
  const input = { bookingId, rating: 4, text: "Helpful consultation and clear explanations.", publicConsent: true } as const;
  const publicList = (options = paginationOpts) => t.query(reviews.publicForAdvocate, { advocateId, paginationOpts: options });
  const save = () => user.mutation(reviews.save, input);
  const moderate = async (reviewId: Doc<"reviews">["_id"], decision: "publish" | "hide" = "publish", reason = "Reviewed for public confidentiality and abuse.") => {
    const current = await t.run(ctx => ctx.db.get(reviewId));
    if (!current) throw new Error("Fixture review missing.");
    return await admin.mutation(reviews.moderate, { reviewId, expectedRevision: current.revision, expectedReportCount: (await admin.query(reviews.adminQueue, { paginationOpts: { numItems: 50, cursor: null }, includeResolved: true })).page.find(row => row._id === reviewId)?.reportCount ?? 0, decision, reason });
  };
  const addBooking = (changes: Partial<Pick<Doc<"bookings">, "userId" | "state">> = {}) => t.run(async ctx => {
    const original = await ctx.db.get(bookingId);
    if (!original) throw new Error("Fixture booking missing.");
    const { _id, _creationTime, ...content } = original;
    return await ctx.db.insert("bookings", { ...content, idempotencyKey: `synthetic-clone-${_id}-${_creationTime}-${Math.random()}`, ...changes });
  });
  return { t, user, stranger, advocate, admin, userId, strangerId, advocateAccountId, advocateId, caseId, bookingId, input, publicList, save, moderate, addBooking };
}

describe("review eligibility and validation", () => {
  it("allows only the active booking.userId user, and requires completed state for every save", async () => {
    const f = await fixture();
    expect(await f.user.query(reviews.forBooking, { bookingId: f.bookingId })).toEqual({ eligibility: { eligible: true, reason: null }, review: null, publicConsentText: PUBLIC_CONSENT_TEXT });
    for (const state of ["pending", "accepted", "declined", "cancelled", "expired"] as const) {
      const bookingId = await f.addBooking({ state });
      expect((await f.user.query(reviews.forBooking, { bookingId })).eligibility).toEqual({ eligible: false, reason: "booking_not_completed" });
      await expect(f.user.mutation(reviews.save, { ...f.input, bookingId })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    }
    for (const operation of [
      f.stranger.query(reviews.forBooking, { bookingId: f.bookingId }),
      f.stranger.mutation(reviews.save, f.input),
      f.stranger.mutation(reviews.withdraw, { bookingId: f.bookingId }),
    ]) await expect(operation).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    for (const client of [f.advocate, f.admin]) {
      await expect(client.query(reviews.forBooking, { bookingId: f.bookingId })).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
      await expect(client.mutation(reviews.save, f.input)).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
    }
    await expect(f.t.query(reviews.forBooking, { bookingId: f.bookingId })).rejects.toMatchObject({ data: { code: "UNAUTHENTICATED" } });
    await expect(f.t.mutation(reviews.save, f.input)).rejects.toMatchObject({ data: { code: "UNAUTHENTICATED" } });
    await f.t.run(ctx => ctx.db.patch(f.userId, { disabled: true }));
    await expect(f.save()).rejects.toMatchObject({ data: { code: "ACCOUNT_DISABLED" } });
    expect(await f.t.run(ctx => ctx.db.query("reviews").collect())).toHaveLength(0);
    expect(await f.t.run(ctx => ctx.db.query("reviewAudits").collect())).toHaveLength(0);
  });

  it("validates integer rating, bounded nonempty text, and explicit public/confidentiality consent atomically", async () => {
    const f = await fixture();
    for (const rating of [0, 6, 2.5, NaN, Infinity]) await expect(f.user.mutation(reviews.save, { ...f.input, rating })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    for (const text of ["", " \n ", "x".repeat(REVIEW_LIMITS.text + 1)]) await expect(f.user.mutation(reviews.save, { ...f.input, text })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    // @ts-expect-error Consent must be explicitly true at the transport boundary.
    await expect(f.user.mutation(reviews.save, { ...f.input, publicConsent: false })).rejects.toThrow();
    // @ts-expect-error Omitting consent is not an acknowledgement.
    await expect(f.user.mutation(reviews.save, { bookingId: f.bookingId, rating: 5, text: "A review" })).rejects.toThrow();
    expect(await f.t.run(ctx => ctx.db.query("reviewAudits").collect())).toHaveLength(0);
    const saved = await f.user.mutation(reviews.save, { ...f.input, rating: 1, text: `  ${"x".repeat(REVIEW_LIMITS.text)}  ` });
    expect(saved).toMatchObject({ rating: 1, status: "pending", text: "x".repeat(REVIEW_LIMITS.text) });
    expect(await f.t.run(ctx => ctx.db.get(saved._id))).toMatchObject({ publicConsent: true, consentVersion: "public-confidentiality-v1", consentedAt: Date.now() });
    expect(await f.publicList()).toMatchObject({ page: [], rating: { average: null, count: 0 } });
  });

  it("keeps exactly one review per booking across edits and resubmissions, with immutable snapshots", async () => {
    const f = await fixture();
    const first = await f.save();
    const createdAudit = (await f.admin.query(reviews.audit, { reviewId: first._id, paginationOpts })).page[0];
    expect(createdAudit).toMatchObject({ event: { kind: "created" }, actorId: f.userId, snapshot: { text: f.input.text, rating: 4, status: "pending", revision: 1 } });
    await f.moderate(first._id);
    expect((await f.publicList()).rating).toEqual({ average: 4, count: 1 });
    const edited = await f.user.mutation(reviews.save, { ...f.input, rating: 5, text: "Edited public review" });
    expect(edited).toMatchObject({ _id: first._id, status: "pending", revision: 3 });
    expect(await f.publicList()).toMatchObject({ page: [], rating: { average: null, count: 0 } });
    await f.moderate(first._id);
    await f.user.mutation(reviews.withdraw, { bookingId: f.bookingId });
    expect(await f.publicList()).toMatchObject({ page: [], rating: { average: null, count: 0 } });
    expect((await f.admin.query(reviews.adminQueue, { paginationOpts })).page).toHaveLength(0);
    const withdrawn = await f.user.query(reviews.forBooking, { bookingId: f.bookingId });
    expect(withdrawn.review).toMatchObject({ _id: first._id, status: "withdrawn" });
    const auditBefore = await f.admin.query(reviews.audit, { reviewId: first._id, paginationOpts });
    await f.user.mutation(reviews.withdraw, { bookingId: f.bookingId });
    expect(await f.admin.query(reviews.audit, { reviewId: first._id, paginationOpts })).toEqual(auditBefore);
    await expect(f.moderate(first._id)).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    expect(await f.save()).toMatchObject({ _id: first._id, status: "pending", revision: 6 });
    expect(await f.t.run(ctx => ctx.db.query("reviews").collect())).toHaveLength(1);
    const audits = (await f.admin.query(reviews.audit, { reviewId: first._id, paginationOpts })).page;
    expect(audits.map(row => row.event.kind)).toEqual(["created", "moderated", "edited", "moderated", "withdrawn", "edited"]);
    expect(audits[0]).toEqual(createdAudit);
    expect(audits[2]?.snapshot.text).toBe("Edited public review");
  });
});

describe("review moderation and abuse reports", () => {
  it("requires active administrators, rejects stale revisions after an edit, and audits publish/hide reasons", async () => {
    const f = await fixture();
    const saved = await f.save();
    const queue = await f.admin.query(reviews.adminQueue, { paginationOpts });
    expect(queue.page[0]).toMatchObject({ _id: saved._id, status: "pending", reportCount: 0, reports: [] });
    for (const client of [f.user, f.stranger, f.advocate]) {
      await expect(client.query(reviews.adminQueue, { paginationOpts })).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
      await expect(client.query(reviews.audit, { reviewId: saved._id, paginationOpts })).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
      await expect(client.mutation(reviews.moderate, { reviewId: saved._id, expectedRevision: 1, expectedReportCount: 0, decision: "publish", reason: "Not an administrator" })).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
    }
    await f.user.mutation(reviews.save, { ...f.input, text: "Text changed while the administrator was reviewing." });
    for (const decision of ["publish", "hide"] as const) await expect(f.admin.mutation(reviews.moderate, { reviewId: saved._id, expectedRevision: saved.revision, expectedReportCount: 0, decision, reason: "Stale moderation must not apply" })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    expect((await f.publicList()).page).toHaveLength(0);
    expect((await f.admin.query(reviews.audit, { reviewId: saved._id, paginationOpts })).page).toHaveLength(2);
    // @ts-expect-error Moderation must identify the content revision the administrator saw.
    await expect(f.admin.mutation(reviews.moderate, { reviewId: saved._id, decision: "publish", reason: "Missing revision" })).rejects.toThrow();
    for (const reason of [" ", "x".repeat(REVIEW_LIMITS.reason + 1)]) await expect(f.moderate(saved._id, "publish", reason)).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    await f.moderate(saved._id, "publish", "Checked current edited text.");
    expect((await f.publicList()).page[0]?.text).toBe("Text changed while the administrator was reviewing.");
    expect((await f.admin.query(reviews.adminQueue, { paginationOpts })).page).toHaveLength(0);
    expect((await f.admin.query(reviews.adminQueue, { paginationOpts, includeResolved: true })).page).toHaveLength(1);
    await f.moderate(saved._id, "hide", "Confidentiality concern.");
    expect((await f.publicList()).page).toHaveLength(0);
    expect((await f.admin.query(reviews.audit, { reviewId: saved._id, paginationOpts })).page.at(-1)).toMatchObject({ event: { kind: "moderated", decision: "hide", reason: "Confidentiality concern.", previousStatus: "published" }, snapshot: { status: "hidden" } });
    await f.user.mutation(reviews.withdraw, { bookingId: f.bookingId });
    expect((await f.admin.query(reviews.adminQueue, { paginationOpts, includeResolved: true })).page[0]?.status).toBe("withdrawn");
    const admin = await f.admin.query(api.accounts.me, {});
    if (!admin) throw new Error("Missing administrator");
    await f.t.run(ctx => ctx.db.patch(admin._id, { disabled: true }));
    await expect(f.admin.query(reviews.adminQueue, { paginationOpts })).rejects.toMatchObject({ data: { code: "ACCOUNT_DISABLED" } });
    await expect(f.admin.query(reviews.audit, { reviewId: saved._id, paginationOpts })).rejects.toMatchObject({ data: { code: "ACCOUNT_DISABLED" } });
    await expect(f.moderate(saved._id)).rejects.toMatchObject({ data: { code: "ACCOUNT_DISABLED" } });
  });

  it("accepts bounded signed-in reports once per account/revision, queues them, and preserves their audit", async () => {
    const f = await fixture();
    const saved = await f.save();
    await expect(f.stranger.mutation(reviews.report, { reviewId: saved._id, reason: "Private pending review" })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    await f.moderate(saved._id);
    await expect(f.t.mutation(reviews.report, { reviewId: saved._id, reason: "Anonymous report" })).rejects.toMatchObject({ data: { code: "UNAUTHENTICATED" } });
    await expect(f.t.withIdentity({ subject: "not-onboarded" }).mutation(reviews.report, { reviewId: saved._id, reason: "No account" })).rejects.toMatchObject({ data: { code: "ONBOARDING_REQUIRED" } });
    for (const reason of ["", " \n ", "x".repeat(REVIEW_LIMITS.reason + 1)]) await expect(f.stranger.mutation(reviews.report, { reviewId: saved._id, reason })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    expect(await f.stranger.mutation(reviews.report, { reviewId: saved._id, reason: "  Potential abusive text.  " })).toEqual({ reported: true });
    await expect(f.stranger.mutation(reviews.report, { reviewId: saved._id, reason: "Duplicate" })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    await f.advocate.mutation(reviews.report, { reviewId: saved._id, reason: "Advocate account can report abuse." });
    const queued = (await f.admin.query(reviews.adminQueue, { paginationOpts })).page[0];
    expect(queued).toMatchObject({ _id: saved._id, status: "published", reportCount: 2, reports: expect.arrayContaining([expect.objectContaining({ reason: "Potential abusive text.", revision: 2 })]) });
    expect((await f.publicList()).rating).toEqual({ average: 4, count: 1 });
    const reportAudit = (await f.admin.query(reviews.audit, { reviewId: saved._id, paginationOpts })).page.find(row => row.event.kind === "reported");
    expect(reportAudit).toMatchObject({ actorId: f.strangerId, event: { kind: "reported", reason: "Potential abusive text." }, snapshot: { revision: 2, status: "published" } });
    await f.moderate(saved._id, "publish", "Reports investigated; publication retained.");
    expect((await f.admin.query(reviews.adminQueue, { paginationOpts })).page).toHaveLength(0);
    await f.stranger.mutation(reviews.report, { reviewId: saved._id, reason: "New revision report" });
    expect(await f.t.run(ctx => ctx.db.query("reviewReports").collect())).toHaveLength(3);
    await f.moderate(saved._id, "hide");
    await expect(f.user.mutation(reviews.report, { reviewId: saved._id, reason: "Cannot report private hidden text" })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    expect((await f.admin.query(reviews.audit, { reviewId: saved._id, paginationOpts })).page.find(row => row._id === reportAudit?._id)).toEqual(reportAudit);
    await f.t.run(ctx => ctx.db.patch(f.strangerId, { disabled: true }));
    await expect(f.stranger.mutation(reviews.report, { reviewId: saved._id, reason: "Disabled reporter" })).rejects.toMatchObject({ data: { code: "ACCOUNT_DISABLED" } });
  });

  it("rejects moderation that predates a new abuse report without bypassing report deduplication", async () => {
    const f = await fixture();
    const saved = await f.save();
    const published = await f.moderate(saved._id);
    await f.stranger.mutation(reviews.report, { reviewId: saved._id, reason: "New report unseen by administrator" });
    await expect(f.admin.mutation(reviews.moderate, { reviewId: saved._id, expectedRevision: published.revision, expectedReportCount: 0, decision: "publish", reason: "Stale decision" })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    expect((await f.admin.query(reviews.adminQueue, { paginationOpts })).page[0]?.reportCount).toBe(1);
    await expect(f.stranger.mutation(reviews.report, { reviewId: saved._id, reason: "Duplicate" })).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    await f.moderate(saved._id);
    expect((await f.admin.query(reviews.adminQueue, { paginationOpts })).page).toHaveLength(0);
  });

  it("fails explicitly at the report bound without losing queue access or adding unaudited reports", async () => {
    const f = await fixture();
    const saved = await f.save();
    await f.moderate(saved._id);
    await f.t.run(async ctx => {
      for (let index = 0; index < REVIEW_LIMITS.reports; index++) {
        const reporterId = await ctx.db.insert("accounts", { clerkSubject: `report-limit-fixture-${index}`, displayName: "Synthetic reporter", role: "user", locale: "en", disabled: false });
        await ctx.db.insert("reviewReports", { reviewId: saved._id, reporterId, revision: 2, reason: "Synthetic bounded report fixture", at: Date.now() });
      }
    });
    await expect(f.stranger.mutation(reviews.report, { reviewId: saved._id, reason: "One over limit" })).rejects.toMatchObject({ data: { code: "LIMIT_EXCEEDED" } });
    expect((await f.admin.query(reviews.adminQueue, { paginationOpts, includeResolved: true })).page[0]?.reportCount).toBe(REVIEW_LIMITS.reports);
    expect((await f.admin.query(reviews.audit, { reviewId: saved._id, paginationOpts })).page).toHaveLength(2);
    await f.moderate(saved._id, "hide");
  });
});

describe("public review privacy, pagination, and live ratings", () => {
  it("returns only pseudonymous published reviews with exact aggregates independent of pagination", async () => {
    const f = await fixture();
    const first = await f.save();
    await f.moderate(first._id);
    const secondBookingId = await f.addBooking({ userId: f.strangerId });
    const second = await f.stranger.mutation(reviews.save, { ...f.input, bookingId: secondBookingId, rating: 1, text: "A different consultation experience." });
    await f.moderate(second._id);
    const pendingId = await f.addBooking();
    await f.user.mutation(reviews.save, { ...f.input, bookingId: pendingId, rating: 5 });
    const one = await f.publicList({ numItems: 1, cursor: null });
    expect(one).toMatchObject({ isDone: false, rating: { average: 2.5, count: 2 } });
    expect(one.page[0]?._id).toBe(second._id);
    const two = await f.t.query(reviews.publicForAdvocate, { advocateId: f.advocateId, paginationOpts: { numItems: 1, cursor: one.continueCursor } });
    expect(two).toMatchObject({ isDone: true, rating: { average: 2.5, count: 2 } });
    expect(two.page[0]?._id).toBe(first._id);
    expect(Object.keys(one.page[0] ?? {}).sort()).toEqual(["_id", "createdAt", "label", "rating", "text", "updatedAt"]);
    expect(one.page[0]?.label).toBe("Verified consultation");
    const serialized = JSON.stringify(await f.publicList());
    for (const secret of [f.bookingId, secondBookingId, f.userId, f.strangerId, f.caseId, "Private reviewer identity", "Private case facts", "PRIVATE-REGISTRATION-FIXTURE", "clerkSubject", "summarySnapshot", "reporterId", "ownerId", "bookingId"]) expect(serialized).not.toContain(secret);
    expect((await f.t.query(api.advocates.getPublic, { advocateId: f.advocateId }))?.rating).toEqual({ average: 2.5, count: 2 });
    expect((await f.t.query(api.advocates.listPublic, { paginationOpts })).page[0]?.rating).toEqual({ average: 2.5, count: 2 });
    await f.user.mutation(reviews.withdraw, { bookingId: f.bookingId });
    expect((await f.publicList()).rating).toEqual({ average: 1, count: 1 });
    await f.moderate(second._id, "hide");
    expect((await f.publicList()).rating).toEqual({ average: null, count: 0 });
  });

  it("recomputes eligibility for disabled, missing, or role-changed owners and changed bookings", async () => {
    const f = await fixture();
    const saved = await f.save();
    await f.moderate(saved._id);
    const assertEmpty = async () => {
      expect(await f.publicList()).toMatchObject({ page: [], rating: { average: null, count: 0 } });
      expect((await f.t.query(api.advocates.getPublic, { advocateId: f.advocateId }))?.rating).toEqual({ average: null, count: 0 });
    };
    await f.t.run(ctx => ctx.db.patch(f.userId, { disabled: true }));
    await assertEmpty();
    await expect(f.moderate(saved._id)).rejects.toMatchObject({ data: { code: "NOT_APPROVED" } });
    await f.t.run(ctx => ctx.db.patch(f.userId, { disabled: false }));
    expect((await f.publicList()).rating).toEqual({ average: 4, count: 1 });
    await f.t.run(ctx => ctx.db.patch(f.userId, { role: "advocate" }));
    await assertEmpty();
    await f.t.run(ctx => ctx.db.patch(f.userId, { role: "user" }));
    for (const state of ["pending", "accepted", "declined", "cancelled", "expired"] as const) {
      await f.t.run(ctx => ctx.db.patch(f.bookingId, { state }));
      await assertEmpty();
    }
    await f.t.run(ctx => ctx.db.patch(f.bookingId, { state: "completed", userId: f.strangerId }));
    await assertEmpty();
    await f.t.run(ctx => ctx.db.patch(f.bookingId, { userId: f.userId, advocateAccountId: f.strangerId }));
    await assertEmpty();
    await f.t.run(ctx => ctx.db.patch(f.bookingId, { advocateAccountId: f.advocateAccountId }));
    expect((await f.publicList()).rating.count).toBe(1);
    // Withdrawal remains possible even if a booking's eligibility was revoked.
    await f.t.run(ctx => ctx.db.patch(f.bookingId, { state: "cancelled" }));
    await f.user.mutation(reviews.withdraw, { bookingId: f.bookingId });
    expect((await f.user.query(reviews.forBooking, { bookingId: f.bookingId })).review?.status).toBe("withdrawn");
    await f.t.run(ctx => ctx.db.patch(f.bookingId, { state: "completed" }));
    await f.save();
    await f.moderate(saved._id);
    await f.t.run(ctx => ctx.db.delete(f.userId));
    await assertEmpty();
  });

  it("hides reviews, public profiles, and discovery entries when advocates are inactive or unapproved", async () => {
    const f = await fixture();
    const saved = await f.save();
    await f.moderate(saved._id);
    const approved = await f.t.run(ctx => ctx.db.get(f.advocateId));
    if (!approved || approved.application.kind !== "approved") throw new Error("Missing approved advocate");
    const assertHidden = async () => {
      expect(await f.publicList()).toMatchObject({ page: [], rating: { average: null, count: 0 } });
      expect(await f.t.query(api.advocates.getPublic, { advocateId: f.advocateId })).toBeNull();
      expect((await f.t.query(api.advocates.listPublic, { paginationOpts })).page).toHaveLength(0);
      await expect(f.moderate(saved._id)).rejects.toMatchObject({ data: { code: "NOT_APPROVED" } });
    };
    await f.t.run(ctx => ctx.db.patch(f.advocateAccountId, { disabled: true }));
    await assertHidden();
    await f.t.run(ctx => ctx.db.patch(f.advocateAccountId, { disabled: false, role: "user" }));
    await assertHidden();
    await f.t.run(ctx => ctx.db.patch(f.advocateAccountId, { role: "advocate" }));
    for (const application of [{ kind: "pending" }, { ...approved.application, kind: "suspended" }, { ...approved.application, kind: "rejected" }] as const) {
      await f.t.run(ctx => ctx.db.patch(f.advocateId, { application }));
      await assertHidden();
    }
    await f.t.run(ctx => ctx.db.patch(f.advocateId, { application: approved.application }));
    expect((await f.publicList()).rating.count).toBe(1);
    await f.t.run(ctx => ctx.db.delete(f.advocateAccountId));
    await assertHidden();
  });

  it("rejects invalid and cross-advocate cursors and invalid page sizes", async () => {
    const f = await fixture();
    for (const cursor of ["{}", "not-json", "x".repeat(8193), JSON.stringify({ offset: -1, advocateId: f.advocateId }), JSON.stringify({ offset: REVIEW_LIMITS.candidates + 1, advocateId: f.advocateId }), JSON.stringify({ offset: 0.5, advocateId: f.advocateId }), JSON.stringify({ offset: 0, advocateId: "different-profile" })]) {
      await expect(f.t.query(reviews.publicForAdvocate, { advocateId: f.advocateId, paginationOpts: { numItems: 1, cursor } })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    }
    for (const numItems of [0, 51, 1.5]) {
      await expect(f.t.query(reviews.publicForAdvocate, { advocateId: f.advocateId, paginationOpts: { numItems, cursor: null } })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
      await expect(f.admin.query(reviews.adminQueue, { paginationOpts: { numItems, cursor: null } })).rejects.toMatchObject({ data: { code: "INVALID_INPUT" } });
    }
  });

  it("paginates the moderation queue and immutable audit history", async () => {
    const f = await fixture();
    const first = await f.save();
    const bookingId = await f.addBooking();
    const second = await f.user.mutation(reviews.save, { ...f.input, bookingId });
    const firstPage = await f.admin.query(reviews.adminQueue, { paginationOpts: { numItems: 1, cursor: null } });
    expect(firstPage.isDone).toBe(false);
    expect(firstPage.page[0]?._id).toBe(second._id);
    const lastPage = await f.admin.query(reviews.adminQueue, { paginationOpts: { numItems: 1, cursor: firstPage.continueCursor } });
    expect(lastPage.isDone).toBe(true);
    expect(lastPage.page[0]?._id).toBe(first._id);
    await f.moderate(first._id);
    const auditPage = await f.admin.query(reviews.audit, { reviewId: first._id, paginationOpts: { numItems: 1, cursor: null } });
    expect(auditPage.isDone).toBe(false);
    expect(auditPage.page[0]?.event.kind).toBe("created");
    expect((await f.admin.query(reviews.audit, { reviewId: first._id, paginationOpts: { numItems: 1, cursor: auditPage.continueCursor } })).page[0]?.event.kind).toBe("moderated");
  });

  it("throws explicit overflow for public lists, profiles and discovery instead of partial or zero ratings", async () => {
    const f = await fixture();
    const saved = await f.save();
    await f.moderate(saved._id);
    await f.t.run(async ctx => {
      const original = await ctx.db.get(saved._id);
      const booking = await ctx.db.get(f.bookingId);
      if (!original || !booking) throw new Error("Missing fixture");
      const { _id: _reviewId, _creationTime: _reviewAt, ...review } = original;
      const { _id: _bookingId, _creationTime: _bookingAt, ...bookingData } = booking;
      for (let index = 1; index < REVIEW_LIMITS.candidates; index++) {
        const bookingId = await ctx.db.insert("bookings", { ...bookingData, idempotencyKey: `overflow-fixture-${index}` });
        await ctx.db.insert("reviews", { ...review, bookingId });
      }
    });
    expect((await f.publicList()).rating).toEqual({ average: 4, count: REVIEW_LIMITS.candidates });
    const extraBooking = await f.addBooking();
    await f.user.mutation(reviews.save, { ...f.input, bookingId: extraBooking });
    await expect(f.publicList()).rejects.toMatchObject({ data: { code: "LIMIT_EXCEEDED" } });
    await expect(f.t.query(api.advocates.getPublic, { advocateId: f.advocateId })).rejects.toMatchObject({ data: { code: "LIMIT_EXCEEDED" } });
    await expect(f.t.query(api.advocates.listPublic, { paginationOpts })).rejects.toMatchObject({ data: { code: "LIMIT_EXCEEDED" } });
  });
});
