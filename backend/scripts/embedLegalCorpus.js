import "dotenv/config";
import { loadCorpus } from "../src/services/legalCorpus.js";
import { buildVectorIndex } from "../src/services/legalVectorSearch.js";
process.env.LEGAL_ALLOW_MODEL_DOWNLOAD = "true";
const corpus = await loadCorpus();
const index = await buildVectorIndex(corpus, { onProgress: (done, total) => { if (done % 25 === 0 || done === total) console.log(`Embedded ${done}/${total} passages`); } });
console.log(JSON.stringify({ model: index.profile.model, dimensions: index.dimensions, passages: index.entries.length, builtAt: index.builtAt }));
