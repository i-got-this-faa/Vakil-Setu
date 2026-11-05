import * as cheerio from "cheerio";

const url = process.argv[2] || "https://lawrato.com/lawyers/jammu";
const html = await (await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })).text();
const $ = cheerio.load(html);

const links = $("a[href*='/lawyer/']");
console.log("lawyer links:", links.length);
links.slice(0, 12).each((i, el) => {
  const text = $(el).text().replace(/\s+/g, " ").trim();
  console.log(i + 1, text.slice(0, 120), "=>", $(el).attr("href"));
});

const cards = $("article,.card,.lawyer-card,.listing-card,.search-result,.advocate-card,li");
console.log("candidate cards:", cards.length);
cards.slice(0, 12).each((i, el) => {
  const text = $(el).text().replace(/\s+/g, " ").trim();
  console.log("card", i + 1, text.slice(0, 180));
});
