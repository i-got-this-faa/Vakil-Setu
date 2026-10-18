import {
  advocatePhotoUrl,
  cleanAdvocateName,
  formatExpertise,
  formatRating
} from "../utils/advocateDisplay";

export default function AdvocateCard({ advocate, onSelect, lang = "en", index = 0 }) {
  const hi = lang === "hi";
  const name = cleanAdvocateName(advocate.name);
  const expertise = formatExpertise(advocate.expertise, lang);
  const rating = formatRating(advocate.rating);
  const years = advocate.experienceYears ?? 0;

  return (
    <article
      className="advocate-card animate-in"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <div className="advocate-card-photo-wrap">
        <img
          className="advocate-card-photo"
          src={advocatePhotoUrl(index)}
          alt={name}
          width={320}
          height={320}
          loading="lazy"
          decoding="async"
        />
        <span className="advocate-card-rating" aria-label={`Rating ${rating}`}>
          ★ {rating}
        </span>
      </div>
      <div className="advocate-card-body">
        <h4 className="advocate-card-name">{name}</h4>
        <div className="advocate-card-chips">
          {expertise.map((label) => (
            <span key={label} className="advocate-chip">
              {label}
            </span>
          ))}
        </div>
        <p className="advocate-card-meta">
          {hi ? `${years} वर्ष अनुभव` : `${years} yrs experience`}
          {advocate.languages?.length ? (
            <span className="advocate-card-lang">
              · {advocate.languages.slice(0, 2).join(", ")}
            </span>
          ) : null}
        </p>
        <button type="button" className="advocate-card-book" onClick={() => onSelect(advocate)}>
          {hi ? "बुक करें" : "Book consultation"}
        </button>
      </div>
    </article>
  );
}
