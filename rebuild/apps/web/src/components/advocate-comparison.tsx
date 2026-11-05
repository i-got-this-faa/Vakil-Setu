"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@vakil/backend/api";
import type { Id } from "@vakil/backend/data-model";
import { getLanguage } from "@vakil/i18n";
import { Button } from "@vakil/ui";
import { useLocale } from "./locale";
import { getFeatureCopy } from "@/lib/feature-copy";
import { consultationModeLabel, formatTime } from "./shared";

export function RatingSummary({ rating }: { rating: { average: number | null; count: number } }) {
  const { locale } = useLocale();
  const copy = getFeatureCopy(locale);
  return <p className="rating-summary">{rating.count && rating.average !== null
    ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(rating.average)} / 5 · ${new Intl.NumberFormat(locale).format(rating.count)} ${copy.rating}`
    : copy.noReviews}</p>;
}

export function AdvocateComparison({ selected, onRemove, onClear }: {
  selected: Id<"advocates">[]; onRemove: (id: Id<"advocates">) => void; onClear: () => void;
}) {
  const { locale, copy: product } = useLocale();
  const copy = getFeatureCopy(locale);
  const profiles = useQuery(api.advocates.comparePublic, { advocateIds: selected });
  if (!selected.length) return null;
  return <section className="comparison-panel card" aria-labelledby="comparison-title">
    <div className="actions"><h2 id="comparison-title">{copy.compare}</h2><Button type="button" className="btn secondary small" onClick={onClear}>{copy.clear}</Button></div>
    <p role="status" className="small-text">{copy.selected}: {selected.length} / 3</p>
    <p className="muted small-text">{copy.ratingCaveat}</p>
    {profiles === undefined ? <p role="status">{copy.loading}</p> : <div className="comparison-scroll" tabIndex={0} role="region" aria-label={copy.compare}>
      <table className="comparison-table"><caption className="sr-only">{copy.compareHint}</caption><thead><tr><th scope="col">{copy.compare}</th>{profiles.map(({ advocateId, profile }) => <th scope="col" key={advocateId}><div>{profile ? <Link href={`/discover/${advocateId}`}>{profile.displayName}</Link> : copy.unavailable}</div><Button type="button" className="btn secondary small" onClick={() => onRemove(advocateId)} aria-label={`${copy.remove}: ${profile?.displayName ?? copy.unavailable}`}>{copy.remove}</Button></th>)}</tr></thead>
      <tbody>{[
        { label: copy.expertise, value: (profile: NonNullable<(typeof profiles)[number]["profile"]>) => profile.domains.map(domain => product.domainLabels[domain]).join(", ") },
        { label: copy.languages, value: (profile: NonNullable<(typeof profiles)[number]["profile"]>) => profile.locales.map(language => getLanguage(language)?.nativeName ?? language).join(", ") },
        { label: copy.location, value: (profile: NonNullable<(typeof profiles)[number]["profile"]>) => profile.city },
        { label: copy.modes, value: (profile: NonNullable<(typeof profiles)[number]["profile"]>) => profile.consultationModes.map(consultationModeLabel).join(", ") },
        { label: copy.availability, value: (profile: NonNullable<(typeof profiles)[number]["profile"]>) => profile.slots.length ? profile.slots.slice(0, 3).map(slot => `${formatTime(slot.start, getLanguage(locale)?.code)} · ${consultationModeLabel(slot.consultationMode)}`).join("\n") : copy.noSlots },
      ].map(row => <tr key={row.label}><th scope="row">{row.label}</th>{profiles.map(({ advocateId, profile }) => <td key={advocateId}>{profile ? row.value(profile) : "—"}</td>)}</tr>)}
      <tr><th scope="row">{copy.rating}</th>{profiles.map(({ advocateId, profile }) => <td key={advocateId}>{profile ? <RatingSummary rating={profile.rating} /> : "—"}</td>)}</tr></tbody></table>
    </div>}
  </section>;
}
