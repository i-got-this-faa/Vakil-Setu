"use client";

import { Button, Input, Label } from "@vakil/ui";

import Link from "next/link";
import { useState } from "react";
import {
  useConvexAuth,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { api } from "@vakil/backend/api";
import type { Doc, Id } from "@vakil/backend/data-model";
import {
  LEGAL_DOMAINS,
  isLegalDomain,
  isPilotLocale,
  type ConsultationMode,
  type LegalDomain,
  type PilotLocale,
} from "@vakil/domain";
import { ServiceBoundary, SetupNotice } from "./providers";
import {
  EmptyState,
  consultationModeLabel,
  formatTime,
  LoadMore,
  urgencyLabel,
} from "./shared";
import { errorMessage } from "@/lib/errors";
import { SummaryEditor } from "./cases";
import { useLocale } from "./locale";
import { AdvocateComparison, RatingSummary } from "./advocate-comparison";
import { getFeatureCopy } from "@/lib/feature-copy";
import { LanguageOptions } from "./language-options";
import { PublicClientReviews } from "./client-reviews";

type Filters = { domain?: LegalDomain; locale?: PilotLocale; city?: string };

export function Discovery() {
  const { messages, copy, locale: uiLocale } = useLocale();
  const [domain, setDomain] = useState<LegalDomain | "">("");
  const [locale, setLocale] = useState<PilotLocale | "">("");
  const [city, setCity] = useState("");
  const [filters, setFilters] = useState<Filters>({});
  return (
    <main id="main" className="container" style={{ paddingBottom: 70 }}>
      <div className="page-intro">
        <div className="eyebrow">A considered connection</div>
        <h1>{messages.discovery.title}</h1>
        <p>
          Browse approved advocate profiles by practice area, language, and
          city. Published availability is live; a request still needs advocate
          acceptance.
        </p>
      </div>
      <form
        className="filters"
        onSubmit={(event) => {
          event.preventDefault();
          setFilters({
            ...(domain ? { domain } : {}),
            ...(locale ? { locale } : {}),
            ...(city.trim() ? { city: city.trim() } : {}),
          });
        }}
      >
        <div className="field">
          <Label htmlFor="filter-domain">
            {messages.discovery.practiceAreaFilter}
          </Label>
          <select
            id="filter-domain"
            value={domain}
            onChange={(event) => {
              if (
                event.target.value === "" ||
                isLegalDomain(event.target.value)
              )
                setDomain(event.target.value);
            }}
          >
            <option value="">All practice areas</option>
            {LEGAL_DOMAINS.filter((value) => value !== "unknown").map(
              (value) => (
                <option key={value} value={value}>
                  {copy.domainLabels[value]}
                </option>
              ),
            )}
          </select>
        </div>
        <div className="field">
          <Label htmlFor="filter-locale">
            {messages.discovery.languageFilter}
          </Label>
          <select
            id="filter-locale"
            value={locale}
            onChange={(event) => {
              if (
                event.target.value === "" ||
                isPilotLocale(event.target.value)
              )
                setLocale(event.target.value);
            }}
          >
            <option value="">{getFeatureCopy(uiLocale).allLanguages}</option>
            <LanguageOptions />
          </select>
        </div>
        <div className="field">
          <Label htmlFor="filter-city">
            {messages.discovery.locationFilter}
          </Label>
          <Input
            id="filter-city"
            placeholder="Enter a city"
            maxLength={100}
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
        </div>
        <div className="actions">
          <Button className="btn">{messages.discovery.filterButton}</Button>
          <Button
            type="button"
            className="btn secondary"
            onClick={() => {
              setDomain("");
              setLocale("");
              setCity("");
              setFilters({});
            }}
          >
            {messages.common.clear}
          </Button>
        </div>
      </form>
      <ServiceBoundary
        fallback={
          <>
            <SetupNotice />
            <EmptyState title="Discovery needs a connected service.">
              No advocate records have been loaded. Configure Convex and Clerk
              to view actual approved profiles and availability.
            </EmptyState>
          </>
        }
      >
        <DiscoveryResults filters={filters} />
      </ServiceBoundary>
    </main>
  );
}

function DiscoveryResults({ filters }: { filters: Filters }) {
  const { messages, copy, locale } = useLocale();
  const features = getFeatureCopy(locale);
  const [selected, setSelected] = useState<Id<"advocates">[]>([]);
  const { results, status, loadMore } = usePaginatedQuery(
    api.advocates.listPublic,
    filters,
    { initialNumItems: 20 },
  );
  return (
    <>
      <p className="muted small-text">{features.compareHint}</p>
      <AdvocateComparison selected={selected} onRemove={id => setSelected(current => current.filter(value => value !== id))} onClear={() => setSelected([])} />
      <p className="muted small-text" style={{ marginBottom: 18 }}>{copy.discoveryOrder}</p>
      {results.length ? (
        <div className="card-grid">
          {results.map((profile) => (
            <article className="card" key={profile._id}>
              <div
                className="actions"
                style={{ justifyContent: "space-between", marginBottom: 22 }}
              >
                <span className="badge">Approved profile</span>
                <span className="muted small-text">{profile.city}</span>
              </div>
              <h2>{profile.displayName}</h2>
              <RatingSummary rating={profile.rating} />
              <Label className="checkbox-line">
                <Input type="checkbox" checked={selected.includes(profile._id)} disabled={!selected.includes(profile._id) && selected.length >= 3}
                  onChange={event => setSelected(current => event.target.checked ? current.length < 3 && !current.includes(profile._id) ? [...current, profile._id] : current : current.filter(id => id !== profile._id))} />
                {features.compareSelect}: {profile.displayName}
              </Label>
              <p className="muted" style={{ marginBlock: 10 }}>
                {profile.yearsExperience} {messages.discovery.yearsExperience} ·{" "}
                {profile.locales
                  .map((value) => value.toUpperCase())
                  .join(" / ")}
              </p>
              <p className="muted small-text">
                {profile.consultationModes
                  .map((value) => consultationModeLabel(value))
                  .join(" · ")}
              </p>
              <div className="actions" style={{ gap: 7, marginBlock: 14 }}>
                {profile.domains.map((value) => (
                  <span className="badge neutral" key={value}>
                    {value}
                  </span>
                ))}
              </div>
              <p className="muted">{profile.bio}</p>
              {filters.domain && profile.domains.includes(filters.domain) && <p className="small-text" style={{ marginTop: 10 }}>{copy.matchesPractice}: {copy.domainLabels[filters.domain]}</p>}
              {filters.locale && profile.locales.includes(filters.locale) && <p className="small-text">{copy.matchesLanguage}: {filters.locale.toUpperCase()}</p>}
              <div className="divider" />
              <div
                className="actions"
                style={{ justifyContent: "space-between" }}
              >
                <span className="muted small-text">
                  {profile.slots.length
                    ? "Published slots available"
                    : "No open slots published"}
                </span>
                <Link
                  className="btn secondary small"
                  href={`/discover/${profile._id}`}
                >
                  {messages.discovery.viewProfile}
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        status !== "LoadingFirstPage" && (
          <EmptyState title="No matching advocates yet.">
            {messages.discovery.noResultsFound} Try a broader filter or return
            when approved profiles are published.
          </EmptyState>
        )
      )}
      <LoadMore status={status} loadMore={loadMore} />
    </>
  );
}

export function AdvocatePublicPage({ advocateId }: { advocateId: string }) {
  return (
    <main id="main" className="container section">
      <ServiceBoundary>
        <ResolveAdvocate advocateId={advocateId} />
      </ServiceBoundary>
    </main>
  );
}

function ResolveAdvocate({ advocateId }: { advocateId: string }) {
  const resolvedId = useQuery(api.advocates.resolvePublic, { routeId: advocateId });
  if (resolvedId === undefined) return <p className="loading" role="status">Loading advocate profile…</p>;
  if (resolvedId === null) return <EmptyState title="Profile unavailable." action={<Link href="/discover" className="btn secondary">Back to discovery</Link>}>Only approved, active advocates appear publicly.</EmptyState>;
  return <PublicProfile advocateId={resolvedId} />;
}

function PublicProfile({ advocateId }: { advocateId: Id<"advocates"> }) {
  const profile = useQuery(api.advocates.getPublic, { advocateId });
  const slots = useQuery(api.slots.listPublic, { advocateId });
  const [selectedSlot, setSelectedSlot] = useState<Pick<
    Doc<"slots">,
    "_id" | "start" | "end" | "durationMinutes" | "consultationMode"
  > | null>(null);
  if (profile === undefined || slots === undefined)
    return <p className="loading">Loading current profile and slots…</p>;
  if (!profile)
    return (
      <EmptyState title="This profile is no longer available.">
        Approval or account availability may have changed.
      </EmptyState>
    );
  const selected = selectedSlot;
  return (
    <>
      <Link className="inline-link small-text" href="/discover">
        ← All advocates
      </Link>
      <div className="page-intro">
        <div className="eyebrow">Approved advocate · {profile.city}</div>
        <h1>{profile.displayName}</h1>
        <p>{profile.bio}</p>
      </div>
      <div className="actions" style={{ marginBottom: 30 }}>
        <RatingSummary rating={profile.rating} />
        <span className="badge">
          {profile.yearsExperience} years of practice
        </span>
        {profile.domains.map((value) => (
          <span className="badge neutral" key={value}>
            {value}
          </span>
        ))}
        <span className="muted">
          {profile.locales.map((value) => value.toUpperCase()).join(" / ")}
        </span>
        <span className="muted">
          {profile.consultationModes
            .map((value) => consultationModeLabel(value))
            .join(" · ")}
        </span>
      </div>
      <section className="card">
        <h2>Published consultation slots</h2>
        <p className="muted" style={{ marginBlock: 14 }}>
          Times are shown in Indian Standard Time (Asia/Kolkata). Requesting
          reserves a slot while the advocate decides; it does not confirm the
          consultation.
        </p>
        {slots.length ? (
          <div className="stack" style={{ gap: 0 }}>
            {slots.map((slot) => (
              <div className="list-row" key={slot._id}>
                <div>
                  <strong>{formatTime(slot.start)}</strong>
                  <p className="muted">
                    {slot.durationMinutes} minutes ·{" "}
                    {consultationModeLabel(slot.consultationMode)}
                  </p>
                </div>
                <Button
                  className={`btn ${selectedSlot?._id === slot._id ? "" : "secondary"}`}
                  onClick={() => setSelectedSlot(slot)}
                >
                  {selectedSlot?._id === slot._id
                    ? "Selected"
                    : "Select this slot"}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No open slots right now.">
            The advocate has not published future free availability. Check again
            later.
          </EmptyState>
        )}
      </section>
      <PublicClientReviews advocateId={advocateId} />
      {selected && (
        <div style={{ marginTop: 25 }}>
          <BookingAccess
            key={selected._id}
            advocateId={advocateId}
            advocateName={profile.displayName}
            slotId={selected._id}
            start={selected.start}
            mode={selected.consultationMode}
          />
        </div>
      )}
    </>
  );
}

function BookingAccess(props: {
  advocateId: Id<"advocates">;
  advocateName: string;
  slotId: Id<"slots">;
  start: number;
  mode: ConsultationMode;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const account = useQuery(api.accounts.me, isAuthenticated ? {} : "skip");
  if (isLoading || (isAuthenticated && account === undefined))
    return <p className="loading">Loading account access…</p>;
  if (!isAuthenticated)
    return (
      <div className="card">
        <h2>Sign in to request this slot</h2>
        <p className="page-description">
          You need a private case and a reviewed summary before sharing
          information with an advocate.
        </p>
        <div className="actions" style={{ marginTop: 20 }}>
          <Link className="btn" href="/sign-in">
            Sign in
          </Link>
          <Link className="btn secondary" href="/sign-up">
            Create an account
          </Link>
        </div>
      </div>
    );
  if (!account)
    return (
      <div className="card">
        <h2>Complete your account setup</h2>
        <Link className="btn" href="/workspace" style={{ marginTop: 20 }}>
          Open workspace
        </Link>
      </div>
    );
  if (account.role !== "user" || account.disabled)
    return (
      <p className="status-message error">
        Consultation requests require an active user account.
      </p>
    );
  return <ChooseCase {...props} />;
}

function ChooseCase(props: {
  advocateId: Id<"advocates">;
  advocateName: string;
  slotId: Id<"slots">;
  start: number;
  mode: ConsultationMode;
}) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.cases.listMine,
    {},
    { initialNumItems: 20 },
  );
  const [selected, setSelected] = useState<Id<"cases"> | null>(null);
  return (
    <div className="stack">
      <div className="card">
        <h2>Choose a private case</h2>
        <p className="muted" style={{ marginBlock: 15 }}>
          Only a reviewed summary will be shared. Your original intake stays
          private.
        </p>
        {results.length ? (
          <div className="field">
            <Label htmlFor="booking-case">Case for this consultation</Label>
            <select
              id="booking-case"
              value={selected ?? ""}
              onChange={(event) => {
                const item = results.find(
                  (candidate) => candidate._id === event.target.value,
                );
                setSelected(item?._id ?? null);
              }}
            >
              <option value="">Choose a case</option>
              {results.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.title} · version {item.summaryVersion}
                </option>
              ))}
            </select>
          </div>
        ) : (
          status !== "LoadingFirstPage" && (
            <EmptyState
              title="Save an intake first."
              action={
                <Link href="/workspace/intake" className="btn">
                  Create private intake
                </Link>
              }
            >
              A consultation request needs a saved case with a reviewed summary.
            </EmptyState>
          )
        )}
        <LoadMore status={status} loadMore={loadMore} />
      </div>
      {selected && (
        <ReviewRequest key={selected} {...props} caseId={selected} />
      )}
    </div>
  );
}

function ReviewRequest(props: {
  advocateId: Id<"advocates">;
  advocateName: string;
  slotId: Id<"slots">;
  start: number;
  mode: ConsultationMode;
  caseId: Id<"cases">;
}) {
  const data = useQuery(api.cases.getMine, { caseId: props.caseId });
  if (!data)
    return <p className="loading">Loading your latest private summary…</p>;
  const latest = data.summaries[0];
  return (
    <>
      <details className="card">
        <summary>Edit the summary before requesting</summary>
        <div style={{ marginTop: 20 }}>
          <SummaryEditor
            key={data.case.summaryVersion}
            legalCase={data.case}
            latest={latest}
          />
        </div>
      </details>
      {latest ? (
        <SendRequest
          key={`${props.slotId}:${latest.version}`}
          {...props}
          latest={latest}
        />
      ) : (
        <p className="status-message">
          Save a reviewed summary above before requesting a consultation.
        </p>
      )}
    </>
  );
}

function SendRequest({
  advocateId,
  advocateName,
  slotId,
  start,
  mode,
  caseId,
  latest,
}: {
  advocateId: Id<"advocates">;
  advocateName: string;
  slotId: Id<"slots">;
  start: number;
  mode: ConsultationMode;
  caseId: Id<"cases">;
  latest: Doc<"caseSummaries">;
}) {
  const request = useMutation(api.bookings.request);
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState<Id<"bookings"> | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  async function send() {
    setPending(true);
    setError("");
    try {
      const id = await request({
        slotId,
        caseId,
        summaryVersion: latest.version,
        idempotencyKey,
        consent: {
          recipientAdvocateId: advocateId,
          summaryVersion: latest.version,
          granted: true,
        },
      });
      setBookingId(id);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPending(false);
    }
  }
  if (bookingId)
    return (
      <div className="card">
        <h2>Request saved. Awaiting acceptance.</h2>
        <p className="page-description">
          The advocate has not accepted yet. Track the request and any changes
          in your workspace.
        </p>
        <Link
          className="btn"
          href="/workspace/bookings"
          style={{ marginTop: 20 }}
        >
          View consultation requests
        </Link>
      </div>
    );
  return (
    <article className="card">
      <div className="eyebrow">Review before you share</div>
      <h2>Summary version {latest.version}</h2>
      <p className="muted" style={{ marginBlock: 15 }}>
        Recipient: {advocateName} · {formatTime(start)} IST ·{" "}
        {consultationModeLabel(mode)}
        <br />
        {latest.summary.locale.toUpperCase()} · {latest.summary.domain} ·{" "}
        {urgencyLabel(latest.summary.urgency)} urgency · {latest.source.kind}{" "}
        source
      </p>
      <p className="summary-text" style={{ paddingBlock: 18 }}>
        {latest.summary.text}
      </p>
      {latest.summary.actions.length > 0 && (
        <ul>
          {latest.summary.actions.map((action, index) => (
            <li key={`${index}:${action}`}>{action}</li>
          ))}
        </ul>
      )}
      <Label className="checkbox-line">
        <Input
          type="checkbox"
          checked={consent}
          disabled={pending}
          onChange={(event) => setConsent(event.target.checked)}
        />
        I reviewed this exact summary, version {latest.version}, and consent to
        share it with {advocateName} for this {consultationModeLabel(mode)}{" "}
        consultation request. I understand that acceptance is still required.
      </Label>
      {error && (
        <p
          role="alert"
          className="status-message error"
          style={{ marginTop: 16 }}
        >
          {error}
        </p>
      )}
      <Button
        className="btn"
        style={{ marginTop: 20 }}
        disabled={!consent || pending}
        onClick={send}
      >
        {pending ? "Sending request…" : "Share summary and request slot"}
      </Button>
      <p className="muted small-text" style={{ marginTop: 14 }}>
        Pending requests expire at the earlier of the slot start or 24 hours.
        Your original intake is not sent.
      </p>
    </article>
  );
}
