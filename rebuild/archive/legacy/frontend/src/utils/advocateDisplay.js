/** Diverse placeholder portraits (rotate by card index until real photos are wired). */
const ADVOCATE_PLACEHOLDER_PHOTOS = [
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=480&h=480&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=480&h=480&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=480&h=480&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=480&h=480&q=80",
  "https://images.unsplash.com/photo-1580894732444-1fcb9402d938?auto=format&fit=crop&w=480&h=480&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=480&h=480&q=80"
];

export function advocatePhotoUrl(index = 0) {
  const i = Math.abs(Number(index) || 0) % ADVOCATE_PLACEHOLDER_PHOTOS.length;
  return ADVOCATE_PLACEHOLDER_PHOTOS[i];
}

export const ADVOCATE_PLACEHOLDER_PHOTO = ADVOCATE_PLACEHOLDER_PHOTOS[0];

const EXPERTISE_LABELS = {
  criminal: { en: "Criminal", hi: "आपराधिक" },
  civil: { en: "Civil", hi: "दीवानी" },
  family: { en: "Family", hi: "पारिवारिक" },
  property: { en: "Property", hi: "संपत्ति" }
};

export function cleanAdvocateName(name) {
  if (!name) return "Advocate";
  let n = String(name).trim();
  n = n.replace(/^advocate\s+/i, "");
  n = n.replace(/\s+\d+(\.\d+)?\s*(\||·).*/i, "").trim();
  n = n.replace(/\s+\d+(\.\d+)?\s*$/i, "").trim();
  if (!/^adv\.?\s/i.test(n) && !/^advocate\s/i.test(n)) {
    return `Adv. ${n}`;
  }
  return n.replace(/^advocate\s/i, "Adv. ");
}

export function formatExpertise(expertise = [], lang = "en") {
  const key = lang === "hi" ? "hi" : "en";
  return expertise.map((e) => {
    const slug = String(e || "").toLowerCase();
    return EXPERTISE_LABELS[slug]?.[key] || slug;
  });
}

export function formatRating(rating) {
  const n = Number(rating);
  if (Number.isNaN(n) || n <= 0) return "—";
  return n.toFixed(1);
}
