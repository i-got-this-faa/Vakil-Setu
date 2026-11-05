export default function CaseHero({ classification, lang = "en" }) {
  if (!classification) return null;

  const hi = lang === "hi";
  const domain = classification.domain_label || classification.domain;
  const urgency = classification.urgency || "medium";

  const L = hi
    ? {
        title: "आपका कानूनी मामला विश्लेषण",
        sub: "आपके दिए गए विवरण पर आधारित प्रारंभिक एआई मार्गदर्शन — यह वकील की सलाह का विकल्प नहीं है।",
        category: "श्रेणी",
        complexity: "प्राथमिकता",
        privacy: "सत्र इतिहास इस टैब में रहता है। विश्लेषण के लिए विवरण सर्वर पर भेजे जाते हैं।"
      }
    : {
        title: "Your Legal Case Analysis",
        sub: "AI-generated preliminary legal guidance based on your submitted case details.",
        category: "Category",
        complexity: "Urgency",
        privacy: "History is saved in this tab. Your description is sent to the server for analysis."
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
          <span className="dash-badge dash-badge--warning">{urgency}</span>
        </div>
      </div>
      <p className="case-hero-privacy">{L.privacy}</p>
    </section>
  );
}
