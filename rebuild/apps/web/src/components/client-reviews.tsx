"use client";

import { useRef, useState, type FormEvent } from "react";
import { useConvexAuth, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@vakil/backend/api";
import type { Id } from "@vakil/backend/data-model";
import { Button, Input, Label, Textarea } from "@vakil/ui";
import { getFeatureCopy } from "@/lib/feature-copy";
import { errorMessage } from "@/lib/errors";
import { useLocale } from "./locale";
import { formatTime, LoadMore } from "./shared";

export function BookingReview({ bookingId }: { bookingId: Id<"bookings"> }) {
  const data = useQuery(api.reviews.forBooking, { bookingId });
  const { locale } = useLocale(); const copy = getFeatureCopy(locale);
  if (!data) return <p role="status">{copy.loading}</p>;
  if (!data.eligibility.eligible) return <p>{copy.noEligible}</p>;
  return <ReviewEditor bookingId={bookingId} initial={data.review} />;
}

function ReviewEditor({ bookingId, initial }: { bookingId: Id<"bookings">; initial: { rating: number; text: string; status: "pending" | "published" | "hidden" | "withdrawn" } | null }) {
  const { locale } = useLocale(); const copy = getFeatureCopy(locale);
  const save = useMutation(api.reviews.save), withdraw = useMutation(api.reviews.withdraw);
  const current = useQuery(api.reviews.forBooking, { bookingId });
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [text, setText] = useState(initial?.text ?? "");
  const [consent, setConsent] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const guard = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (guard.current || !consent || !text.trim() || rating < 1 || rating > 5) return;
    guard.current = true; setBusy(true); setError(""); setNotice("");
    try { await save({ bookingId, rating, text, publicConsent: true }); setConsent(false); setNotice(copy.saved); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { guard.current = false; setBusy(false); }
  }
  async function withdrawReview() {
    if (guard.current) return; guard.current = true; setBusy(true); setError("");
    try { await withdraw({ bookingId }); setConsent(false); setNotice(copy.withdrawn); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { guard.current = false; setBusy(false); }
  }
  return <section className="review-editor" aria-labelledby={`review-title-${bookingId}`}>
    <h3 id={`review-title-${bookingId}`}>{copy.reviewHeading}</h3>
    <p className="status-message">{copy.publicNotice}</p>
    {current?.review && <p role="status">{copy.reviewStatus}: {copy[current.review.status]}</p>}
    <form className="form-stack" onSubmit={submit} aria-busy={busy}>
      <div className="field"><Label htmlFor={`rating-${bookingId}`}>{copy.selectRating}</Label><select id={`rating-${bookingId}`} required value={rating} disabled={busy} onChange={event => { setRating(Number(event.target.value)); setConsent(false); }}><option value={0}>—</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} / 5</option>)}</select></div>
      <div className="field"><Label htmlFor={`review-text-${bookingId}`}>{copy.reviewText}</Label><Textarea id={`review-text-${bookingId}`} dir="auto" value={text} required rows={4} maxLength={2000} disabled={busy} onChange={event => { setText(event.target.value); setConsent(false); }} /><small>{text.length} / 2,000</small></div>
      <Label className="checkbox-line"><Input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} />{copy.publicConsent}</Label>
      {error && <p role="alert" className="status-message error">{error}</p>}{notice && <p role="status" className="status-message">{notice}</p>}
      <div className="actions"><Button className="btn" disabled={busy || !consent || !text.trim() || rating < 1}>{busy ? copy.saving : copy.submit}</Button>{current?.review && current.review.status !== "withdrawn" && <Button type="button" className="btn secondary" disabled={busy} onClick={() => void withdrawReview()}>{copy.withdraw}</Button>}</div>
    </form>
  </section>;
}

export function PublicClientReviews({ advocateId }: { advocateId: Id<"advocates"> }) {
  const { locale } = useLocale(); const copy = getFeatureCopy(locale);
  const { results, status, loadMore } = usePaginatedQuery(api.reviews.publicForAdvocate, { advocateId }, { initialNumItems: 10 });
  const { isAuthenticated } = useConvexAuth();
  return <section className="card public-reviews" aria-labelledby="public-reviews-title"><h2 id="public-reviews-title">{copy.rating}</h2><p className="muted small-text">{copy.ratingCaveat}</p>
    {!results.length && status !== "LoadingFirstPage" && <p>{copy.noPublicReviews}</p>}
    {results.map(review => <article className="public-review" key={review._id}><p><strong>{review.rating} / 5</strong> · {copy.verified}</p><p dir="auto" className="summary-text">{review.text}</p><time dateTime={new Date(review.updatedAt).toISOString()}>{formatTime(review.updatedAt)}</time>{isAuthenticated && <ReviewReport reviewId={review._id} />}</article>)}
    <LoadMore status={status} loadMore={loadMore} />
  </section>;
}

function ReviewReport({ reviewId }: { reviewId: Id<"reviews"> }) {
  const { locale } = useLocale(); const copy = getFeatureCopy(locale);
  const report = useMutation(api.reviews.report); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [done, setDone] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); if (busy || !reason.trim()) return; setBusy(true); setError(""); try { await report({ reviewId, reason }); setDone(true); } catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); } }
  return <details><summary>{copy.report}</summary><p className="small-text">{copy.reportHint}</p>{done ? <p role="status">{copy.reported}</p> : <form onSubmit={submit} className="form-stack"><Label htmlFor={`report-${reviewId}`}>{copy.reason}</Label><Textarea id={`report-${reviewId}`} required maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} disabled={busy} />{error && <p role="alert">{error}</p>}<Button className="btn secondary" disabled={busy || !reason.trim()}>{busy ? copy.saving : copy.report}</Button></form>}</details>;
}

export function ClientReviewModeration() {
  const { locale } = useLocale(); const copy = getFeatureCopy(locale);
  const [includeResolved, setIncludeResolved] = useState(false);
  const { results, status, loadMore } = usePaginatedQuery(api.reviews.adminQueue, { includeResolved }, { initialNumItems: 20 });
  return <section className="card" aria-labelledby="review-moderation-title"><h2 id="review-moderation-title">{copy.moderation}</h2><Label className="checkbox-line"><Input type="checkbox" checked={includeResolved} onChange={event => setIncludeResolved(event.target.checked)} />{copy.audit}</Label>
    {!results.length && status !== "LoadingFirstPage" && <p>{copy.noReviews}</p>}
    {results.map(review => <ModerationItem key={`${review._id}:${review.revision}`} review={review} />)}<LoadMore status={status} loadMore={loadMore} />
  </section>;
}

function ModerationItem({ review }: { review: { _id: Id<"reviews">; revision: number; rating: number; text: string; status: "pending" | "published" | "hidden" | "withdrawn"; reports: { _id: Id<"reviewReports">; reason: string }[] } }) {
  const { locale } = useLocale(); const copy = getFeatureCopy(locale);
  const moderate = useMutation(api.reviews.moderate); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function decide(decision: "publish" | "hide") { if (busy || !reason.trim()) return; setBusy(true); setError(""); try { await moderate({ reviewId: review._id, expectedRevision: review.revision, expectedReportCount: review.reports.length, decision, reason }); } catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); } }
  return <article className="public-review"><h3>{review.rating} / 5 · {copy[review.status]}</h3><p className="summary-text" dir="auto">{review.text}</p>{review.reports.map(report => <p key={report._id}>{copy.report}: {report.reason}</p>)}<Label htmlFor={`moderate-${review._id}`}>{copy.reason}</Label><Textarea id={`moderate-${review._id}`} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} disabled={busy} />{error && <p role="alert" className="status-message error">{error}</p>}<div className="actions"><Button className="btn" type="button" disabled={busy || !reason.trim() || review.status === "withdrawn"} onClick={() => void decide("publish")}>{copy.publish}</Button><Button className="btn secondary" type="button" disabled={busy || !reason.trim() || review.status === "withdrawn"} onClick={() => void decide("hide")}>{copy.hide}</Button></div><details><summary>{copy.audit}</summary><ReviewAudit reviewId={review._id} /></details></article>;
}

function ReviewAudit({ reviewId }: { reviewId: Id<"reviews"> }) {
  const { results, status, loadMore } = usePaginatedQuery(api.reviews.audit, { reviewId }, { initialNumItems: 20 });
  return <><ol>{results.map(entry => <li key={entry._id}><time dateTime={new Date(entry.at).toISOString()}>{formatTime(entry.at)}</time> · {entry.event.kind}{"reason" in entry.event ? ` · ${entry.event.reason}` : ""} · {entry.snapshot.status}</li>)}</ol><LoadMore status={status} loadMore={loadMore} /></>;
}
