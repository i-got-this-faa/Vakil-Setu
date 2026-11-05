import { useMemo, useState } from "react";
import AdvocateMatchCard from "./AdvocateMatchCard";

const SORT_OPTIONS = [
  { value: "rating", labelEn: "Top rated", labelHi: "सर्वोच्च रेटिंग" },
  { value: "experience", labelEn: "Most experience", labelHi: "अधिक अनुभव" },
  { value: "name", labelEn: "Name A–Z", labelHi: "नाम A–Z" }
];

export default function AdvocateMatchPanel({
  advocates = [],
  domainLabel,
  onBook,
  onViewProfile,
  lang = "en"
}) {
  const hi = lang === "hi";
  const [sortBy, setSortBy] = useState("rating");
  const [filterOnline, setFilterOnline] = useState(false);
  const [expertiseFilter, setExpertiseFilter] = useState("all");

  const L = hi
    ? {
        title: "अनुशंसित वकील",
        sub: "आपके मामले के प्रकार के अनुसार मिलान",
        sort: "क्रम",
        filter: "फ़िल्टर",
        online: "ऑनलाइन",
        all: "सभी",
        empty: "अभी कोई वकील मेल नहीं मिला। बाद में पुनः देखें या सहायता से संपर्क करें।"
      }
    : {
        title: "Matched advocates",
        sub: "Ranked for your case type",
        sort: "Sort",
        filter: "Filter",
        online: "Online only",
        all: "All",
        empty: "No advocates matched yet. Check back shortly or contact support."
      };

  const expertiseOptions = useMemo(() => {
    const set = new Set();
    advocates.forEach((a) => {
      (a.expertise || []).forEach((e) => set.add(String(e).toLowerCase()));
    });
    return ["all", ...Array.from(set)];
  }, [advocates]);

  const filtered = useMemo(() => {
    let list = [...advocates];
    if (filterOnline) {
      list = list.filter((a) => a.availability !== false);
    }
    if (expertiseFilter !== "all") {
      list = list.filter((a) =>
        (a.expertise || []).some((e) => String(e).toLowerCase() === expertiseFilter)
      );
    }
    list.sort((a, b) => {
      if (sortBy === "rating") return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      if (sortBy === "experience") {
        return (Number(b.experienceYears) || 0) - (Number(a.experienceYears) || 0);
      }
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
    return list;
  }, [advocates, sortBy, filterOnline, expertiseFilter]);

  return (
    <section className="match-panel dash-surface dash-fade-in" aria-labelledby="match-panel-title">
      <header className="match-panel-head">
        <h2 className="match-panel-title" id="match-panel-title">
          {L.title}
        </h2>
        <p className="match-panel-sub">{L.sub}</p>
      </header>

      <div className="match-toolbar" role="toolbar" aria-label={L.filter}>
        <div className="match-toolbar-group">
          <label htmlFor="match-sort">{L.sort}</label>
          <select
            id="match-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {hi ? opt.labelHi : opt.labelEn}
              </option>
            ))}
          </select>
        </div>

        <div className="match-toolbar-group">
          <button
            type="button"
            className={`match-filter-chip ${filterOnline ? "is-active" : ""}`}
            onClick={() => setFilterOnline((v) => !v)}
          >
            {L.online}
          </button>
          {expertiseOptions.map((slug) => (
            <button
              key={slug}
              type="button"
              className={`match-filter-chip ${expertiseFilter === slug ? "is-active" : ""}`}
              onClick={() => setExpertiseFilter(slug)}
            >
              {slug === "all" ? L.all : slug.charAt(0).toUpperCase() + slug.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="match-panel-list">
        {filtered.length === 0 ? (
          <p className="match-panel-empty">{L.empty}</p>
        ) : (
          filtered.map((advocate, i) => (
            <AdvocateMatchCard
              key={advocate.id || advocate.name || i}
              advocate={advocate}
              index={advocates.indexOf(advocate)}
              domainLabel={domainLabel}
              onBook={onBook}
              onViewProfile={onViewProfile}
              lang={lang}
            />
          ))
        )}
      </div>
    </section>
  );
}
