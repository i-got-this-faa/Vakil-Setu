import {
  complexityLabel,
  confidenceFromClassification,
  isLowQualitySubmission
} from "../../utils/analysisDisplay";

export default function CaseHero({ classification, lang = "en" }) {
  if (!classification) return null;

  const hi = lang === "hi";
  const confidence = confidenceFromClassification(classification);
  const domain = classification.domain_label || classification.domain;
  const complexity = complexityLabel(classification.urgency, lang);
  const lowQuality = isLowQualitySubmission(classification.summary);

  const L = hi
    ? {
        title: "आपका कानूनी मामला विश्लेषण",
        sub: "आपके दिए गए विवरण पर आधारित प्रारंभिक एआई मार्गदर्शन — यह वकील की सलाह का विकल्प नहीं है।",
        category: "श्रेणी",
        complexity: "जटिलता",
        confidence: "एआई विश्वास",
        privacy: "🔒 एन्क्रिप्टेड सत्र · डेटा इस ब्राउज़र में सुरक्षित"
      }
    : {
        title: "Your Legal Case Analysis",
        sub: "AI-generated preliminary legal guidance based on your submitted case details.",
        category: "Category",
        complexity: "Complexity",
        confidence: "AI confidence",
        privacy: "🔒 Encrypted session · Data stays in this browser"
      };

  return (
    <section className="case-hero dash-fade-in">
      <div className="case-hero-main">
        <p className="case-hero-eyebrow">{hi ? "केस इंटेलिजेंस" : "Case intelligence"}</p>
        <h1 className="case-hero-title">{L.title}</h1>
        <p className="case-hero-sub">{L.sub}</p>
      </div>
      <div className="case-hero-meta">
        <div className="case-hero-stat">
          <span className="case-hero-stat-label">{L.category}</span>
          <span className="dash-badge dash-badge--primary">{domain}</span>
        </div>
        <div className="case-hero-stat">
          <span className="case-hero-stat-label">{L.complexity}</span>
          <span className="dash-badge dash-badge--warning">{complexity}</span>
        </div>
        <div className="case-hero-stat">
          <span className="case-hero-stat-label">{L.confidence}</span>
          <span className={`dash-badge ${lowQuality ? "dash-badge--muted" : "dash-badge--success"}`}>
            {confidence}%
          </span>
        </div>
      </div>
      <p className="case-hero-privacy">{L.privacy}</p>
    </section>
  );
}
