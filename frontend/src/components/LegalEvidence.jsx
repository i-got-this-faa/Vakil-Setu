import ReplySpeech from "./ReplySpeech";

function sourceUrl(value) {
  try { const url = new URL(value); return url.protocol === "https:" ? url.href : undefined; }
  catch { return undefined; }
}

export default function LegalEvidence({ message }) {
  const evidence = message.legalAnswer;
  if (!evidence) return null;
  const hi = message.language === "hi" || message.classification?.response_language === "hi";
  const citations = evidence.citations || [];
  return <div className="legal-evidence">
    <div className="legal-evidence-status">
      <span>{evidence.status === "general_guidance" ? (hi ? "सामान्य एआई मार्गदर्शन" : "General AI guidance") : evidence.status === "answered" ? (hi ? "स्रोतों पर आधारित उत्तर" : "Answer based on sources") : evidence.status === "source_excerpts" ? (hi ? "संबंधित स्रोत अंश" : "Related source excerpts") : (hi ? "पर्याप्त प्रमाण उपलब्ध नहीं" : "Insufficient source evidence")}</span>
    </div>
    <ReplySpeech message={message}/>
    {evidence.status === "general_guidance" && (evidence.warnings || []).map(warning => <p key={warning} className="legal-evidence-warning">{warning}</p>)}
    {citations.length > 0 && <details>
      <summary>{hi ? `स्रोत देखें (${citations.length})` : `View sources (${citations.length})`}</summary>
      {citations.map((citation, index) => <figure key={`${citation.passageId}-${index}`}>
        <figcaption><a href={sourceUrl(citation.source?.url)} target="_blank" rel="noreferrer">{citation.source?.title || "Legal source"}{citation.source?.sectionNumber ? ` · Section ${citation.source.sectionNumber}` : ""}{citation.page ? ` · p. ${citation.page}` : ""}</a></figcaption>
        <blockquote>{citation.quote}{citation.truncated ? " …" : ""}</blockquote>
      </figure>)}
      {(evidence.warnings || []).map(warning => <p key={warning} className="legal-evidence-warning">{warning}</p>)}
    </details>}
    {evidence.generationWarning && <p className="legal-evidence-warning">{hi ? "उत्तर तैयार नहीं हो सका; उपलब्ध स्रोत अंश दिखाए गए हैं।" : evidence.generationWarning}</p>}
  </div>;
}
