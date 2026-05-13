export default function ResultCard({ classification }) {
  if (!classification) return null;

  const hi = classification.response_language === "hi";
  const domainBadge = classification.domain_label || classification.domain;
  const urgencyRaw = String(classification.urgency || "").toLowerCase();
  const urgencyBadge = hi
    ? { low: "कम", medium: "मध्यम", high: "उच्च", emergency: "आपातकालीन" }[urgencyRaw] ||
      classification.urgency
    : classification.urgency;
  const L = hi
    ? {
        title: "एआई मामला विश्लेषण",
        summary: "सारांश",
        actions: "अनुशंसित कदम"
      }
    : {
        title: "AI case analysis",
        summary: "Summary",
        actions: "Recommended actions"
      };

  return (
    <div className="card animate-in">
      <h3>{L.title}</h3>
      <div className="badge-row">
        <span className="badge">{domainBadge}</span>
        <span className="badge warn">{urgencyBadge}</span>
      </div>
      <div className="analysis-summary">
        <strong>{L.summary}</strong>
        <p>{classification.summary}</p>
      </div>
      <strong>{L.actions}</strong>
      <ul>
        {(classification.actions || []).map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
