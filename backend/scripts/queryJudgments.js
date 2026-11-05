import "dotenv/config";
import { loadCorpus } from "../src/services/legalCorpus.js";

import { retrieveLegalPassages } from "../src/services/legalVectorSearch.js";

const query = process.argv.slice(2).join(" ").trim();
if (!query) throw new Error('Usage: npm run legal:search -- "migrant property appeal possession"');
const corpus = await loadCorpus();
console.log(JSON.stringify(await retrieveLegalPassages(query, {}, { corpus }), null, 2));
