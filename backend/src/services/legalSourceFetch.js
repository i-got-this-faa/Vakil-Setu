import robotsParser from "robots-parser";

export const userAgent = "VakilSetuResearchBot/0.1";
const allowedHosts = new Set(["jkhighcourt.nic.in", "www.sci.gov.in", "api.sci.gov.in"]);
const policies = new Map();
const lastRequest = new Map();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function assertOfficialUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname) || url.username || url.password || url.port) {
    throw new Error(`Unapproved source URL: ${value}`);
  }
  return url;
}

async function getPolicy(url) {
  if (policies.has(url.origin)) return policies.get(url.origin);
  const robotsUrl = `${url.origin}/robots.txt`;
  const response = await fetch(robotsUrl, { headers: { "User-Agent": userAgent }, redirect: "error", signal: AbortSignal.timeout(20000) });
  if (response.status !== 404 && !response.ok) throw new Error(`Cannot check robots.txt: HTTP ${response.status}`);
  const policy = robotsParser(robotsUrl, response.status === 404 ? "" : await response.text());
  policies.set(url.origin, policy);
  return policy;
}

export async function fetchOfficial(value, { maxBytes = 20 * 1024 * 1024 } = {}) {
  let url = assertOfficialUrl(value);
  for (let redirects = 0; redirects < 5; redirects++) {
    const policy = await getPolicy(url);
    if (policy.isAllowed(url.href, userAgent) === false) throw new Error(`robots.txt disallows ${url.href}`);
    const waitMs = Math.max(1500, (policy.getCrawlDelay(userAgent) || 0) * 1000);
    await delay(Math.max(0, waitMs - (Date.now() - (lastRequest.get(url.origin) || 0))));
    lastRequest.set(url.origin, Date.now());
    const response = await fetch(url, { headers: { "User-Agent": userAgent }, redirect: "manual", signal: AbortSignal.timeout(45000) });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      url = assertOfficialUrl(new URL(response.headers.get("location"), url).href);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Source returned HTTP ${response.status}: ${url.href}`);
    }
    let length = 0;
    const buffers = [];
    for await (const chunk of response.body) {
      length += chunk.length;
      if (length > maxBytes) throw new Error(`Source exceeds ${maxBytes} bytes`);
      buffers.push(chunk);
    }
    return { bytes: Buffer.concat(buffers), contentType: response.headers.get("content-type") || "", finalUrl: url.href };
  }
  throw new Error("Too many source redirects");
}
