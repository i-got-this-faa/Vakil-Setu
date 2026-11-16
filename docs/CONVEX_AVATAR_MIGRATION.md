# Shared Convex backend, preserved avatar website

## What changed

The avatar Vite website in `frontend/` now uses the same Convex backend and Clerk application as the mobile MVP in `rebuild/apps/mobile/`. Its landing avatar (now the static "Meera" portrait, with no lip-sync or blink animation; see [SPEECH_ELEVENLABS.md](SPEECH_ELEVENLABS.md#avatar-artwork)), messenger layout, existing styles, browser dictation and read-aloud remain. The Next.js website is a separate client of those services; it is not substituted for the avatar UI.

The active avatar website no longer calls Express/MongoDB, Razorpay or `/api/emergency`. The original `backend/` source, corpus and ingestion tools remain available for reference and offline legal-data preparation. Existing browser-only guest history is not silently uploaded into a signed-in account.

## Start the website

```bash
npm install --prefix frontend
npm run dev
```

Open http://localhost:5173/chat. No MongoDB process is required. `npm run dev:legacy` retains the historical combined Express/Mongo startup command for reference; its frontend is now the Convex client, not a second supported backend mode.

Copy `frontend/.env.example` to ignored `frontend/.env.local` and set the PUBLIC values:

```dotenv
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_value
VITE_ENABLE_TTS=true
```

Use exactly the same Convex deployment and Clerk application as mobile's `EXPO_PUBLIC_CONVEX_URL` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`. Add the local/hosted website origins to the Clerk application configuration as needed. Keep the Clerk `convex` JWT template and backend issuer configuration described in `rebuild/docs/setup.md`. No Clerk secret, Gemini key or deployment key belongs in a Vite/Expo public variable.

The public avatar/landing page remains visible without credentials. Account operations show an explicit unavailable notice. With configuration, Clerk supplies sign-in; Convex owns identity, role and data access. Client-profile onboarding can only request the user role. Disabled or non-client accounts cannot use this client workspace.

## Shared user flows

- Sign in and create a client profile. All private view state is remounted on identity change; old query results are hidden immediately when arguments/identity change.
- In Chat, select a saved case or start a new case. A reviewed message can be saved privately without sending it to an AI provider. The most recent 20 cases have a next-page control.
- Check the current-message consent to send case/conversation information to Google Gemini and, when enabled, its embedding endpoint. Editing text or changing case/context revokes the checkbox. Vertex fallback is a separate choice and is omitted from requests unless enabled by server capabilities and selected by the user.
- Chat saves through `cases.create` and `chat.send`, then reads persisted `chat.listMine` turns. Request IDs and context keys are reused after uncertain/in-progress sends. Pending, expired and unavailable results are shown explicitly. Chat does not force navigation to results.
- Review/save a manual summary in Results. AI summary drafting has separate consent. Summary revisions and exact recipient consent bind booking requests.
- Discovery uses approved Convex advocates and real available slots. Ratings reflect published backend reviews, never hard-coded review counts.
- A consultation request reserves a real slot through the existing atomic mutation. Acceptance remains the advocate's action in the existing advocate workspace/mobile-shared service. The website shows persisted history and permitted cancellation. No payment confirmation is fabricated; payment collection is outside this Convex pilot.
- Notifications use the existing account-scoped query and mark-read mutation.

## RAG and legal data

New Convex tables store versioned legal passages, native vectors and a published dataset pointer. Import/re-embedding functions are INTERNAL operator functions, not ordinary client writes. Source URLs are limited to the approved official hosts. Source metadata, text hashes and page/section citations are preserved.

Keyword retrieval uses a Convex search index. Optional vector retrieval uses normalized **768-dimensional `gemini-embedding-001`** embeddings, with the correct document/query task types, and Convex native vector search. Hybrid results use reciprocal-rank fusion. These are NOT the existing local 384-dimensional E5 vectors; those cannot be imported into this native index. Missing vectors leave keyword retrieval explicit. Vector access requires both a fully published compatible index and `LEGAL_VECTOR_ENABLED=true` in the Convex deployment.

A consented chat performs a fresh ownership/revision check before Google query embedding and before model generation. These dispatches have distinct audit purposes. Existing rate limits, idempotent turn reservation, optional Vertex consent, deadline and persistence rechecks remain in force.

If passages support an answer, generated citation IDs and exact quotations are validated before saving the reply. Invalid evidence is rejected. Provider unavailability can produce a clearly labelled original source excerpt. General replies without passages remain explicitly ungrounded. This checks source/quotation existence, not whether every claim logically follows from its evidence.

Optional `legalEvidence` on a reply includes status, retrieval method, citations and warnings. Avatar and mobile render it; historical replies without this field remain readable. The mobile app retains its existing Clerk/Convex architecture.

### Offline export, then reviewed deployment import

```bash
# From repository root; reads public legal corpus files, not .env:
node backend/scripts/exportConvexCorpus.js backend/data/convex-export v1

# From rebuild/, dry run only:
node scripts/import-legal-corpus.mjs ../backend/data/convex-export \
  --deployment-name exact-reviewed-deployment
```

Deploy the new backend/schema through the normal authenticated Convex operator workflow before importing. Review the export, target deployment and remaining legal verification first. To write, add `--apply`; to re-embed before publishing also add `--embed`. Re-embedding uses the server's Gemini key, may incur charges/quota, and is NOT run by local export. Without `--apply`, the script makes no network requests or writes. Batches are bounded and retryable. The previous published corpus remains active if a staged import/embedding fails.

An active dataset is immutable. To refresh sources or upgrade a keyword-only publication to vectors, export with a new revision (e.g. `v2`), stage/re-embed and publish that new dataset. Publication verifies passage coverage and, for vector mode, matching model/coverage before moving the active pointer. Downloaded/exported legal data remains Git-ignored.

## Deployment configuration

Configure in the SAME Convex deployment used by both clients:

- `CLERK_JWT_ISSUER_DOMAIN`: existing Clerk/Convex identity configuration.
- `GEMINI_API_KEY` and optional `GEMINI_MODEL`: generation. The local Express `LLM_API_KEY` does not configure Convex.
- `AI_CHAT_LOCALES`: existing operator allowlist; default pilot en/hi/pa.
- `LEGAL_VECTOR_ENABLED=true`: optional, only after the matching re-embedded dataset is published.
- Existing Vertex fields only when intentionally configured; each user must also allow that fallback.

No live deployment, key changes or corpus import is performed by writing these files. Local setup without credentials proves only that public/disabled states render, not login or cross-device persistence.

## Surface ledger

- Avatar website auth/cases/chat/discovery/profiles/slots/bookings/history/notifications: migrated to shared API.
- Avatar assets and messenger styling: preserved; no ElevenLabs integration or live lip-sync is claimed.
- Mobile: existing auth/case/booking logic preserved; optional evidence display added and capability policy recognizes source-only retrieval.
- Convex schema/actions/import/auditing: updated with backward-compatible reply metadata.
- Next.js client: unchanged UI; checked for shared-contract type compatibility.
- Express: preserved and excluded from active website API calls.
- Payments: explicitly deferred in shared Convex flow.
- Physical speech/device quality, legal-version authority and production readiness: not established by this migration.

## Evidence and remaining acceptance

Local component tests cover missing-config avatar rendering, identity/query-state isolation, consent gating, request replay and booking consent mapping. Convex tests exercise staged source import, immutable publication, missing model behavior, ownership, exact citation validation, persistence/replay, and incompatible-vector rejection, alongside the existing backend test suite. Type/build checks are recorded in the final handoff.

Hosted acceptance still requires: matching public service configuration, deploying the reviewed backend/schema, reviewed corpus import, actual sign-in as two different users, cross-device case restoration, real-slot request/acceptance/cancellation/notifications, and real Google/embedding responses. No live login, hosted write, model/embedding quality or mobile-device behavior should be inferred from a build or mocked provider test.
