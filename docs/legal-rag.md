# Judgment collection and retrieval

The backend now has a small, reproducible judgment-ingestion pipeline and a first
retrieval-augmented answer endpoint. It is independent of the website so a future
WhatsApp worker can call the same service after transcribing a voice note.

## Scope and provenance

Start with `backend/config/judgments.sources.json`: three English J&K High Court
judgments from March 2024. The case number, date and judges were checked against
each official PDF's first page. These links were discovered in an **archived HTML
comment** on the official homepage, not a current judgment feed. Discovery labels
that distinction. The homepage contained 38 candidates when inspected; a discovered
candidate is not automatically approved or indexed.

This is a pipeline seed, not a representative dataset. It cannot establish court
patterns, judicial tendencies, success rates, or the current state of Indian law.
Statutes, amendments, Supreme Court judgments and subsequent treatment are not
yet part of this seed. Court observations remain within their full judgment;
there is no separate collection of unattributed judge statements.

## Collect and search

Requirements: Node 22+, backend npm dependencies, and Poppler's `pdftotext`
(`sudo apt install poppler-utils` on Ubuntu). No MongoDB or model credentials are
needed to run ingestion and passage search.

Run from the repository root:

```bash
npm install --prefix backend
node backend/scripts/discoverJudgments.js > /tmp/judgment-candidates.json
npm run legal:ingest --prefix backend
npm run legal:search --prefix backend -- "migrant property appeal surrender possession"
npm run test:legal --prefix backend
```

Review a candidate's PDF and add a complete entry to the manifest before importing.
Pass a different manifest with `npm run legal:ingest --prefix backend -- /absolute/path/sources.json`.
Discovery currently recognizes the J&K site's historical judgment-link format;
it is not a general Supreme Court or eCourts search adapter. HTML comments can
contain broken links and old or superseded decisions.

Only explicitly allowed official HTTPS hosts can be downloaded. The fetcher checks
robots rules (404 means no published rules), waits at least 1.5 seconds between
requests per origin, honors longer crawl delays, verifies redirects, and caps
downloads at 20 MiB. It stops on denied access and does not solve CAPTCHAs.
Robots access is not a reuse license: check each source's terms and publication
restrictions before expanding or redistributing the dataset.

The import writes to `backend/data/legal/` (gitignored):

- `raw/`: original PDFs and extracted text, versioned by document and content hash.
- `corpus.json`: reviewed metadata, timestamps, hashes, and page-local passages.

Use `LEGAL_CORPUS_DIR` to change this directory. Existing unchanged sources do not
create duplicate documents. Changed source PDFs replace the searchable version;
previous raw files remain available. Identical PDFs under different URLs are flagged
for alias review. Corpus updates use atomic file replacement and a single-writer
lock. If an import crashes, confirm no importer is running before removing a stale
`.ingest-lock` directory. Scanned or partly unreadable PDFs are rejected for an OCR
and human-review pass; text extraction alone cannot prove completeness or accuracy.
Keep originals restricted and review personal information before public redistribution.

## Retrieval and answers

The first retriever is **BM25 lexical ranking**, not vector similarity or a trained
legal model. It returns source URLs, page numbers, passages and metadata. Scores
are ranking values, not confidence or probabilities. English legal keywords work
with the seed; Hindi/Roman-Hindi voice queries need multilingual embeddings or a
tested translation layer before reliable cross-language retrieval is possible.

With the normal backend running:

```bash
curl -X POST http://localhost:5000/api/knowledge/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"migrant property appeal surrender possession","limit":3}'

curl -X POST http://localhost:5000/api/knowledge/answer \
  -H 'Content-Type: application/json' \
  -d '{"query":"In this judgment, why was surrender of possession necessary for the appeal?","language":"en"}'
```

Both endpoints accept exact `court`, inclusive `dateFrom`/`dateTo` ISO-date
filters. Search supports `limit` 1–10. Answers retrieve up to five passages and
support `en` or `hi` output, using the existing `gateway` or `gemini` configuration.
Language selection changes generation, not retrieval. No model call is made for an
empty corpus or zero keyword matches. Provider errors return 503; no generic legal
answer is substituted when the evidence or provider fails.

Generation requests an explanation plus verbatim supporting excerpts. The service
rejects malformed JSON, unknown passage IDs, and quotes absent from the retrieved
text. `citations` contain the actual PDF URL, page, case metadata and quoted text.
`status` distinguishes `answered`, `empty_corpus`, `no_matching_passages`,
`insufficient_evidence`, and `invalid_evidence`. All responses set
`authorityChecked: false`: there is no subsequent-treatment checker.

Quote matching is an integrity check, **not proof that every generated claim follows
from the quote**. A judgment can contain submissions, rejected arguments, quoted
precedents, interim reasoning, and final holdings. Legal review and claim-level
evaluation are required before user-facing deployment. The endpoints inherit the
prototype's access model; add authentication, model-spend limits and request limits
before exposing them publicly. WhatsApp integration and speech synthesis are not
included in this change. Do not read citation IDs aloud; send references separately
alongside a short spoken explanation when that integration is built.

## Expanding toward pattern analysis

1. Choose legal topics, courts and a date range before collecting at scale. Record
   coverage and missing cases; archived highlights introduce selection bias.
2. Expand reviewed source adapters and metadata. Keep statutes in a separate,
   versioned collection with effective dates and jurisdiction. Do not substitute
   modern legislation for the statute applied in an older case.
3. Add OCR review and paragraph attribution: facts, party submissions, quoted
   precedents, court reasoning, operative order. Human-review extracted labels.
4. Add multilingual embeddings and hybrid retrieval, preserving the same citations.
   Test with real Hindi, Roman-Hindi and English queries before model selection.
5. Build a held-out evaluation set for passage relevance, citation support,
   abstention and speech-language handling. The included tests check pipeline
   behavior; they are not a legal-accuracy benchmark.
6. Analyse issues, statutes, procedural stage and outcomes with explicit sample
   counts and coverage limits. Retrieve across cases to compare reasoning; do not
   turn a biased collection into judge profiling or case-win predictions.
