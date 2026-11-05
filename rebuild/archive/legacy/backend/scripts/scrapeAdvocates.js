import dotenv from "dotenv";
import * as cheerio from "cheerio";
import { connectDB } from "../src/config/db.js";
import Advocate from "../src/models/Advocate.js";

dotenv.config();

const DOMAIN_KEYWORDS = {
  criminal: ["criminal", "bail", "fir", "police", "cyber crime"],
  civil: ["civil", "contract", "consumer", "dispute", "litigation"],
  family: ["family", "divorce", "custody", "marriage", "alimony"],
  property: ["property", "land", "tenant", "rent", "registry", "real estate"]
};

const languageTokens = [
  "Hindi",
  "English",
  "Urdu",
  "Punjabi",
  "Marathi",
  "Tamil",
  "Telugu",
  "Kannada",
  "Bengali"
];

const GENERIC_TITLE_PATTERNS = [
  /\blawyers?\s+in\b/i,
  /\badvocates?\s+in\b/i,
  /\bbest\s+lawyers?\b/i,
  /\btop\s+lawyers?\b/i,
  /\bcase\s+lawyers?\b/i
];

function isGenericListingTitle(name = "") {
  return GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(name));
}

function cleanPersonName(name = "") {
  return String(name)
    .replace(/\s+/g, " ")
    .replace(/^mr\.?\s|^mrs\.?\s|^ms\.?\s/gi, "")
    .trim();
}

/** e.g. /advocate-anuj-sawhney -> "Anuj Sawhney" */
function nameFromAdvocateSlug(profileUrl) {
  try {
    const pathname = new URL(profileUrl).pathname.replace(/\/$/, "");
    const seg = pathname.split("/").pop() || "";
    if (!/^advocate-[a-z0-9-]+$/i.test(seg)) return "";
    const words = seg.replace(/^advocate-/i, "").split("-").filter(Boolean);
    if (!words.length) return "";
    return words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  } catch {
    return "";
  }
}

function scoreLawratoLinkText(text) {
  const t = String(text || "").trim();
  if (!t || /^view profile$/i.test(t)) return -1;
  if (/^advocate\b/i.test(t) && t.length >= 10) return 100;
  if (t.length >= 18) return 40;
  if (t.length >= 8) return 15;
  return 5;
}

/**
 * LawRato listing pages: cards link to /advocate-slug; name often on same href as heading text.
 */
function parseLawratoDomListings($, listingPageUrl) {
  const byProfile = new Map();
  $("a[href*='advocate-']").each((_i, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const abs = toAbsoluteUrl(listingPageUrl, href).split("#")[0];
    let pathname;
    try {
      pathname = new URL(abs).pathname.replace(/\/$/, "");
    } catch {
      return;
    }
    if (!/^\/advocate-[a-z0-9-]+$/i.test(pathname)) return;

    const linkText = $(el).text().replace(/\s+/g, " ").trim();
    const prev = byProfile.get(abs);
    const sc = scoreLawratoLinkText(linkText);
    const oldSc = prev ? scoreLawratoLinkText(prev.nameRaw) : -2;
    if (sc > oldSc) byProfile.set(abs, { nameRaw: linkText, profileUrl: abs, anchorEl: el });
  });

  const rows = [];
  for (const { profileUrl, nameRaw, anchorEl } of byProfile.values()) {
    let name = cleanPersonName(nameRaw);
    if (!name || name.length < 2) name = nameFromAdvocateSlug(profileUrl);
    if (!name || isGenericListingTitle(name)) continue;

    const nameLink = anchorEl ? $(anchorEl) : $("a[href*='advocate-']").first();

    let cardText = "";
    let walk = nameLink.parent();
    for (let depth = 0; depth < 12 && walk.length; depth += 1) {
      const t = walk.text().replace(/\s+/g, " ");
      if (t.includes("Experience") || t.includes("user ratings") || t.includes("Practice area")) {
        cardText = t;
        break;
      }
      walk = walk.parent();
    }
    if (!cardText) {
      cardText = nameLink.closest("li, article, div").text().replace(/\s+/g, " ");
    }

    const expMatch = cardText.match(/(\d+)\s*years?\s*experience/i);
    const experienceYears = expMatch ? Number(expMatch[1]) : 0;

    let rating = 0;
    const ratingMatches = [...cardText.matchAll(/\b([0-4](?:\.\d)?|5(?:\.0)?)\b/g)];
    for (const m of ratingMatches) {
      const n = Number(m[1]);
      if (n >= 3 && n <= 5) {
        rating = n;
        break;
      }
    }

    const expertise = detectDomains(`${cardText} ${listingPageUrl}`);

    rows.push({
      name,
      expertise,
      rating: Math.max(0, Math.min(5, rating || 4)),
      experienceYears: Math.max(0, experienceYears || 3),
      availability: true,
      languages: ["English", "Hindi"],
      profileUrl
    });
  }
  return rows;
}

function collectLdPersonNodes(obj, out = []) {
  if (!obj || typeof obj !== "object") return out;
  if (Array.isArray(obj)) {
    obj.forEach((item) => collectLdPersonNodes(item, out));
    return out;
  }
  if (obj["@graph"]) {
    collectLdPersonNodes(obj["@graph"], out);
  }
  const types = obj["@type"];
  const typeList = Array.isArray(types) ? types : types ? [types] : [];
  const isPerson = typeList.some((t) => String(t).toLowerCase().includes("person"));
  const urlRaw = obj.url || obj["@id"] || "";
  const urlStr = String(urlRaw);
  if (
    isPerson &&
    obj.name &&
    /lawrato\.com\/advocate-/i.test(urlStr) &&
    !isGenericListingTitle(obj.name)
  ) {
    out.push(obj);
  }
  for (const key of Object.keys(obj)) {
    if (key === "@context" || key === "@graph") continue;
    const val = obj[key];
    if (val && typeof val === "object") collectLdPersonNodes(val, out);
  }
  return out;
}

function parseJsonLdRows($, baseUrl) {
  const rows = [];
  $("script[type='application/ld+json']").each((_idx, el) => {
    const raw = $(el).text();
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        if (!node) continue;

        const persons = collectLdPersonNodes(node, []);
        for (const p of persons) {
          const name = cleanPersonName(p.name || "");
          const profileUrl = toAbsoluteUrl(baseUrl, p.url || p["@id"] || "");
          if (!name || !profileUrl) continue;
          rows.push({
            name,
            expertise: detectDomains(String(p.jobTitle || p.description || "")),
            rating: 4,
            experienceYears: 3,
            availability: true,
            languages: ["English", "Hindi"],
            profileUrl
          });
        }

        const fromItemList = node?.itemListElement;
        if (Array.isArray(fromItemList)) {
          for (const listItem of fromItemList) {
            const item = listItem?.item || {};
            const name = cleanPersonName(item?.name || "");
            const profileUrl = toAbsoluteUrl(baseUrl, item?.url || item?.["@id"] || "");
            if (!name || isGenericListingTitle(name) || !profileUrl) continue;
            if (!/lawrato\.com\/advocate-/i.test(profileUrl)) continue;
            rows.push({
              name,
              expertise: detectDomains(String(item.description || "")),
              rating: 4,
              experienceYears: 3,
              availability: true,
              languages: ["English", "Hindi"],
              profileUrl
            });
          }
        }
      }
    } catch (_e) {
      // Ignore non-JSON script blocks.
    }
  });
  return rows;
}

/**
 * LawRato embeds many lawyer rows as loose JSON in HTML (not always one valid ld+json array).
 */
function parseLawratoAdvocateBlocks(html, baseUrl) {
  const rows = [];
  const re =
    /"name"\s*:\s*"([^"]+)"\s*,\s*"url"\s*:\s*"(https:\/\/lawrato\.com\/advocate-[a-z0-9-]+)"/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const rawName = match[1].trim();
    const profileUrl = toAbsoluteUrl(baseUrl, match[2].trim());
    if (!profileUrl || isGenericListingTitle(rawName)) continue;
    if (!/advocate/i.test(rawName) && !/^[A-Za-z]/.test(rawName)) continue;
    const name = cleanPersonName(rawName);
    if (!name || name.length < 2) continue;
    rows.push({
      name,
      expertise: detectDomains(rawName),
      rating: 4,
      experienceYears: 3,
      availability: true,
      languages: ["English", "Hindi"],
      profileUrl
    });
  }
  return rows;
}

function detectDomains(text = "") {
  const normalized = text.toLowerCase();
  const matched = Object.entries(DOMAIN_KEYWORDS)
    .filter(([, keywords]) => keywords.some((k) => normalized.includes(k)))
    .map(([domain]) => domain);
  return matched.length ? matched : ["civil"];
}

function extractNumber(text = "", fallback = 0) {
  const match = String(text).match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : fallback;
}

function toAbsoluteUrl(baseUrl, href = "") {
  try {
    return new URL(href, baseUrl).toString();
  } catch (_e) {
    return "";
  }
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    }
  });
  const text = await response.text();
  // Some endpoints behind Cloudflare may return non-2xx but still include HTML we can parse.
  // Only fail hard when the response looks empty / blocked.
  if (text.length < 500 && response.status >= 400) {
    throw new Error(`Failed ${url}: HTTP ${response.status}`);
  }
  return text;
}

function parseCard($, card, baseUrl) {
  const rawName =
    $(card).find("h1, h2, h3, h4, .name, .lawyer-name, .advocate-name").first().text().trim() ||
    "";
  const name = cleanPersonName(rawName);
  const details = $(card).text().replace(/\s+/g, " ").trim();

  if (!name || name.length < 3) return null;
  if (isGenericListingTitle(name)) return null;

  const rating = extractNumber(
    $(card).find(".rating, .stars, [class*='rating']").first().text() || details,
    4
  );
  const experienceYears = extractNumber(
    $(card).find(".experience, [class*='experience']").first().text() || details,
    3
  );

  const expertiseRaw =
    $(card).find(".specialization, .expertise, [class*='special']").first().text() || details;
  const expertise = detectDomains(expertiseRaw);

  const languagesText =
    $(card).find(".languages, [class*='language']").first().text() || details;
  const languages = languageTokens.filter((lang) =>
    languagesText.toLowerCase().includes(lang.toLowerCase())
  );
  const profileUrl = toAbsoluteUrl(
    baseUrl,
    $(card).find("a[href*='lawyer'], a[href*='advocate'], a[href*='profile']").first().attr("href")
  );

  return {
    name,
    expertise,
    rating: Math.max(0, Math.min(5, rating || 4)),
    experienceYears: Math.max(0, experienceYears || 3),
    availability: true,
    languages: languages.length ? languages : ["English", "Hindi"],
    profileUrl
  };
}

function mergeRows(baseRow, profileRow) {
  return {
    ...baseRow,
    name: profileRow.name || baseRow.name,
    expertise: profileRow.expertise?.length ? profileRow.expertise : baseRow.expertise,
    rating: profileRow.rating || baseRow.rating,
    experienceYears: profileRow.experienceYears || baseRow.experienceYears,
    languages: profileRow.languages?.length ? profileRow.languages : baseRow.languages
  };
}

function dedupeRowsByProfileUrl(rows) {
  const byUrl = new Map();
  for (const row of rows) {
    const key = row.profileUrl || row.name;
    if (!byUrl.has(key)) byUrl.set(key, row);
    else byUrl.set(key, mergeRows(byUrl.get(key), row));
  }
  return Array.from(byUrl.values());
}

async function scrapeProfile(profileUrl) {
  if (!profileUrl) return null;
  try {
    const html = await fetchHtml(profileUrl);
    const $ = cheerio.load(html);
    const text = $("body").text().replace(/\s+/g, " ").trim();
    const profileName = cleanPersonName(
      $("h1, h2, .name, .lawyer-name, .advocate-name").first().text().trim()
    );
    const rating = extractNumber(
      $(".rating, .stars, [class*='rating']").first().text() || text,
      0
    );
    const experienceYears = extractNumber(
      $(".experience, [class*='experience']").first().text() || text,
      0
    );
    const expertiseRaw =
      $(".specialization, .expertise, [class*='special']").first().text() || text;
    const languages = languageTokens.filter((lang) => text.toLowerCase().includes(lang.toLowerCase()));

    return {
      name: profileName && !isGenericListingTitle(profileName) ? profileName : "",
      expertise: detectDomains(expertiseRaw),
      rating: Math.max(0, Math.min(5, rating || 0)),
      experienceYears: Math.max(0, experienceYears || 0),
      languages
    };
  } catch (_error) {
    return null;
  }
}

function pageVariants(url, pageNum) {
  if (pageNum === 1) return [url];
  const clean = url.replace(/\/$/, "");
  const withQuery = new URL(url);
  withQuery.searchParams.set("page", String(pageNum));
  return [withQuery.toString(), `${clean}/page/${pageNum}`, `${clean}?p=${pageNum}`];
}

async function scrapeListingPage(url) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const cards = $(
    ".advocate-card, .lawyer-card, .listing-card, .profile-card, .search-result, article, .card"
  );

  let parsed = [];
  cards.each((_idx, card) => {
    const row = parseCard($, card, url);
    if (row) parsed.push(row);
  });

  // Fallback parser for pages where cards are plain blocks.
  if (parsed.length === 0) {
    $("li, .result, .item").each((_idx, card) => {
      const row = parseCard($, card, url);
      if (row) parsed.push(row);
    });
  }

  const jsonLdRows = parseJsonLdRows($, url);
  const lawratoRegexRows = /lawrato\.com/i.test(url) ? parseLawratoAdvocateBlocks(html, url) : [];
  const lawratoDomRows = /lawrato\.com/i.test(url) ? parseLawratoDomListings($, url) : [];

  parsed = dedupeRowsByProfileUrl([
    ...parsed,
    ...jsonLdRows,
    ...lawratoRegexRows,
    ...lawratoDomRows
  ]);

  return parsed;
}

async function scrapeFromUrl(baseUrl, maxPages, profileDepth) {
  const allRows = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const candidates = pageVariants(baseUrl, page);
    let rows = [];
    let successUrl = "";

    for (const candidate of candidates) {
      try {
        rows = await scrapeListingPage(candidate);
        successUrl = candidate;
        break;
      } catch (_e) {
        if ((process.env.SCRAPE_DEBUG || "").toLowerCase() === "true" && page === 1) {
          const msg = _e && _e.message ? _e.message : String(_e);
          console.error(`Candidate failed: ${candidate} => ${msg}`);
        }
        // Try next URL variant.
      }
    }

    if (!successUrl) {
      if (page === 1) throw new Error(`Failed ${baseUrl}: unable to fetch listing page`);
      break;
    }

    if (rows.length === 0) {
      if (page === 1) {
        console.log(`Scraped 0 advocates from ${successUrl}`);
      }
      break;
    }

    if (profileDepth > 0) {
      const limit = Math.min(profileDepth, rows.length);
      for (let i = 0; i < limit; i += 1) {
        const profileData = await scrapeProfile(rows[i].profileUrl);
        if (profileData) {
          rows[i] = mergeRows(rows[i], profileData);
        }
      }
    }

    allRows.push(...rows);
    console.log(`Scraped ${rows.length} advocates from ${successUrl}`);
  }
  return allRows;
}

async function upsertAdvocates(rows) {
  let inserted = 0;
  let updated = 0;
  for (const row of rows) {
    const existing = await Advocate.findOne({ name: row.name });
    if (existing) {
      await Advocate.updateOne({ _id: existing._id }, { $set: row });
      updated += 1;
    } else {
      await Advocate.create(row);
      inserted += 1;
    }
  }
  return { inserted, updated };
}

async function main() {
  const maxPages = Number(process.env.SCRAPE_MAX_PAGES || 3);
  const profileDepth = Number(process.env.SCRAPE_PROFILE_DEPTH || 10);
  const dryRun = (process.env.SCRAPE_DRY_RUN || "false").toLowerCase() === "true";
  const dbRetries = Number(process.env.DB_RETRIES || 5);
  const dbRetryDelayMs = Number(process.env.DB_RETRY_DELAY_MS || 2000);
  const urls = (process.env.SCRAPE_URLS || "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  if (urls.length === 0) {
    throw new Error("Set SCRAPE_URLS in .env (comma-separated advocate listing URLs).");
  }

  if (!dryRun) {
    let lastErr = null;
    for (let attempt = 0; attempt < dbRetries; attempt += 1) {
      try {
        await connectDB();
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        if (attempt === dbRetries - 1) throw err;
        await new Promise((r) => setTimeout(r, dbRetryDelayMs * (attempt + 1)));
      }
    }
  }
  let all = [];

  for (const url of urls) {
    try {
      const rows = await scrapeFromUrl(url, maxPages, profileDepth);
      all = all.concat(rows);
    } catch (error) {
      console.error(`Skip ${url}: ${error.message}`);
    }
  }

  // Deduplicate by name
  const byName = new Map();
  for (const row of all) {
    if (!byName.has(row.name)) {
      byName.set(row.name, row);
    } else {
      byName.set(row.name, mergeRows(byName.get(row.name), row));
    }
  }

  const unique = Array.from(byName.values()).map(({ profileUrl, ...row }) => row);
  if (dryRun) {
    console.log(`Done (dry-run). Parsed=${unique.length}. Sample=${unique.slice(0, 10).map((r) => r.name).join(", ")}`);
    process.exit(0);
  }

  const result = await upsertAdvocates(unique);
  console.log(`Done. Parsed=${unique.length}, Inserted=${result.inserted}, Updated=${result.updated}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
