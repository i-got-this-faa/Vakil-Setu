# Local multilingual vector retrieval

The legal backend supports BM25, vector search and hybrid retrieval. The `/api/ai/triage` endpoint now includes RAG evidence alongside classification and advocate matches; see [backend integration](BACKEND_RAG.md). The website still needs to render that new field.

## Setup

Install backend dependencies. On a CPU-only machine, optional CUDA downloads can be skipped:

```bash
ONNXRUNTIME_NODE_INSTALL=skip npm ci --prefix backend
npm run legal:embed --prefix backend
npm run legal:search --prefix backend -- "मेरा फोन चोरी हो गया"
```

Indexing downloads `Xenova/multilingual-e5-small` (quantized ONNX) into `backend/data/legal-models/`. It runs locally on CPU and needs no embedding API key. Requests use cached model files only. The first model download requires access to Hugging Face; generation still needs a separate configured LLM.

The model produces 384-dimensional vectors. Document inputs include the source title and section heading so continuation chunks retain their legal context. Document inputs use `passage:` and questions use `query:` as required by multilingual E5. Long source chunks are embedded in overlapping 384-token windows with a 320-token stride; their normalized vectors are averaged and normalized again. Original source text, chunk boundaries, page and section citations remain unchanged.

## Index and modes

`backend/data/legal/vectors.json` stores normalized vectors, passage IDs, text hashes, model settings and a corpus fingerprint. Index writes are atomic and unchanged passages reuse their embeddings. Changed sources or model settings require re-indexing. Corpus/model/vector files are ignored by Git and must be rebuilt on a new checkout.

- `auto` (default): hybrid with a valid index; BM25 with an explicit `retrievalWarning` if the index is missing, stale or invalid.
- `bm25`: keyword retrieval only; no model required.
- `vector`: normalized dot product (cosine similarity).
- `hybrid`: BM25 and vector rankings combined with reciprocal-rank fusion (`k=60`).

Set `LEGAL_RETRIEVAL_MODE` in `backend/.env`, or select `retrievalMode` per knowledge request:

```json
{"query":"मेरा मोबाइल चोरी हो गया","retrievalMode":"hybrid","act":"BNS","limit":5}
```

`POST /api/knowledge/search` returns passages, method and model. `/api/knowledge/answer` uses the same retrieval before generation and evidence validation. Filters include court, date range, document type, act and section number. Explicit vector/hybrid requests fail if the index is stale rather than serving mismatched vectors. Embedding runtime errors are surfaced, not silently reported as semantic success.

Exact cosine search over 476 passages is small enough to run in memory; no vector database is necessary yet. For a much larger collection, move vectors into an approximate-nearest-neighbour index. A dedicated warm worker and concurrent-request limits should precede production deployment; the present CPU model runs within the Node process.

## Verification and limits

```bash
npm run test:legal --prefix backend
npm run legal:audit --prefix backend
npm run legal:audit --prefix backend -- --online
```

The audit compares every chunk with saved source reconstruction and saved PDF hashes. `--online` also re-fetches official judgment PDFs for byte-level comparison. See [RAG_DATA_AUDIT.md](RAG_DATA_AUDIT.md) for the actual findings and unresolved legal verification.

Similarity scores rank passages; they are not legal confidence or proof that a question is answerable. Multilingual retrieval needs a reviewed evaluation dataset before claiming broad Hindi/Hinglish accuracy. Long-window averaging can dilute individual clauses, and hybrid ranking can surface related provisions rather than the exact requested section. Prefer the section-number filter for exact citations. The corpus remains only a BNS reference reproduction and three High Court judgments; no amendment/current-authority certification is implied.

Reproduce the four-case developer smoke evaluation with `npm run legal:evaluate --prefix backend`; see [actual results](RETRIEVAL_EVALUATION.md). This is intentionally reported separately from mocked-vector unit tests.
