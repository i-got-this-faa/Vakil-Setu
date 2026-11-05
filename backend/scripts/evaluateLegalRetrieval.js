import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { retrieveLegalPassages } from "../src/services/legalVectorSearch.js";

// Developer-labelled smoke cases, not a lawyer-reviewed benchmark.
const cases = [
  { query: "Someone stole my mobile phone", expected: 303 },
  { query: "मेरा मोबाइल फोन चोरी हो गया", expected: 303 },
  { query: "मेरे साथ धोखाधड़ी हुई है", expected: 318 },
  { query: "Someone threatened to kill me", expected: 351 }
];
const results = [];
for (const item of cases) {
  const result = await retrieveLegalPassages(item.query, { retrievalMode: "hybrid", limit: 5, act: "BNS" });
  results.push({ ...item, method: result.retrievalMethod, sections: result.passages.map(p => p.sectionNumber), hit: result.passages.some(p => p.sectionNumber === item.expected) });
}
const hits = results.filter(r => r.hit).length;
const markdown = `# Retrieval smoke evaluation\n\nGenerated: ${new Date().toISOString()}\n\nModel: Xenova/multilingual-e5-small, q8. Hybrid BM25 + vector, top 5, BNS only. These four examples are developer-labelled, not a lawyer-reviewed benchmark.\n\nExpected section appeared in **${hits}/${results.length}** results.\n\n` + results.map(r => `- Query: ${r.query}\n  - Expected section: ${r.expected}; returned: ${r.sections.join(", ")}; ${r.hit ? "HIT" : "MISS"}\n`).join("\n") + `\nThe pipeline is operational, but these results do not establish reliable multilingual legal retrieval. Related offences may be relevant but do not substitute for the expected provision. Add reviewed examples, improve retrieval and reranking, and measure results before public use. Exact section-number requests should use the sectionNumber filter. Similarity scores are not answer confidence.\n`;
await writeFile(fileURLToPath(new URL("../../docs/RETRIEVAL_EVALUATION.md", import.meta.url)), markdown);
console.log(JSON.stringify({ hits, total: results.length, results }, null, 2));
