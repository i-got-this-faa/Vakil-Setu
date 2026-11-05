# Vakil Setu — Implementation Progress Report

**Assessment date:** 31 October 2026  
**Basis:** Local source-code review, stored corpus inspection, retrieval checks and
the legal-pipeline test suite. Features present in code are distinguished from
features verified against live external services.

## Report-ready summary

Vakil Setu currently has a browser-based legal-assistance prototype and an initial
legal-data ingestion and retrieval backend. The prototype includes browser speech
input/output, legal issue classification, advocate matching and basic booking and
payment API code. Recent work has added collection of official legal material,
metadata-preserving extraction, BM25 passage retrieval and an initial grounded-answer
API with source quotation checks.

The local knowledge collection contains three J&K High Court judgments, comprising
26 pages and 44 passages, and the NCRB BNS reference text, comprising 358 sections
and 432 passages. Eight legal-pipeline tests pass, and local retrieval checks return
relevant statute sections and judgment pages. The BNS snapshot has not been certified
as complete law through 31 December 2025.

A new standalone WhatsApp backend can be presented without the website. Its
nine-turn local demonstration exercises signed webhook events, consent, real source
retrieval, generated English audio, advocate selection and a saved consultation
request. Messaging remains simulated in this local demonstration. The default uses
fixture transcripts; `--real-speech` instead uses real local Whisper recognition of
synthetic input voice notes. Both modes exercise real search, audio generation and
request persistence. Twenty-six WhatsApp tests cover workflows and provider
contracts, for thirty-four tests across both suites.

Twilio Sandbox is the selected live transport. Its signed webhook, incoming audio,
temporary signed media hosting and outbound messaging adapters are implemented and
contract-tested, but actual delivery awaits account configuration. Local English
Whisper and MP3 generation are installed and have completed the synthetic nine-turn
test. Meta/audio API adapters remain alternatives. Real multilingual quality,
advocate acceptance, production booking, payments and document drafting remain incomplete.

## 1. Existing application prototype

### Browser interface and speech

- React/Vite pages and components for issue intake, results, advocate display and
  booking are present.
- Voice input uses the browser Web Speech recognition API, with Hindi, English
  and browser-language selection.
- Browser speech synthesis can read analysis output aloud.
- Conversation history is passed with follow-up requests through the browser
  chat flow. This is not a durable WhatsApp conversation service.

**Status:** Present in code. Browser/device compatibility and a complete live
end-to-end session were not revalidated in this assessment. A server-side Whisper
endpoint is mentioned in the old README but is not implemented in the mounted
backend routes; it should not be reported as a completed feature.

### Legal issue classification and matching

- Classification and combined triage endpoints are implemented.
- Classification code produces a legal-domain label, urgency, summary and suggested
  actions, with English/Hindi response handling.
- Gateway and Gemini inference adapters and rule-based fallback logic are present.
- Matching queries advocates by expertise and their availability flag, sorts by
  stored rating and returns up to five records.
- An emergency-selection endpoint returns a highest-rated available advocate.
  It does not dispatch help, contact an advocate or guarantee an urgent response.

**Status:** Implemented prototype logic. Live model accuracy, real advocate
availability and verified advocate onboarding have not been demonstrated. Location,
language, fees and actual slot availability are not yet complete matching filters.

### Bookings, database and payments

- MongoDB/Mongoose models exist for users, advocates, reviews and bookings.
- The booking endpoint creates a booking record with a proposed time and status.
- Razorpay order-creation and payment-signature verification code is present.
- The browser contains booking/payment client calls and UI components.

**Status:** Prototype code, not a production booking service. This assessment does
not establish a successful live database booking or payment. Advocate acceptance,
slot locking, authorization, server-controlled fees, signed payment-webhook handling,
reminders, rescheduling and refunds are incomplete. A client-requested payment-skip
path exists and must be controlled before real paid bookings are enabled.

## 2. Legal-data collection and indexing

### Judgment pipeline

- Discovery identified 38 historical judgment-link candidates in an archived
  HTML comment on the official J&K High Court homepage. Candidates are labelled
  as archived and are not automatically treated as reviewed judgments.
- Three judgments were downloaded and indexed after checking basic case metadata
  against their official PDFs.
- Stored records retain original PDFs, extracted text, court, case number,
  decision date, judges, source URL, acquisition timestamp and content hash.
- Passage extraction retains actual PDF page references.
- The collector includes robots-rule checks, request spacing, size limits,
  duplicate checks and repeatable imports. Inadequate extracted text is rejected
  for OCR/manual review.

**Verified local result:** Three judgments, 26 pages, 44 passages. Re-importing
unchanged sources did not create duplicate records. The other discovered candidates
have not all been collected or reviewed.

### Firecrawl and BNS pipeline

- Firecrawl was used to discover official sources and scrape the NCRB Sankalan
  HTML containing BNS section text.
- A reusable Firecrawl adapter and BNS ingestion command are implemented.
- Parsing checks the ordered section inventory from 1 through 358, including
  source formatting variations.
- The importer caches the raw Firecrawl result, stores a content hash and exports
  section-labelled passages with section-specific source links.
- Statutes are stored separately from judgments; the shared corpus loader can
  retrieve from both stores.
- A PDF scrape reporting fewer parsed pages than total pages is not the indexed
  source. The HTML section text is used instead.

**Verified local result:** 358 section records and 432 passages.

**Version limitation:** This is the NCRB reference reproduction of the BNS, 2023.
Its amendments and provision-specific commencement through 31 December 2025 have
not been verified. The metadata explicitly records that limitation. Section
coverage alone does not establish historical legal validity or source accuracy.

## 3. Initial RAG functionality

- BM25 keyword-based passage ranking is implemented over the local collection.
- Search can return passage text and source metadata, including judgment pages
  and BNS section links.
- Initial search and answer endpoints are mounted under `/api/knowledge`.
- The answer service supplies retrieved passages to a configurable language model
  and checks returned passage identifiers and supporting quotations.
- Invalid evidence can be rejected, and empty/no-match retrieval avoids calling
  the language model.
- English and Hindi answer generation can be requested. This does not establish
  reliable cross-language retrieval from English legal sources.

**Verified local checks:**

- The query `dishonestly movable property theft` ranks BNS section 303 first.
- The query `migrant property appeal surrender possession` retrieves pages 6 and
  5 of *Lyceum Public School v. UT of J&K & Others*.
- Eight tests pass for judgment chunking/retrieval, input validation, source checks,
  citation integrity, mocked generation and empty/no-match behavior.

**Limits:** The eight tests are not a full BNS parser or legal-accuracy benchmark.
Live language-model generation has not been verified with model credentials.
Multilingual embeddings, statutory applicability safeguards and dedicated
statute-section API filters remain incomplete. The existing search response's
`judgmentCount` currently counts all loaded documents after statutes are added;
the verified corpus inventory above is used for this report instead.

The current browser chat calls the triage API, not the knowledge-answer API.
Consequently, it should not be described as an end-to-end RAG-powered citizen chat.
Quote matching verifies source-text integrity, not whether every generated legal
claim follows from that quote.

The new standalone WhatsApp conversation service does call the shared retrieval
layer. Without model credentials it speaks a labelled source excerpt, including
source-version limitations, and sends references separately. Optional model-based
answers use the existing grounded-answer adapter but are not live-provider-tested.

## 3A. Standalone WhatsApp presentation backend

- Signed webhook verification and challenge handling; configured phone-number
  filtering and duplicate message-ID protection.
- A durable local inbox, atomic state-file updates and one worker. Uncertain
  delivery after interruption requires review rather than automatic repeated sends.
- Conversation stages for consent, questions, city, profile selection, time
  preference, explicit sharing confirmation and pending-request status.
- Real offline English WAV/MP3 generation. Default incoming transcripts use labelled
  fixtures; the optional real-speech scenario transcribes synthetic input voice
  notes using local Whisper. That complete scenario has passed locally.
- Twilio and Meta adapters, plus a configurable speech API adapter, tested through
  mocked provider contracts. Twilio uses signature validation through its official
  SDK, account-bound media downloads and expiring public audio links.
- Fictional demo advocates. Live matching requires separately configured verified
  profiles and supports city, conversation language and issue-domain matching.
- Consultation requests are persisted for staff handling. There is no automatic
  advocate notification, accepted appointment, reserved slot or payment.

**Verified:** A nine-turn signed local webhook scenario completes; the default
question retrieves BNS section 303; playable audio is saved; replaying confirmation
does not create a second request. Twenty-six workflow/provider tests pass.

**Not yet verified:** Actual Twilio/Meta delivery, external speech APIs, human-speech
and multilingual quality, and live model generation. The local real-ASR test uses
synthetic speech. This is a single-process presentation service, not a production
messaging system. Sample advocates can be explicitly enabled in Twilio Sandbox;
they remain fictional and no real advocate is contacted.

## 4. Documentation completed

- [Software Requirements Specification](SRS.md): target voice-first WhatsApp
  product, release scope, requirements, acceptance scenarios and open decisions.
- [WhatsApp presentation guide](WHATSAPP_DEMO.md): runnable backend demonstration,
  implementation walkthrough, output audio, provider configuration and limits.
- [Twilio Sandbox setup](TWILIO_SANDBOX.md): account setup, joining the sandbox,
  local speech, HTTPS callback and a real-phone test scenario.
- [Legal ingestion and RAG notes](legal-rag.md): judgment-pipeline setup and initial
  retrieval behavior. The newer BNS importer is invoked with
  `npm run legal:ingest:bns --prefix backend`.

Documentation describes both implemented components and target behavior; a
requirement in the SRS is not evidence of implementation.

## 5. Pending implementation

1. Configure and verify actual Twilio Sandbox callbacks (or Meta subscriptions), media exchange and voice
   delivery and provider-confirmed callback behavior. Delivery tracking is implemented; production recovery tools remain pending.
2. Verify real multilingual speech recognition/synthesis and replace the local
   single-process presentation store with the agreed production workflow, retention
   and deletion controls. Basic consent/readback stages already exist.
3. Multilingual/hybrid retrieval, expanded reviewed judgment coverage and verified
   statute versions and commencement dates.
4. Verify model-generated explanations in the voice conversation, with statutory
   applicability checks and advocate-reviewed answer evaluation. Extractive source
   replies are already connected to the standalone backend.
5. Real advocate onboarding, notification and acceptance, scheduling, protected payments,
   reminders, cancellation and rescheduling.
6. Agreement, notice and email drafting from reviewed templates.
7. Administrative access controls, production monitoring, retention/deletion,
   backups and provider-failure handling.
8. Any validated research on legal patterns across cases. The current small corpus
   does not establish judicial trends or case-outcome predictions.

## 6. Appropriate project-stage description

**Current stage:** A backend-only WhatsApp presentation prototype with real
retrieval, local English speech recognition/synthesis and persistent consultation
requests, exercised using synthetic speech and simulated messaging. Twilio live
adapters are ready for credential setup and a phone test. The earlier browser
prototype remains separate.

Do not describe the project as a completed WhatsApp assistant, a trained legal
model, a verified BNS-through-2025 legal database, a deployed advocate-booking
network or a production-ready legal service. The recent work is present in the
local workspace; this assessment does not establish that it has been committed,
pushed, deployed or made available in the copied GitHub repository.

## Latest WhatsApp extension

Voice commands now support answer/message repetition, stage-specific help, a new
case, saved-request status and confirmation before cancelling a pending request.
Status uses the stored record, and requests are scoped to their sender. Repeating
an answer preserves case context and does not create another request.

Signed Twilio and Meta delivery callbacks persist message status separately from
consultation state. Duplicate, delayed and early callbacks are handled without
regressing delivered/read status. Unsupported attachments receive a voice prompt.

The Twilio-specific local demonstration has completed 13 turns with real local
ASR on synthetic speech, actual MP3 replies, signed media retrieval, repeat checks,
request cancellation and simulated delivery callbacks. No external message was
sent. These results do not verify live Meta or Twilio delivery.

Commands: `npm run demo:twilio -- --real-speech`,
`npm run doctor:whatsapp -- --provider meta`, `npm run start:meta`, and
`npm run start:twilio`. See [Meta setup](META_WHATSAPP.md) or
[Twilio setup](TWILIO_SANDBOX.md) for the selected provider.
