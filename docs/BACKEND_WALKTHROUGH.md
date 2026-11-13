> Historical Express implementation reference. The avatar website now uses Convex; see [current migration](CONVEX_AVATAR_MIGRATION.md).

# Current backend walkthrough and avatar-website gaps

Checked locally on 2026-11-12. Checkout: `preview/latest-main-20261106`, based on commit `e3ed4d3`. This report describes the checked-out code; it does not claim that newer remote commits or hosted services were verified.

## Which implementation is running?

The avatar website is `frontend/` (React/Vite, port 5173). It calls `backend/` (Express, port 5000), which uses MongoDB. Start at http://localhost:5173/chat.

There is also a separate Next.js website and Convex backend under `rebuild/`. The mobile MVP in `rebuild/apps/mobile/` targets that Convex backend, not Express. The two systems do not automatically share users, bookings, case history or this local RAG index. Files existing in the Convex implementation do not mean those features exist in the avatar website.

## 1. Startup and HTTP boundary

`backend/src/server.js` loads environment configuration, mounts JSON/CORS middleware and routes, connects MongoDB, seeds sample advocate records if the collection is empty, then starts the server. `config/db.js` handles the database connection. `GET /health` confirms that the server is responding; it does not verify Gemini or payment-provider connectivity.

There is currently no login/session middleware protecting the avatar application's API routes. `User` is a database record, not an authentication implementation.

## 2. The main chat request

`frontend/src/hooks/useLegalChat.js` sends the latest text, prior messages and selected language through `frontend/src/api/client.js` to `POST /api/ai/triage`.

`backend/src/controllers/aiController.js` validates the request and calls `classifyLegalIssue()` in `services/aiService.js`. The model returns either a classification, a clarification request, or an explicit unavailable result. Successful classification includes a domain, urgency, summary, actions and response language. The supported matching domains are criminal, civil, family and property.

Gemini or a configured gateway supplies this independent response. The current code does not fabricate a rule-based legal classification if the provider is absent or fails. It returns `status: unavailable`. Older explanations of the project's rule-based fallback no longer describe this revision.

For classified concerns, the controller queries available advocates by canonical domain and rating. Clarification turns do not force a legal-source search or an advocate match. Other turns can retrieve evidence even if the independent model is unavailable.

## 3. RAG pipeline

Offline preparation:

- `scripts/ingestJudgments.js`: fetch official PDFs, extract text, retain raw files/hashes, create passages.
- `scripts/ingestBns.js` and `services/legalStatutes.js`: parse and index BNS sections.
- `services/legalCorpus.js`: load both stores, preserve page/section metadata, create overlapping chunks, rank keyword matches with BM25.
- `scripts/embedLegalCorpus.js`: generate/reuse local multilingual vectors and save the index.
- `scripts/auditLegalCorpus.js`: reconstruct source chunks and verify integrity; optional live PDF comparison.

At request time, `services/legalTriageService.js` builds a bounded retrieval question from the current message and earlier user facts. Assistant statements are excluded from retrieval context.

`services/legalVectorSearch.js` selects keyword, vector or hybrid retrieval. Hybrid uses reciprocal-rank fusion. The index fingerprint must match the corpus and model configuration; auto mode reports a warning and uses BM25 if the index is missing or stale.

`services/legalEmbeddings.js` runs quantized multilingual E5 locally. It preserves long input coverage using token windows. It does not generate legal explanations. At 476 passages, exact in-memory cosine search is sufficient; a vector database is not yet necessary.

`services/legalRagService.js` passes retrieved passages to a generation provider and checks returned passage IDs and verbatim quotations. These checks establish citation existence, not complete logical support for every legal claim. Missing generation can return labelled excerpts; unsupported generated evidence is rejected.

`services/triageAnswer.js` selects the final response. It prefers a cited grounded answer. If grounding is unavailable but the independent model response is valid, it can return `general_guidance` with no citations and an explicit warning that it was not verified against the corpus. Otherwise the excerpts/unavailable result remains explicit.

A successful request may therefore call the model twice: once for classification/conversation and once for grounded generation. This affects latency and quota when a provider is configured.

## 4. Frontend consumption

The response contains `classification`, `advocates` and `legalAnswer`. `useLegalChat.js` stores the turn in tab-session state and uses the returned answer for the assistant message. `components/LegalEvidence.jsx` distinguishes general guidance, source-grounded answers and related excerpts, and displays source URLs, quotations and warnings. Current read-aloud uses the browser speech API.

`/results` shows a case overview and advocate cards. Selecting a profile leads to `/profile`; requesting a consultation leads to `/booking`. `/chat` remains the main conversation screen.

## 5. Data models and bookings

`backend/src/models/` contains `User`, `Advocate`, `Booking` and `Review`.

`controllers/bookingController.js` validates an advocate, future preferred time and proposed fee; creates a guest user when needed; and stores a pending booking in MongoDB. It does not reserve a real slot or obtain an advocate's acceptance. The proposed fee is client-provided and is not an authoritative advocate price.

`controllers/paymentController.js` creates Razorpay orders and verifies payment signatures against the order stored on the booking. Payment and consultation acceptance are separate. Payment skipping is rejected. A verified payment does not mean an advocate accepted the time.

`controllers/emergencyController.js` only looks up an available advocate. It does not call, message or connect the user to emergency services.

## 6. API map

- `GET /health`
- `POST /api/ai/classify`: independent model classification/clarification.
- `POST /api/ai/triage`: chat classification, evidence and advocate matches.
- `POST /api/knowledge/search`: inspect retrieved legal passages.
- `POST /api/knowledge/answer`: request grounded model output.
- `POST /api/advocates/match`: expertise/availability matching.
- `POST /api/bookings`: save a consultation request.
- `POST /api/payments/create-order` and `/api/payments/verify`.
- `POST /api/emergency`: advocate lookup only.

`backend/src/whatsapp/` and `whatsappServer.js` are an independent messaging demonstration, not part of the active avatar site's voice flow.

## 7. Missing features in the avatar website

### Needed for a dependable pilot

1. Working generation-provider configuration and live conversation/grounding checks. Retrieval alone is not an LLM reply.
2. Authentication, role checks and server-side ownership enforcement for private data and bookings. The current public Express routes are not a production authorization boundary.
3. Persistent case/chat history tied to accounts. The browser currently uses session storage rather than a case-history database/API.
4. Verified advocate onboarding and credential approval. Automatic sample advocates are not evidence of real practitioners, ratings or live availability.
5. Real slots and an advocate acceptance/rejection/cancellation lifecycle, plus booking history and notifications. A pending database record is not a confirmed consultation.
6. A shared backend strategy for web and mobile. Convex already contains account, case, credential, slot, booking and notification modules, but the avatar website does not call them.

### Speech and product scope

- ElevenLabs is not active in this revision. The previous incomplete implementation is preserved in a Git stash, not mounted on the running backend.
- The visible avatar is an image-frame animation, not a live ElevenLabs avatar or lip-synced video.
- The avatar website offers English/Hindi, not a fully verified multilingual speech experience. Punjabi capability in the separate rebuild does not automatically apply here.
- Document upload/OCR/evidence analysis is not implemented in this avatar chat.
- A `Review` model exists, but this Express API has no review-submission/moderation flow.
- Razorpay code exists, but a live payment flow and authoritative fee agreement remain to be verified.

### Legal retrieval limits

The local collection contains 358 BNS sections (432 passages) and three judgments (44 passages): 476 passages total. It is not a broad Indian legal corpus. Current amendments, provision-specific commencement and judgment subsequent treatment are not certified. Structure-aware chunking, a larger reviewed retrieval evaluation and source updates remain important. Similarity scores are not legal confidence.

## 8. What was verified in this walkthrough

- Avatar chat loaded in the collaborative browser, with the avatar and English/Hindi controls.
- Express started on port 5000; MongoDB connected.
- The vector index matched the current local corpus.
- A synthetic theft query returned HTTP 200, hybrid retrieval and three source citations. The independent model returned unavailable and no advocate match was fabricated. This test does not distinguish absent credentials from a failed upstream provider; neither was claimed to work.
- All 58 current backend tests passed.
- The frontend production build passed.

Not verified here: real microphone recognition, physical audio playback, live Gemini, ElevenLabs, real advocate contact, live payments, account authorization or hosted deployment.

## Suggested next sequence

Choose which backend will serve both clients. Preserve the avatar UI, connect it to authenticated cases/booking services, and keep legal retrieval behind a stable shared service boundary. Then verify one complete pilot flow: sign in, describe the concern, review a grounded answer and its limitations, select a real advocate, request an actual slot, and receive an acceptance state. Add ElevenLabs to that working flow rather than maintaining two independent versions of the product.
