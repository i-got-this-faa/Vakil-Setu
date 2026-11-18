// Fetches section-wise text of the Acts in config/indiacode.sources.json from India Code (indiacode.gov.in,
// the Government of India's official repository) and writes data/legal/indiacode.json for exportConvexCorpus.
// Raw API responses are cached under data/legal/indiacode/; pass --refresh to fetch again.
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { load } from "cheerio";
import { chunkPages, corpusDir, digest } from "../src/services/legalCorpus.js";

const API = "https://indiacode.gov.in/server/api";
const config = JSON.parse(await readFile(new URL("../config/indiacode.sources.json", import.meta.url), "utf8"));
const directory = corpusDir();
const rawDirectory = path.join(directory, "indiacode");
await mkdir(rawDirectory, { recursive: true });
const refresh = process.argv.includes("--refresh");
const only = process.argv.find(arg => arg.startsWith("--act="))?.slice(6);

const value = (item, key) => item.metadata[key]?.[0]?.value;

/** India Code stores each section as HTML; keep its line structure and drop footnote markers. */
export function sectionText(html) {
  const page = load(`<div>${html || ""}</div>`);
  page("sup").remove();
  page("br,hr").replaceWith("\n");
  return page("div").first().text().replace(/ /g, " ").split("\n").map(line => line.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
}

async function fetchSections(act) {
  const cache = path.join(rawDirectory, `${act.actId}.json`);
  if (!refresh) {
    try { return JSON.parse(await readFile(cache, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  const items = [];
  for (let page = 0; page < 50; page++) {
    const url = new URL(`${API}/discover/search/objects`);
    url.searchParams.set("query", `dc.identifier.act_id:"${act.actId}"`);
    url.searchParams.set("dsoType", "ITEM");
    url.searchParams.set("size", "100");
    url.searchParams.set("page", String(page));
    const response = await fetch(url, { signal: AbortSignal.timeout(60000), redirect: "error" });
    if (!response.ok) throw new Error(`India Code search failed for ${act.act}: HTTP ${response.status}`);
    const result = (await response.json())._embedded?.searchResult;
    if (!result) throw new Error(`Unexpected India Code response for ${act.act}`);
    items.push(...(result._embedded?.objects ?? []).map(object => object._embedded.indexableObject));
    if (page + 1 >= result.page.totalPages) break;
    await new Promise(resolve => setTimeout(resolve, 300)); // Be gentle with a government server.
  }
  const sections = items
    .filter(item => value(item, "dc.identifier.collection") === "SECTION" && value(item, "dc.identifier.act_id") === act.actId)
    .map(item => ({ handle: item.handle, number: (value(item, "dc.identifier.section_number") || "").trim(), title: (value(item, "dc.title") || "").trim(), order: Number(value(item, "dc.identifier.order_number")), html: value(item, "dc.identifier.section_page_note") || "" }));
  await writeFile(`${cache}.tmp`, JSON.stringify(sections));
  await rename(`${cache}.tmp`, cache);
  return sections;
}

const documents = [];
for (const act of config.acts) {
  if (only && act.act !== only) continue;
  const raw = await fetchSections(act);
  const seen = new Set();
  const sections = raw
    .filter(section => /^\d{1,3}(?:-?[A-Z]{1,3})?$/.test(section.number))
    .map(section => ({ ...section, text: sectionText(section.html) }))
    // Omitted/repealed sections carry no substantive text.
    .filter(section => section.text.length >= 30 && !/^\[?\s*(omitted|repealed)\b/i.test(section.text))
    .sort((a, b) => a.order - b.order || a.number.localeCompare(b.number, "en", { numeric: true }))
    .filter(section => !seen.has(section.number) && seen.add(section.number));
  if (sections.length < 5) throw new Error(`Too few sections for ${act.act} (${sections.length}); refusing to index.`);
  const source = { url: `${config.portal}/handle/${act.handle}`, title: act.title, act: act.act, documentType: "statute", jurisdiction: act.jurisdiction || "India", language: "en", requestedCutoff: config.requestedCutoff, cutoffVerified: false, versionWarning: act.warning ? `${config.versionWarning} ${act.warning}` : config.versionWarning, discoveredOn: config.portal };
  const contentHash = digest(JSON.stringify(sections.map(section => [section.number, section.title, section.text])));
  const id = digest(source.url).slice(0, 24);
  const chunks = sections.flatMap(section => {
    const numeric = /^\d+$/.test(section.number);
    const heading = `Section ${section.number}. ${section.title}`;
    return chunkPages(`${heading}\n${section.text}`).map((chunk, i) => ({
      ...chunk,
      page: null, // Cited by section, never by invented page numbers.
      ...(numeric ? { sectionNumber: Number(section.number) } : { sectionLabel: section.number }),
      sectionTitle: section.title.replace(/\.$/, ""),
      sectionUrl: `${config.portal}/handle/${section.handle}`,
      id: `${id}-${contentHash.slice(0, 12)}-s${section.number}-${i + 1}`,
    }));
  });
  documents.push({ id, source, contentHash, fetchedAt: new Date().toISOString(), sectionCount: sections.length, chunks });
  console.log(`${act.act}: ${sections.length} sections, ${chunks.length} passages`);
}
if (!only) {
  await writeFile(path.join(directory, "indiacode.json.tmp"), JSON.stringify({ version: 1, documents }, null, 2));
  await rename(path.join(directory, "indiacode.json.tmp"), path.join(directory, "indiacode.json"));
  console.log(`Wrote ${documents.length} Acts, ${documents.reduce((n, d) => n + d.chunks.length, 0)} passages.`);
}
