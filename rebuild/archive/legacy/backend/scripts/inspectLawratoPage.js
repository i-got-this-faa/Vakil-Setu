import * as cheerio from "cheerio";

const url = process.argv[2] || "https://lawrato.com/criminal-lawyers/jammu";
const html = await (await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })).text();
const $ = cheerio.load(html);

const profileLinks = $("a[href*='advocate-']");
console.log("a[href*=advocate-]:", profileLinks.length);
profileLinks.slice(0, 5).each((i, el) => {
  const href = $(el).attr("href");
  const text = $(el).text().replace(/\s+/g, " ").trim();
  const parent = $(el).closest("div").parent().html()?.slice(0, 200);
  console.log(i + 1, href, "| btn:", text.slice(0, 40));
});

const headings = $("h1, h2, h3, .lawyer-name, [class*='lawyer']");
console.log("headings sample:", headings.length);
