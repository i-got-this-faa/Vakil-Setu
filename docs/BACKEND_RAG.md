# RAG integration in the triage backend

`POST /api/ai/triage` now returns `legalAnswer` alongside its existing `classification` and `advocates` fields. The frontend's existing request already reaches this endpoint, but rendering/speaking the new evidence field still requires a frontend change. The classification summary is separate triage output and is not presented by this API as a source-grounded answer.

## Request

```json
{
  "text": "What does the BNS say about theft?",
  "history": [],
  "language": "en",
  "retrievalMode": "auto"
}
```

Only `text` is required (1–4000 characters). Optional `history` accepts up to 100 user/assistant messages, each with a string `content` of up to 4000 characters. The most recent ten messages reach classification. RAG uses the current question plus at most three preceding user messages, limited to 700 characters each; assistant responses are excluded from retrieval context. This simple context strategy can still mix topics, so a new case should clear history. `language` accepts `en`/`hi`; otherwise the classifier's detected language is used. `retrievalMode` accepts `auto`, `bm25`, `vector`, or `hybrid`.

## Response

```json
{
  "classification": { "domain": "criminal", "summary": "..." },
  "advocates": [],
  "legalAnswer": {
    "status": "source_excerpts",
    "generationMode": "extractive",
    "answer": "The citations below contain potentially relevant excerpts in their original language. They are source material, not a legal conclusion about your case.",
    "retrievalMethod": "hybrid",
    "embeddingModel": "Xenova/multilingual-e5-small",
    "authorityChecked": false,
    "citations": [{
      "passageId": "...",
      "page": null,
      "quote": "Exact source text...",
      "truncated": true,
      "source": { "act": "BNS", "sectionNumber": 303, "url": "https://..." }
    }],
    "warnings": ["..."]
  }
}
```

Excerpts are capped at 700 characters and clearly indicate truncation; the linked original source provides full context. Up to three excerpts are returned. Hindi requests retain original English source excerpts rather than claiming an unverified translation. Warnings distinguish unverified statutory currency and unchecked judgment authority.

## Generation policy

Configure `backend/.env`:

```dotenv
TRIAGE_RAG_MODE=auto
LEGAL_RETRIEVAL_MODE=auto
```

- `auto`: use source-grounded generation when `LLM_API_KEY` exists; otherwise return source excerpts.
- `extractive`: always return source excerpts without a generation call.
- `llm`: attempt grounded generation; if the provider fails or is unconfigured, return labelled excerpts with `generationWarning`.

Generated output must pass existing passage-ID and verbatim-quote validation. This checks citation existence, not whether every claim logically follows from the quotation. Invalid or insufficient evidence produces an explicit refusal status and no citations; rejected generated advice is never returned. Classification uses the existing independent model/fallback configuration.

Missing or stale vectors in `auto` mode fall back to BM25 with `retrievalWarning`. A retrieval runtime failure returns `legalAnswer.status="retrieval_unavailable"` and no citations while classification/matching remain available. Provider error details and credentials are not included in the response. Classifier or database failures still follow the existing endpoint error handling.

`/api/ai/classify` retains its existing contract. `/api/knowledge/search` and `/api/knowledge/answer` remain available; the latter still requires model configuration for generated answers.

## Run and test

```bash
npm run legal:embed --prefix backend
npm run test:legal --prefix backend
npm run db:local --prefix backend
# In another terminal:
npm start --prefix backend
```

```bash
curl http://localhost:5000/api/ai/triage \
  -H 'Content-Type: application/json' \
  -d '{"text":"What does the BNS say about theft?","history":[]}'
```

Local embeddings require no API key. Grounded generation needs the existing Gemini/gateway configuration. See [VECTOR_RETRIEVAL.md](VECTOR_RETRIEVAL.md), [RAG_DATA_AUDIT.md](RAG_DATA_AUDIT.md) and [RETRIEVAL_EVALUATION.md](RETRIEVAL_EVALUATION.md) for setup and the limits of source coverage, legal verification and retrieval accuracy.
