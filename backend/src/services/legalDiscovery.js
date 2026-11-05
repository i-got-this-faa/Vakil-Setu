import { load } from "cheerio";

export function discoverJudgmentLinks(html, pageUrl) {
  const candidates = new Map();
  const inspect = (fragment, discoveryContext) => {
    const $ = load(fragment);
    $("a[href]").each((_index, element) => {
      let url;
      try { url = new URL($(element).attr("href"), pageUrl); } catch { return; }
      if (!/\.pdf$/i.test(url.pathname) || !/\/Jud_Search\/Judgement\//i.test(url.pathname)) return;
      if (!candidates.has(url.href)) candidates.set(url.href, { url: url.href, linkText: $(element).text().replace(/\s+/g, " ").trim().slice(0, 1000), discoveredOn: pageUrl, discoveryContext, needsMetadataReview: true });
    });
  };
  inspect(html, "rendered_link");
  // The official homepage also retains an old judgment list in HTML comments.
  // Label these as archived candidates; never confuse them with a current listing.
  for (const match of html.matchAll(/<!--([\s\S]*?)-->/g)) inspect(match[1], "html_comment");
  return [...candidates.values()];
}
