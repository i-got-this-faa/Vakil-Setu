/**
 * Maps LLM or user-facing domain labels to canonical slugs stored in Advocate.expertise
 * (same vocabulary as seed data and scrapeAdvocates detectDomains).
 */
export function normalizeLegalDomainForMatch(raw) {
  const t = String(raw || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .trim();
  if (!t) return "civil";

  if (
    /\bcriminal\b|\bcrime\b|\barrest\b|\bdetention\b|\bpolice\b|\bfir\b|\bipc\b|\bbail\b/.test(t)
  ) {
    return "criminal";
  }
  if (
    /\bfamily\b|\bdivorce\b|\bcustody\b|\bmatrimonial\b|\balimony\b|\bdomestic\b|\bmarriage\b/.test(
      t
    )
  ) {
    return "family";
  }
  if (/\bproperty\b|\breal\s*estate\b|\bland\b|\btenant\b|\bregistry\b|\brent\b/.test(t)) {
    return "property";
  }
  if (/\bcivil\b|\bcontract\b|\bconsumer\b|\blitigation\b/.test(t)) {
    return "civil";
  }

  if (t.includes("criminal")) return "criminal";
  if (t.includes("family")) return "family";
  if (t.includes("property")) return "property";

  return "civil";
}
