export default function ResultCard({ classification }) {
  if (!classification) return null;

  const hi = classification.response_language === "hi";
  const domainBadge = classification.domain_label || classification.domain;
  const urgencyRaw = String(classification.urgency || "").toLowerCase();
  const urgencyBadge = hi
    ? { low: "कम", medium: "मध्यम", high: "उच्च", emergency: "आपातकालीन" }[urgencyRaw] ||
      classification.urgency
    : classification.urgency;

  const urgencyClass =
    urgencyRaw === "emergency" || urgencyRaw === "high"
      ? "urgency-high"
      : urgencyRaw === "medium"
        ? "urgency-medium"
        : "urgency-low";

  const L = hi
    ? {
        title: "एआई मामला विश्लेषण",
        summary: "सारांश",
        actions: "अनुशंसित कदम"
      }
    : {
        title: "AI case analysis",
        summary: "Summary",
        actions: "Recommended next steps"
      };

  return (
    <article className="analysis-panel animate-in">
      <header className="analysis-panel-head">
        <h2 className="analysis-panel-title">{L.title}</h2>
        <div className="analysis-badges">
          <span className="analysis-badge domain">{domainBadge}</span>
          <span className={`analysis-badge urgency ${urgencyClass}`}>{urgencyBadge}</span>
        </div>
      </header>

      <div className="analysis-block">
        <h3 className="analysis-block-label">{L.summary}</h3>
        <p className="analysis-block-text">{classification.summary}</p>
      </div>

      {(classification.actions || []).length > 0 ? (
        <div className="analysis-block">
          <h3 className="analysis-block-label">{L.actions}</h3>
          <ol className="analysis-steps">
            {(classification.actions || []).map((item, index) => (
              <li key={`${item}-${index}`}>
                <span className="step-num" aria-hidden="true">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </article>
  );
}
