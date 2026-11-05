const approvedHosts = new Set(["www.ncrb.mha.gov.in", "www.indiacode.nic.in", "indiacode.nic.in"]);

export async function scrapeOfficialStatute(url, { fetchImpl = fetch } = {}) {
  const source = new URL(url);
  if (source.protocol !== "https:" || !approvedHosts.has(source.hostname) || source.username || source.password || source.port) throw new Error("Unapproved statute source");
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY is missing from backend/.env");
  // HTML source costs one scrape; do not launch an unbounded crawl or a PDF parser.
  if (/\.pdf$/i.test(source.pathname)) throw new Error("This adapter expects the section HTML source, not a PDF");
  const response = await fetchImpl("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, timeout: 60000 }),
    signal: AbortSignal.timeout(90000)
  });
  // Do not log response bodies or headers: they can contain sensitive configuration.
  if (!response.ok) throw new Error(`Firecrawl scrape failed: HTTP ${response.status}`);
  return response.json();
}
