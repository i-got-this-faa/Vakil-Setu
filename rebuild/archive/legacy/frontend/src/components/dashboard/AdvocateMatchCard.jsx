import {
  advocatePhotoUrl,
  cleanAdvocateName,
  formatExpertise,
  formatRating
} from "../../utils/advocateDisplay";

function recommendationReason(advocate, domainLabel, lang) {
  const exp = formatExpertise(advocate.expertise || [], lang).slice(0, 2).join(", ");
  const domain = domainLabel || exp || "your case type";
  if (lang === "hi") {
    return `यह वकील ${domain} मामलों में अनुभवी है और परामर्श के लिए उपलब्ध है।`;
  }
  return `Recommended because this advocate handles ${domain} matters and is available for consultation within 24 hours.`;
}

export default function AdvocateMatchCard({
  advocate,
  index,
  domainLabel,
  onBook,
  onViewProfile,
  lang = "en"
}) {
  const hi = lang === "hi";
  const name = cleanAdvocateName(advocate.name);
  const expertise = formatExpertise(advocate.expertise, lang);
  const rating = formatRating(advocate.rating);
  const years = advocate.experienceYears ?? 0;
  const langs = advocate.languages?.length ? advocate.languages.join(", ") : "Hindi, English";
  const online = advocate.availability !== false;

  return (
    <article className="match-card dash-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
      <div className="match-card-top">
        <div className="match-card-photo-wrap">
          <img src={advocatePhotoUrl(index)} alt="" className="match-card-photo" loading="lazy" />
          {online ? <span className="match-online">Online</span> : null}
        </div>
        <div className="match-card-head">
          <div className="match-card-name-row">
            <h3 className="match-card-name">{name}</h3>
            <span className="match-verified">Verified</span>
          </div>
          <div className="match-card-rating-row">
            <span className="match-rating">★ {rating}</span>
            <span className="match-reviews">50+ reviews</span>
          </div>
          <div className="match-chips">
            {expertise.map((label) => (
              <span key={label} className="match-chip">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <ul className="match-meta-list">
        <li>
          <span>Experience</span>
          <strong>{years} yrs</strong>
        </li>
        <li>
          <span>Languages</span>
          <strong>{langs}</strong>
        </li>
        <li>
          <span>Consult</span>
          <strong>Video / Phone</strong>
        </li>
      </ul>

      <p className="match-reason">{recommendationReason(advocate, domainLabel, lang)}</p>

      <div className="match-card-actions">
        <button type="button" className="dash-btn dash-btn--primary" onClick={() => onBook(advocate)}>
          Book consultation
        </button>
        <button type="button" className="dash-btn dash-btn--ghost" onClick={() => onViewProfile(advocate)}>
          View profile
        </button>
      </div>
    </article>
  );
}
