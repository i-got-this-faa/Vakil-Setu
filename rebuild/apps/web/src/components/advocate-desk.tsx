"use client";

import { Button, Input, Textarea, Label } from "@vakil/ui";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@vakil/backend/api";
import type { Doc } from "@vakil/backend/data-model";
import {
  CONSULTATION_MODES,
  LEGAL_DOMAINS,
  PILOT_LOCALES,
  type ConsultationMode,
  type LegalDomain,
  type PilotLocale,
} from "@vakil/domain";
import { RequireRole, useAccount } from "./workspace-gate";
import { errorMessage } from "@/lib/errors";
import { CredentialsPanel } from "./credentials";
import { EmptyState, consultationModeLabel, formatTime } from "./shared";
import { useLocale } from "./locale";

function isConsultationMode(value: unknown): value is ConsultationMode {
  return value === "phone" || value === "video" || value === "in_person";
}

export function AdvocateDesk() {
  return (
    <>
      <div className="workspace-heading">
        <div>
          <div className="eyebrow">Your professional workspace</div>
          <h1>Advocate desk.</h1>
          <p className="page-description">
            Submit a profile and private credential evidence for approval.
            Publish slots after approval and respond to actual requests.
          </p>
        </div>
        <Link href="/workspace/bookings" className="btn secondary">
          Consultation requests
        </Link>
      </div>
      <RequireRole role="advocate">
        <AdvocateProfile />
      </RequireRole>
    </>
  );
}

function AdvocateProfile() {
  const profile = useQuery(api.advocates.myProfile, {});
  if (profile === undefined)
    return <p className="loading">Loading advocate application…</p>;
  return (
    <div className="stack">
      {profile && (
        <div className="card">
          <div className="actions" style={{ justifyContent: "space-between" }}>
            <h2>Application status</h2>
            <span className="badge neutral">
              {profile.application.kind} · revision {profile.revision}
            </span>
          </div>
          <p className="muted" style={{ marginTop: 14 }}>
            {profile.application.kind === "pending"
              ? "Your current profile awaits private credential review and administrator approval."
              : profile.application.reason}
          </p>
          <p className="muted" style={{ marginTop: 10 }}>
            Offered modes:{" "}
            {profile.consultationModes.length
              ? profile.consultationModes
                  .map((mode) => consultationModeLabel(mode))
                  .join(" · ")
              : "None listed — update the application below to offer phone, video, or in-person consultations."}
          </p>
        </div>
      )}
      <ProfileForm key={profile?.revision ?? 0} profile={profile} />
      {profile && (
        <>
          <CredentialsPanel />
          <SlotsPanel
            key={profile.consultationModes.join(",")}
            approved={profile.application.kind === "approved"}
            modes={profile.consultationModes}
          />
        </>
      )}
    </div>
  );
}

function ProfileForm({ profile }: { profile: Doc<"advocates"> | null }) {
  const account = useAccount();
  const { messages } = useLocale();
  const upsert = useMutation(api.advocates.upsert);
  const [name, setName] = useState(
    profile?.displayName ?? account?.displayName ?? "",
  );
  const [city, setCity] = useState(profile?.city ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [barRegistration, setBarRegistration] = useState(
    profile?.barRegistration ?? "",
  );
  const [yearsExperience, setYearsExperience] = useState(
    profile?.yearsExperience ?? 0,
  );
  const [domains, setDomains] = useState<LegalDomain[]>(profile?.domains ?? []);
  const [locales, setLocales] = useState<PilotLocale[]>(
    profile?.locales ?? ["en"],
  );
  const [modes, setModes] = useState<ConsultationMode[]>(
    profile?.consultationModes.filter(isConsultationMode) ?? [],
  );
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await upsert({
        displayName: name.trim(),
        city: city.trim(),
        bio: bio.trim(),
        barRegistration: barRegistration.trim(),
        yearsExperience,
        domains,
        locales,
        consultationModes: modes,
      });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPending(false);
    }
  }
  return (
    <article className="card">
      <h2>
        {profile ? "Edit your application" : "Create your advocate application"}
      </h2>
      <p className="muted" style={{ marginBlock: 14 }}>
        Every submission creates a new revision and requires approval again.
        Editing an approved profile removes it from discovery and may cancel
        live bookings.
      </p>
      <form className="form-stack" onSubmit={submit}>
        <div className="card-grid">
          <div className="field">
            <Label htmlFor="advocate-name">
              {messages.profile.fullNameLabel}
            </Label>
            <Input
              id="advocate-name"
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="field">
            <Label htmlFor="advocate-city">City</Label>
            <Input
              id="advocate-city"
              required
              maxLength={100}
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </div>
          <div className="field">
            <Label htmlFor="advocate-bar">
              {messages.profile.barCouncilNumberLabel}
            </Label>
            <Input
              id="advocate-bar"
              required
              maxLength={150}
              value={barRegistration}
              onChange={(event) => setBarRegistration(event.target.value)}
            />
          </div>
          <div className="field">
            <Label htmlFor="advocate-years">
              {messages.profile.experienceYearsLabel}
            </Label>
            <Input
              id="advocate-years"
              type="number"
              required
              min={0}
              max={80}
              step={1}
              value={yearsExperience}
              onChange={(event) =>
                setYearsExperience(event.target.valueAsNumber)
              }
            />
          </div>
        </div>
        <div className="field">
          <Label htmlFor="advocate-bio">{messages.profile.bioLabel}</Label>
          <Textarea
            id="advocate-bio"
            required
            maxLength={2000}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
          />
        </div>
        <fieldset>
          <legend className="small-text">
            {messages.profile.practiceAreasLabel}
          </legend>
          <div className="actions" style={{ marginTop: 12 }}>
            {LEGAL_DOMAINS.filter((domain) => domain !== "unknown").map(
              (domain) => (
                <Label className="checkbox-line" key={domain}>
                  <Input
                    type="checkbox"
                    checked={domains.includes(domain)}
                    onChange={(event) =>
                      setDomains(
                        event.target.checked
                          ? [...domains, domain]
                          : domains.filter((value) => value !== domain),
                      )
                    }
                  />
                  {domain}
                </Label>
              ),
            )}
          </div>
        </fieldset>
        <fieldset>
          <legend className="small-text">
            {messages.profile.languagesSpokenLabel}
          </legend>
          <div className="actions" style={{ marginTop: 12 }}>
            {PILOT_LOCALES.map((locale) => (
              <Label className="checkbox-line" key={locale}>
                <Input
                  type="checkbox"
                  checked={locales.includes(locale)}
                  onChange={(event) =>
                    setLocales(
                      event.target.checked
                        ? [...locales, locale]
                        : locales.filter((value) => value !== locale),
                    )
                  }
                />
                {locale === "en"
                  ? "English"
                  : locale === "hi"
                    ? "हिन्दी"
                    : "ਪੰਜਾਬੀ"}
              </Label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="small-text">Consultation modes offered</legend>
          <div className="actions" style={{ marginTop: 12 }}>
            {CONSULTATION_MODES.map((mode) => (
              <Label className="checkbox-line" key={mode}>
                <Input
                  type="checkbox"
                  checked={modes.includes(mode)}
                  onChange={(event) =>
                    setModes(
                      event.target.checked
                        ? [...modes, mode]
                        : modes.filter((value) => value !== mode),
                    )
                  }
                />
                {consultationModeLabel(mode)}
              </Label>
            ))}
          </div>
        </fieldset>
        <small>
          Choose at least one mode. Published slots must use an offered mode,
          and the choice is reviewed before approval.
        </small>
        <Label className="checkbox-line">
          <Input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          I confirm this profile is accurate and understand that submission
          requires administrator approval again.
        </Label>
        {error && (
          <p role="alert" className="status-message error">
            {error}
          </p>
        )}
        <Button
          className="btn"
          disabled={
            pending ||
            !acknowledged ||
            !domains.length ||
            !locales.length ||
            !modes.length
          }
        >
          {pending ? "Submitting application…" : "Submit profile for review"}
        </Button>
      </form>
    </article>
  );
}

function SlotsPanel({
  approved,
  modes,
}: {
  approved: boolean;
  modes: ConsultationMode[];
}) {
  const slots = useQuery(api.slots.mine, {});
  const publish = useMutation(api.slots.publish);
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState(30);
  const [mode, setMode] = useState<ConsultationMode | "">(modes[0] ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const timestamp = start ? new Date(start).getTime() : NaN;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(timestamp) || !isConsultationMode(mode)) return;
    setPending(true);
    setMessage("");
    try {
      await publish({
        slots: [
          {
            start: timestamp,
            durationMinutes: duration,
            consultationMode: mode,
          },
        ],
      });
      setStart("");
      setMessage("Availability published.");
    } catch (failure) {
      setMessage(errorMessage(failure));
    } finally {
      setPending(false);
    }
  }
  return (
    <article className="card">
      <h2>Consultation availability</h2>
      <p className="muted" style={{ marginBlock: 14 }}>
        Publish future slots between 15 and 120 minutes, within the next 90
        days. Overlap and live reservations are checked by the service.
      </p>
      {!approved && (
        <p className="status-message" style={{ marginBottom: 18 }}>
          Publishing requires an approved profile.
        </p>
      )}
      {!modes.length && (
        <p className="status-message" style={{ marginBottom: 18 }}>
          No consultation mode is offered yet. Update the application above to
          offer at least one mode before publishing.
        </p>
      )}
      <form className="form-stack" onSubmit={submit}>
        <div className="card-grid">
          <div className="field">
            <Label htmlFor="slot-start">
              Start time (your device’s local time zone)
            </Label>
            <Input
              id="slot-start"
              type="datetime-local"
              required
              disabled={!approved}
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
            <small>
              {Number.isFinite(timestamp)
                ? `Displayed in IST: ${formatTime(timestamp)}`
                : "Choose a start time; verify the IST conversion before publishing."}
            </small>
          </div>
          <div className="field">
            <Label htmlFor="slot-duration">Duration in minutes</Label>
            <Input
              id="slot-duration"
              type="number"
              min={15}
              max={120}
              step={1}
              required
              disabled={!approved}
              value={duration}
              onChange={(event) => setDuration(event.target.valueAsNumber)}
            />
          </div>
        </div>
        <div className="field">
          <Label htmlFor="slot-mode">Consultation mode</Label>
          <select
            id="slot-mode"
            required
            disabled={!approved || !modes.length}
            value={mode}
            onChange={(event) => {
              if (isConsultationMode(event.target.value))
                setMode(event.target.value);
            }}
          >
            {modes.map((value) => (
              <option key={value} value={value}>
                {consultationModeLabel(value)}
              </option>
            ))}
          </select>
          <small>
            Only modes offered by the reviewed profile can be published.
          </small>
        </div>
        <Button
          className="btn secondary"
          disabled={
            !approved ||
            !modes.length ||
            !isConsultationMode(mode) ||
            pending ||
            !Number.isFinite(timestamp)
          }
        >
          {pending ? "Publishing…" : "Publish this slot"}
        </Button>
      </form>
      {message && (
        <p className="status-message" role="status" style={{ marginTop: 15 }}>
          {message}
        </p>
      )}
      {slots === undefined ? (
        <p className="loading">Loading availability…</p>
      ) : slots.length ? (
        slots.map((slot) => <SlotRow key={slot._id} slot={slot} />)
      ) : (
        <div style={{ marginTop: 24 }}>
          <EmptyState title="No availability published.">
            Approved advocates can publish consultation times here.
          </EmptyState>
        </div>
      )}
    </article>
  );
}

function SlotRow({ slot }: { slot: Doc<"slots"> }) {
  const remove = useMutation(api.slots.remove);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function removeSlot() {
    setPending(true);
    try {
      await remove({ slotId: slot._id });
    } catch (failure) {
      setError(errorMessage(failure));
      setPending(false);
    }
  }
  return (
    <div className="list-row">
      <div>
        <strong>{formatTime(slot.start)} IST</strong>
        <p className="muted small-text">
          {slot.durationMinutes} minutes ?{" "}
          {slot.consultationMode.replaceAll("_", " ")} ·{" "}
          {consultationModeLabel(slot.consultationMode)} ·{" "}
          {slot.reservation.kind}
        </p>
        {error && (
          <p className="status-message error" role="alert">
            {error}
          </p>
        )}
      </div>
      <Button
        className="btn secondary small"
        disabled={slot.reservation.kind !== "free" || pending}
        onClick={removeSlot}
      >
        {pending
          ? "Removing…"
          : slot.reservation.kind === "reserved"
            ? "Reserved slot"
            : "Remove free slot"}
      </Button>
    </div>
  );
}
