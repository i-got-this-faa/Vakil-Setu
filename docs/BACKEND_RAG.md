# RAG integration in the triage backend

`POST /api/ai/triage` now returns `legalAnswer` alongside its existing `classification` and `advocates` fields. The frontend renders the grounded answer with expandable citations and speaks the grounded text. The classification summary is separate triage output and is not presented by this API as a source-grounded answer.

## Request

```json
{
  "text": "What does the BNS say about theft?",
  "history": [],
  "language": "en",
  "retrievalMode": "auto"
}
```

Only `text` is required (1–4000 characters). Optional `history` accepts up to 100 user/assistant messages, each with a string `content` of up to 4000 characters. The most recent ten messages reach classification. RAG uses the current question plus at most three preceding user messages, limited to 700 characters each; assistant responses are excluded from retrieval context. This simple context strategy can still mix topics, so a new case should clear history. `language` accepts `en`/`hi`, `english`/`hindi`, or `auto`; auto uses the classifier's detected language. `retrievalMode` accepts `auto`, `bm25`, `vector`, or `hybrid`.

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

## Active local chat integration (5 November 2026)

The application at `http://localhost:5173` is served from the sibling
`C:/Users/DELL/Vakil-Setu-team` checkout. Its backend now connects the existing
conversation flow to `buildTriageLegalAnswer`. UI preferences `english`, `hindi`,
`auto` and API codes `en`, `hi` are accepted and normalized. Clarification turns
remain conversational and skip retrieval and advocate matching. Classified legal
turns return independent classification metadata plus a grounded `legalAnswer`.

The chat displays and speaks `legalAnswer.answer`, persists its evidence with the
message, and offers expandable source links, exact excerpts and version warnings.
The case-summary view uses the grounded answer too. Retrieval failures and invalid model citations use the independent validated LLM
response with the General AI guidance label and no citations, when available. Summaries and advocate matches open only by user navigation.

The local corpus currently contains the NCRB BNS reference: all 358 sections, 432
passages after the successful Firecrawl refresh. A 384-dimensional multilingual-e5-small
index is built for all passages; `auto` retrieval uses hybrid BM25/vector retrieval.
No court judgments have been imported here. This corpus does not cover every legal
category and is not verified as a current consolidated statute edition.

Data, model caches and API credentials remain ignored local files. To reproduce:

```powershell
npm run legal:ingest:bns --prefix backend
npm run legal:embed --prefix backend
npm run dev --prefix backend
npm run dev --prefix frontend
```

The BNS importer uses Firecrawl when `FIRECRAWL_API_KEY` is configured. Without it,
it can import the same official HTML directly; `-- --direct` explicitly selects
that path. Both paths reject incomplete or misordered section sets. `-- --refresh`
refreshes the chosen source cache. Rebuild embeddings after a source change.


Verified locally: 19 retrieval/integration tests and 4 frontend tests passed, as did
production compilation. A live browser test received an `answered` response through
hybrid retrieval, rendered three source links and quotes, used the grounded text
for speech, remained on Home, and preserved citations after explicit summary
navigation. The source integrity audit reconstructed all 432 chunks without errors.
These checks do not establish legal correctness or current statutory authority.

## General-knowledge fallback

When retrieval returns insufficient/invalid evidence, no matching sources, an empty
corpus, a retrieval failure, or excerpts without an explanation, triage now uses its
independent validated LLM reply. The response is labelled `general_guidance` with
`generationMode: llm_ungrounded`, no citations and an explicit source-verification
warning. `retrievalStatus` records the reason. Rejected source-generated text is
never reused as the fallback. Valid cited answers remain preferred; a missing or
failed LLM remains unavailable. Clarification turns skip retrieval as before.
The frontend displays and speaks the selected answer with its correct label.


The frontend now uses `/` as a landing page and `/chat` as the focused conversation
route. The earlier Home-based live checks above describe the integration at that
stage. Current browser checks verified the dedicated chat route, avatar, text and
voice-input controls, citations, general-guidance labels, manual results navigation,
profiles, consultation fields and New Case reset with delayed-response isolation.
The final automated suite has 62 passing tests; production compilation also passes.
