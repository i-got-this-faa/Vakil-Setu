import { useState } from "react";
import { buildAnalysisSections } from "../../utils/analysisDisplay";

const ICONS = {
  caseType: "📋",
  keyIssue: "⚡",
  strength: "📊",
  actions: "✓",
  risk: "⚠",
  docs: "📎"
};

function InsightBlock({ icon, title, children, variant = "default", collapsible = false, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`insight-block insight-block--${variant}`}>
      <button
        type="button"
        className="insight-block-head"
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
        aria-expanded={collapsible ? open : undefined}
        disabled={!collapsible}
      >
        <span className="insight-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="insight-title">{title}</span>
        {collapsible ? <span className="insight-chevron">{open ? "−" : "+"}</span> : null}
      </button>
      {(!collapsible || open) ? <div className="insight-body">{children}</div> : null}
    </div>
  );
}

export default function AnalysisDashboard({ classification, lang = "en" }) {
  if (!classification) return null;

  const hi = lang === "hi";
  const sections = buildAnalysisSections(classification, lang);

  const L = hi
    ? {
        title: "एआई इनसाइट्स",
        disclaimer: "यह सामान्य जानकारी है, वकील की सलाह नहीं। निर्णय से पहले योग्य वकील से बात करें।",
        caseType: "मामले का प्रकार",
        keyIssue: "मुख्य मुद्दा",
        strength: "मामले की स्थिति",
        actions: "अनुशंसित कदम",
        risk: "जोखिम कारक",
        docs: "आवश्यक दस्तावेज़"
      }
    : {
        title: "AI insights",
        disclaimer: "General information only — not a substitute for licensed legal advice.",
        caseType: "Case type",
        keyIssue: "Key issue",
        strength: "Case strength",
        actions: "Recommended actions",
        risk: "Risk factors",
        docs: "Required documents"
      };

  return (
    <section className="analysis-dashboard dash-surface dash-fade-in" id="analysis-panel">
      <header className="analysis-dashboard-head">
        <div>
          <h2 className="analysis-dashboard-title">{L.title}</h2>
          <p className="analysis-dashboard-disclaimer">{L.disclaimer}</p>
        </div>
        <span className="dash-ai-pill">Vakil AI</span>
      </header>

      <div className="insight-grid">
        <InsightBlock icon={ICONS.caseType} title={L.caseType} variant="primary">
          <p className="insight-text insight-text--lead">{sections.caseType}</p>
        </InsightBlock>

        <InsightBlock icon={ICONS.keyIssue} title={L.keyIssue} variant="accent">
          <p className="insight-text">{sections.keyIssue}</p>
        </InsightBlock>

        <InsightBlock icon={ICONS.strength} title={L.strength}>
          <p className="insight-text">{sections.caseStrength}</p>
        </InsightBlock>

        <InsightBlock icon={ICONS.actions} title={L.actions}>
          <ul className="insight-list">
            {sections.recommendedActions.map((item, i) => (
              <li key={`${i}-${item.slice(0, 12)}`}>
                <span className="insight-list-num">{i + 1}</span>
                {item}
              </li>
            ))}
          </ul>
        </InsightBlock>

        <InsightBlock icon={ICONS.risk} title={L.risk} variant="warn" collapsible defaultOpen>
          <ul className="insight-list insight-list--plain">
            {sections.riskFactors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </InsightBlock>

        <InsightBlock icon={ICONS.docs} title={L.docs} collapsible defaultOpen>
          <ul className="insight-doc-list">
            {sections.requiredDocuments.map((doc) => (
              <li key={doc}>
                <span className="doc-dot" aria-hidden="true" />
                {doc}
              </li>
            ))}
          </ul>
        </InsightBlock>
      </div>
    </section>
  );
}
