const PLACEHOLDER_PATTERNS =
  /placeholder|test input|no actionable|could not perform|insufficient details|generic query/i;

export function isLowQualitySubmission(summary = "") {
  return PLACEHOLDER_PATTERNS.test(String(summary));
}

export function humanizeSummary(summary = "", lang = "en") {
  const text = String(summary || "").trim();
  if (!text || isLowQualitySubmission(text)) {
    return lang === "hi"
      ? "आपके विवरण से पर्याप्त कानूनी जानकारी नहीं मिली। विवाद का प्रकार, शामिल पक्ष, महत्वपूर्ण तिथियाँ और उपलब्ध दस्तावेज़ बताएँ — इससे विश्लेषण सटीक होगा।"
      : "We could not identify enough legal details from your submission. Please include the dispute type, involved parties, important dates, and any documents you already have — this helps us give more accurate guidance.";
  }
  return text;
}

export function confidenceFromClassification(classification) {
  if (!classification) return 0;
  if (isLowQualitySubmission(classification.summary)) return 42;
  const u = String(classification.urgency || "medium").toLowerCase();
  if (u === "emergency" || u === "high") return 88;
  if (u === "medium") return 91;
  return 94;
}

export function complexityLabel(urgency, lang = "en") {
  const u = String(urgency || "medium").toLowerCase();
  if (lang === "hi") {
    if (u === "emergency" || u === "high") return "उच्च जटिलता";
    if (u === "medium") return "मध्यम जटिलता";
    return "सामान्य";
  }
  if (u === "emergency" || u === "high") return "High complexity";
  if (u === "medium") return "Medium complexity";
  return "Standard";
}

export function caseStrengthFromUrgency(urgency, lang = "en") {
  const u = String(urgency || "medium").toLowerCase();
  if (lang === "hi") {
    if (u === "low") return "प्रारंभिक — और तथ्यों की पुष्टि आवश्यक";
    if (u === "medium") return "मध्यम — दस्तावेज़ों से मजबूत हो सकता है";
    if (u === "high") return "गंभीर — तुरंत कानूनी सलाह लें";
    return "आपात — तत्काल कार्रवाई की सिफारिश";
  }
  if (u === "low") return "Early stage — strengthen with documented facts";
  if (u === "medium") return "Moderate — can improve with proper documentation";
  if (u === "high") return "Serious — seek legal counsel promptly";
  return "Critical — immediate legal attention recommended";
}

const DOCS_BY_DOMAIN = {
  criminal: ["FIR / complaint copies", "Bail or court orders", "Identity & address proof", "Witness statements if any"],
  civil: ["Contracts or agreements", "Notice / reply correspondence", "Payment proofs", "Court filings if any"],
  family: ["Marriage certificate", "ID proofs", "Prior court orders", "Financial records if applicable"],
  property: ["Title / sale deed", "Registry & tax receipts", "Possession proof", "Survey or map documents"]
};

export function buildAnalysisSections(classification, lang = "en") {
  const hi = lang === "hi";
  const domain = classification?.domain_label || classification?.domain || "General";
  const urgency = classification?.urgency || "medium";
  const actions = Array.isArray(classification?.actions) ? classification.actions : [];
  const domainKey = String(classification?.domain || "civil").toLowerCase();
  const docs = DOCS_BY_DOMAIN[domainKey] || DOCS_BY_DOMAIN.civil;

  const riskFactors =
    urgency === "emergency" || urgency === "high"
      ? hi
        ? ["समय सीमा या सुनवाई नजदीक हो सकती है", "दस्तावेज़ की कमी से कमजोर पक्ष", "विरोधी पक्ष की कार्रवाई संभव"]
        : ["Deadlines or hearings may be near", "Weak position without documents", "Opposing party may act first"]
      : hi
        ? ["अधूरी जानकारी से गलत रणनीति", "बिना वकील सलाह के हस्ताक्षर से जोखिम"]
        : ["Incomplete facts may lead to wrong strategy", "Risk of signing documents without counsel"];

  return {
    caseType: domain,
    keyIssue: humanizeSummary(classification?.summary, lang),
    caseStrength: caseStrengthFromUrgency(urgency, lang),
    recommendedActions: actions.length
      ? actions
      : hi
        ? ["योग्य वकील से परामर्श लें", "सभी दस्तावेज़ एक फ़ोल्डर में रखें", "तिथियों का क्रम लिखें"]
        : ["Consult a qualified advocate", "Organize all documents in one place", "Write a dated timeline of events"],
    riskFactors,
    requiredDocuments: docs
  };
}
