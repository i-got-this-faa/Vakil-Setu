# Software Requirements Specification
# Vakil Setu — Voice-First Legal Assistance on WhatsApp

**Version:** 0.1  
**Date:** 31 October 2026  
**Status:** Draft for stakeholder review  
**Primary interface:** WhatsApp voice messages  
**Initial legal jurisdiction:** India, with an initial focus on Jammu & Kashmir and Ladakh

## 1. Purpose

Vakil Setu shall help people describe a legal problem by speaking on WhatsApp,
understand relevant legal information in accessible language, request document
drafts, and connect with suitable advocates. The system shall combine multilingual
speech processing, retrieval-augmented generation (RAG), a reviewed legal corpus,
and backend services for advocate matching and appointments.

This SRS specifies the intended product. It is not a declaration that the listed
capabilities are already implemented, legally validated, or ready for production.
Requirements use **shall** for mandatory behavior within their assigned release;
unresolved business choices are listed in Section 14.

The intended readers are project evaluators, developers, testers, legal-content
reviewers, administrators, and participating advocates.

## 2. Product scope and release boundaries

### 2.1 Core product principles

- Citizens shall be able to complete the core guidance and booking conversation
  using voice messages without opening a website or completing typed forms.
- The assistant shall ask one clear question at a time, explain unfamiliar legal
  terms, and read back important details for confirmation.
- Statutory explanations shall be grounded in traceable legal sources. Retrieval
  shall precede the final legal explanation, although a model may help clarify
  intent or formulate retrieval queries.
- Advocate details, availability, prices, and booking confirmations shall come
  from backend records and verified provider events rather than model invention.
- The citizen website shall not be required for core tasks. A small interface for
  advocates and administrators may support scheduling and operations.

### 2.2 Planned releases

**MVP:** WhatsApp voice intake; consent and language selection; conversation
continuity; grounded legal explanations; reviewed legal-source ingestion;
advocate matching; consultation requests with advocate acceptance; and basic
administration. English and Hindi are proposed initial languages, subject to
speech-provider evaluation and stakeholder confirmation.

**Release 2:** Live-slot booking with concurrency protection; paid consultations;
reminders; rescheduling and cancellation; and document drafting from reviewed
templates. Agreements, notices, and emails requesting legal assistance are the
initial proposed document categories.

**Research release:** Comparative analysis of judgments by legal issue, statute,
procedural stage, and reviewed outcome labels. Additional regional languages may
be introduced after evaluation.

### 2.3 Exclusions

The product shall not claim to replace an advocate, predict case-winning
probabilities, infer a judge's personal beliefs, or guarantee an outcome. Automated
court filing, automatic service of legal notices, autonomous emails to opposing
parties, and WhatsApp live-call handling are outside these releases. Generating a
draft shall not authorize sending or filing it.

Training a new language model or fine-tuning a small language model is not an MVP
dependency. A smaller model may later be evaluated behind the same retrieval and
service interfaces.

## 3. Stakeholders and roles

- **Citizen:** sends voice messages, supplies case details, receives guidance and
  drafts, and manages consultation requests.
- **Advocate:** maintains a verified professional profile, languages, practice
  areas, fees and availability; accepts or declines requests; and receives only
  information the citizen has agreed to share.
- **Administrator:** manages users, advocate verification, support cases,
  service configuration and authorized operational records.
- **Legal-content reviewer:** approves sources and extracted legal metadata,
  checks versions and authority, and evaluates the support for generated claims.
- **Research analyst:** uses authorized, aggregated corpus analysis without
  unrestricted access to citizens' conversations.
- **External providers:** WhatsApp messaging, speech recognition and synthesis,
  language-model inference, Firecrawl, storage and optional payment processing.

Administrative and legal-review roles may be held by the same person in a pilot,
but their permissions shall remain explicitly defined.

## 4. System architecture

### 4.1 Runtime conversation flow

1. WhatsApp delivers an incoming message event to the backend webhook.
2. The backend validates the event, detects duplicates, stores a processing task,
   and acknowledges receipt.
3. A worker obtains the audio and transcribes it, retaining the user's language.
4. The conversation coordinator loads the user's consent, current task and case
   context, then asks a follow-up or invokes an appropriate workflow.
5. For legal guidance, retrieval selects passages from reviewed statutes and
   judgments. The model receives the question, necessary context and passages,
   then generates a short explanation with supporting references.
6. For an advocate request, matching and booking services query the advocate
   database and manage an appointment. A legal-source search is not required
   merely to look up availability or booking status.
7. The backend validates the result and synthesizes an audio response in the
   selected language. References, receipts and requested documents accompany it
   as WhatsApp messages or attachments.

Speech recognition and synthesis surround the conversation. Translation, when
needed, is a separate operation that shall preserve the original transcript and
shall not silently alter names, dates or legal references.

### 4.2 Legal-data preparation flow

Source discovery → source approval → Firecrawl/direct official-source extraction
→ quality and version checks → metadata and section/paragraph segmentation →
search indexing → retrieval evaluation → publication to the approved corpus.

Statutes and judgments shall remain distinguishable collections. Firecrawl shall
be an ingestion tool, not a dependency for every citizen question. The target
retrieval design shall support multilingual semantic retrieval and keyword search;
the present prototype uses BM25 keyword ranking.

### 4.3 Proposed technical components

- Node.js/Express backend, building on the current repository.
- MongoDB for application records; a queue and workers for media and AI tasks.
- Restricted storage for recordings, generated documents, original legal sources
  and extraction artifacts.
- A replaceable search/embedding layer and language-model adapter.
- WhatsApp Business Platform integration and independently configurable ASR/TTS.
- Firecrawl for configured legal-source extraction; Razorpay for optional payment.

Queue, object-storage, vector-index and speech-provider selections remain open.

## 5. Functional requirements

### 5.1 Consent, identity and voice interaction — MVP

- **FR-01:** The system shall associate a conversation with its WhatsApp sender
  identifier and shall not treat that identifier alone as verified legal identity.
- **FR-02:** Before retaining case details, it shall explain its purpose and data
  use through audio and obtain an explicit response. Necessary transient processing
  to deliver that explanation shall be minimized. Consent withdrawal shall be
  supported, with legally required retention exceptions explained when applicable.
- **FR-03:** It shall offer initial language selection, remember the selection,
  and allow users to change language by voice.
- **FR-04:** It shall transcribe supported voice notes and ask users to repeat or
  clarify unintelligible speech instead of silently inventing missing facts.
- **FR-05:** It shall ask one question at a time and obtain spoken confirmation
  of names, dates, phone details, fees and appointment times before using them in
  a consequential action.
- **FR-06:** It shall maintain context across messages, allow a new case to be
  started explicitly, and distinguish separate cases belonging to the same user.
- **FR-07:** It shall deliver the essential response as audio. Short text,
  citations and buttons may supplement it but shall not be required to understand
  the core response. Payment authentication is an explicit screen-interaction
  exception.

### 5.2 Legal intake and explanations — MVP

- **FR-08:** The system shall identify the apparent issue and collect missing
  facts needed for relevant retrieval, including location, incident date and
  procedural stage where applicable. Classification shall not itself establish a
  legal conclusion.
- **FR-09:** It shall retrieve relevant sources before generating a substantive
  legal explanation and preserve passage identifiers throughout generation.
- **FR-10:** It shall explain supported information in short, accessible sentences
  and return source references alongside the spoken response.
- **FR-11:** If retrieval is irrelevant, evidence is insufficient, or generation
  fails validation, it shall explain the limitation and request clarification or
  offer advocate assistance. It shall not substitute an unsupported legal answer.
- **FR-12:** It shall distinguish facts, party submissions, quoted precedent,
  judicial observations and the operative decision when those distinctions are
  established by reviewed data. Uncertain attribution shall be disclosed.
- **FR-13:** It shall avoid asserting that a provision is applicable or in force
  on a requested date unless supported by verified version and commencement data.
  It shall identify unverified source status in both the spoken explanation and
  source metadata.
- **FR-14:** Where a user describes immediate danger, the assistant shall provide
  brief, locally reviewed emergency guidance and make clear that a consultation
  request does not dispatch emergency services or guarantee an immediate response.

### 5.3 Legal-source ingestion and RAG — MVP

- **FR-15:** Administrators shall configure approved sources and collect only
  authorized content while respecting access controls, source restrictions and
  applicable reuse requirements. The pipeline shall not bypass CAPTCHAs or logins.
- **FR-16:** Each statute shall record its title, Act identifier, jurisdiction,
  section, source URL, language, acquisition time, content hash, edition and
  verified temporal coverage. Each judgment shall additionally record court,
  case number, decision date and bench/judges where available.
- **FR-17:** The corpus shall support BNS statutory text and previous judgments,
  initially from the J&K High Court. Other legal domains shall be enabled only
  when their required sources are available and evaluated. NALSAR material is a
  candidate resource, subject to identifying the intended collection and reuse
  rights; no institutional integration is assumed.
- **FR-18:** The BNS collection shall target coverage through **31 December 2025**.
  Acquisition date shall not be presented as historical validity. Verified
  amendments, commencement notifications and provision-specific exceptions shall
  determine the coverage claim; later changes shall be stored separately.
- **FR-19:** Extraction shall retain originals and reject or quarantine incomplete
  downloads, truncated Firecrawl results and documents requiring OCR review.
  BNS section coverage shall be checked against the expected section inventory.
- **FR-20:** Imports shall be repeatable without duplicating unchanged records;
  changes shall create traceable versions. Scrape credentials shall remain outside
  tracked source files, output artifacts and logs.
- **FR-21:** Retrieval shall support court/jurisdiction, document type and date
  constraints, plus direct statute-section lookup. Multilingual retrieval shall
  be evaluated independently of multilingual answer generation.
- **FR-22:** Answer validation shall reject unknown source identifiers and invented
  quotations. Legal reviewers shall separately evaluate whether cited passages
  support the explanation; matching a quote alone shall not establish correctness.

### 5.4 Advocate matching and consultation requests — MVP

- **FR-23:** Advocates shall undergo administrator review before publication.
  Profiles shall include identity/registration review status, practice areas,
  location, languages, consultation mode, fees and availability freshness.
- **FR-24:** Matching shall use the user's issue and stated preferences, explain
  relevant matching reasons, and present no more than three options per spoken
  turn. The system shall not invent ratings or guarantee suitability.
- **FR-25:** The system shall read back the selected advocate, consultation mode,
  proposed time and any fee, then obtain an explicit booking request confirmation.
- **FR-26:** The MVP shall support advocate acceptance or rejection of a request.
  Without reliable slot data, it shall describe the appointment as requested and
  shall not claim confirmation until the advocate accepts.
- **FR-27:** It shall obtain specific consent before sending case details to an
  advocate and provide a confirmation or rejection response to the citizen.

### 5.5 Scheduling and payments — Release 2

- **FR-28:** Slot booking shall use atomic holds with expiry to prevent two
  confirmed bookings for the same advocate and time. Expired holds shall release
  capacity.
- **FR-29:** Users shall be able to request status, cancellation or rescheduling
  by voice. Changes shall preserve an audit trail and follow a disclosed policy.
- **FR-30:** Where payment is required, the backend shall calculate the payable
  amount from approved fee records, issue a secure payment link and verify the
  provider's signed event before marking payment successful. User assertions or
  model output shall not establish payment status.
- **FR-31:** Payment and booking states shall be independent. Confirmation shall
  require advocate acceptance or a valid reserved slot, plus payment where the
  applicable policy requires it. Payment exceptions shall be server-controlled.
- **FR-32:** Duplicate payment events shall have no duplicate financial or booking
  effect. Refunds and late payments shall enter a documented reconciliation flow.
- **FR-33:** Reminders and outbound updates shall use consent and messaging
  templates as required by the selected WhatsApp integration and current platform
  rules. All appointment times shall include an explicit timezone.

### 5.6 Documents — Release 2

- **FR-34:** The system shall collect document details conversationally, confirm
  critical fields, and generate drafts from legally reviewed templates and
  supported sources. It shall not fabricate parties, facts or legal citations.
- **FR-35:** Drafts shall be marked for review, sent as accessible attachments,
  and accompanied by an audio explanation of their purpose and next steps.
  Advocate-review requirements shall be configurable by document category.
- **FR-36:** The system shall distinguish a draft email or notice from a sent or
  legally served communication. This release shall not automatically send or file
  documents outside the conversation.

### 5.7 Administration and research

- **FR-37 — MVP:** Authorized administrators shall manage advocates, content
  review queues, source versions, user support and auditable configuration changes.
- **FR-38 — Research:** Corpus analysis shall show sample counts, date ranges,
  missing-data limitations and reviewed labels. Comparisons shall preserve
  citations and shall not be presented as case-outcome predictions or judge profiles.

## 6. Core data requirements

- **User and consent:** WhatsApp identifier, selected language, consent purpose,
  status, timestamp and policy version; verified identity only where needed.
- **Case and conversation:** owner, case identifier, task state, confirmed facts,
  transcript language, message/provider IDs, processing status and retention expiry.
- **Media artifact:** restricted storage reference, content type, processing
  provenance, access permissions and deletion schedule.
- **Legal source and passage:** metadata from FR-16, review status, version links,
  section/paragraph or actual PDF page, extraction method and coverage warnings.
- **Answer record:** model/configuration version, retrieved passage/version IDs,
  validation result, response language and necessary audit details.
- **Advocate and availability:** verified profile, fee policy, consultation mode,
  slots or request-only status, and last availability update.
- **Booking:** case/user reference, advocate, timezone-aware time, acceptance and
  confirmation history, payment requirement and approved sharing scope.
- **Payment:** booking/order references, currency, server-calculated amount,
  signature/event verification result and reconciliation history. Full payment
  credentials shall not be retained by the application.
- **Draft:** template version, confirmed inputs, source references, review status,
  generated artifact and access expiry.

Retention durations shall be approved before deployment. They shall be configurable
per record category, include backup handling, and support deletion or restricted
retention where appropriate. Citizen messages shall not be used for model training
without separate explicit authorization.

## 7. State management and failure handling

Conversation processing shall distinguish received, queued, processing, awaiting
clarification, responded and failed states. Provider message IDs shall prevent
duplicate responses and consequential actions.

Booking states shall distinguish draft, requested, awaiting advocate acceptance,
held, awaiting payment, confirmed, declined, expired, cancelled and completed, as
applicable to the release. Payment shall independently track not-required,
pending, paid, failed and refund/reconciliation states. All transitions shall be
validated on the server.

If a speech, AI or messaging provider fails, tasks shall use bounded retries and
an operational failure queue. A retry shall not duplicate a booking, charge or
document delivery. Users shall receive a useful failure response when delivery is
possible. Missing credentials shall disable the dependent feature explicitly.

## 8. External interfaces

- **WhatsApp:** inbound webhook verification, sender and message IDs, media
  retrieval, audio/text/document delivery and delivery-status handling.
- **Speech providers:** supported-language transcription and synthesis, timeout
  handling, language/confidence metadata where available, and agreed data-use terms.
- **Model provider:** configurable inference adapter receiving only necessary
  conversation context and approved passages; no database credentials or unrestricted
  authority to execute actions.
- **Firecrawl:** bounded, configured-source extraction with cached raw responses,
  source provenance and explicit completeness checks before indexing.
- **Payments:** order creation, signed server-side events, reconciliation and
  refund interfaces as supported by the chosen provider.
- **Operations interfaces:** authenticated advocate scheduling and administrator
  tools, with separate permissions and audit records.

Existing REST endpoints may be reused internally. Their current shape is not a
final public API contract; authentication and the required workflow checks must
be applied before deployment.

## 9. Non-functional requirements

The following are proposed pilot acceptance targets, not measured capabilities.

- **NFR-01 — Accessibility:** Every MVP citizen journey in the acceptance suite
  shall be completable through audio without typed input. Payment authentication
  and reading/downloading attachments are documented exceptions.
- **NFR-02 — Responsiveness:** On a documented test environment with 20 concurrent
  conversations, webhook acknowledgement shall have p95 latency at most 2 seconds.
  Guidance responses for voice notes of at most 60 seconds shall target p95 audio
  delivery within 30 seconds of backend receipt, excluding outages. The provider
  and measurement setup shall be recorded.
- **NFR-03 — Reliability:** The pilot shall target 99% monthly backend availability,
  measured separately from external-provider availability. Retry/restart testing
  shall produce no duplicate confirmed appointments or payment effects.
- **NFR-04 — Grounding:** All source identifiers and quotations in the acceptance
  suite shall resolve to the supplied versions. An advocate-reviewed benchmark
  shall evaluate claim support, appropriate abstention, applicability and attribution
  before public release; its size and release thresholds require approval.
- **NFR-05 — Speech accuracy:** Each launch language shall be evaluated with local
  speakers and realistic noise. Critical fields shall always receive spoken
  confirmation regardless of transcription confidence. WER and task-completion
  thresholds shall be fixed after the pilot dataset is assembled.
- **NFR-06 — Security:** Network traffic shall use TLS. Restricted records shall
  be protected at rest. Webhook signatures, role-based authorization, rate limits,
  authenticated administrative access and expiring artifact access shall be tested.
- **NFR-07 — Isolation:** One citizen shall not retrieve another's cases, audio,
  documents or bookings. Corpus content and user text shall be treated as untrusted
  input and shall not grant permission to execute backend actions.
- **NFR-08 — Operations:** Monitoring shall record latency, provider failures,
  queue depth, retrieval/validation outcomes and cost without exposing secrets or
  unnecessary case content. Data backups and a restore drill are required before
  pilot launch; recovery objectives remain to be agreed.
- **NFR-09 — Maintainability:** Messaging, speech, retrieval and inference shall
  use replaceable adapters. Corpus updates shall support review, rollback and
  version-aware answer audits.

## 10. Principal acceptance scenarios

- **AT-01 — Voice guidance:** A consenting user selects a supported language,
  describes a problem, answers one follow-up at a time and receives a grounded
  audio explanation with traceable references. Covers FR-01–13 and NFR-01.
- **AT-02 — Insufficient evidence:** An unsupported question produces an explicit
  limitation and a useful follow-up or advocate offer, without invented citations.
  Covers FR-09–13 and FR-22.
- **AT-03 — Corpus integrity:** A complete BNS source produces the expected
  section inventory. Truncated, duplicate or OCR-incomplete input is rejected or
  quarantined; unchanged re-imports create no duplicate records. Covers FR-15–22.
- **AT-04 — Historical applicability:** A query asking about law through 2025
  cannot receive an unqualified historical-law claim from an unverified snapshot.
  Covers FR-13, FR-18 and FR-22.
- **AT-05 — Consultation request:** A user hears suitable advocates, confirms a
  choice and sharing scope, and receives a request acknowledgement followed by
  actual advocate acceptance or rejection. Covers FR-23–27.
- **AT-06 — Booking/payment integrity:** Concurrent requests cannot confirm the
  same slot twice. Invalid or duplicate payment events cannot mark an unpaid
  booking paid or create repeated charges. Covers FR-28–33.
- **AT-07 — Document draft:** Confirmed details generate a review-marked draft
  with an audio explanation; no notice/email is sent outside WhatsApp. Covers
  FR-34–36.
- **AT-08 — Resilience/privacy:** Duplicate messages and provider failures do not
  duplicate actions. Unauthorized case access is denied and consent withdrawal
  follows the approved retention policy. Covers FR-02, Section 7 and NFR-06–08.
- **AT-09 — Research limits:** Any pattern report states corpus size, scope,
  limitations and supporting judgments, without presenting win probabilities or
  personal judicial profiles. Covers FR-38.

## 11. Current implementation baseline

The repository currently contains an Express/MongoDB prototype for legal triage,
advocate matching, basic bookings and Razorpay payment operations, plus a React
interface with browser speech utilities. These components do not establish a
complete WhatsApp workflow or production readiness.

The locally exercised judgment pipeline has three J&K High Court judgments,
26 PDF pages and 44 passages, with BM25 search and an initial grounded-answer
endpoint. Its tests cover retrieval, basic request validation and citation integrity;
they are not a legal-accuracy or multilingual benchmark. Live model generation has
not been verified with configured model credentials.

Firecrawl has retrieved the NCRB BNS section HTML. Local ingestion has checked
358 ordered section records and produced 432 passages in a separate statute store.
The shared loader can read statute and judgment stores, but statute-specific API
filters, operational answer safeguards, version/commencement verification and
their acceptance tests remain incomplete. The partial PDF scrape is not the
indexed source. The BNS snapshot is explicitly **not certified as complete law
through 31 December 2025**.

The presentation milestone now adds a standalone WhatsApp-shaped webhook backend
with signature/challenge checks, duplicate-event protection, a single-process
persistent worker, a consent and consultation-request state machine, and offline
English audio generation. A nine-turn local simulation exercises real retrieval,
audio generation and a pending consultation request; twenty-six additional tests cover
the workflow and provider contracts. It runs without the website or MongoDB.

Twilio Sandbox is now the selected immediate messaging integration; Twilio and Meta
adapters are present but have not been exercised with real credentials. Local
English Whisper transcription and MP3 speech generation have completed a nine-turn
synthetic-speech scenario. The default fast demo still uses transcript fixtures.
The no-key legal
response reads a labelled source excerpt rather than generating an AI opinion.
Advocates are fictional in the demo; live mode excludes demo/unverified profiles.
Production conversation orchestration, provider-tested multilingual speech,
advocate notification/acceptance, safe live-slot booking, document generation,
production access controls and operational safeguards remain planned work. See
[the backend presentation guide](WHATSAPP_DEMO.md) and [Twilio setup](TWILIO_SANDBOX.md).

## 12. Business rules

- Public-interest guidance is intended to be free. Which services are chargeable,
  eligibility for free consultations and the meaning of a paid/complex case require
  stakeholder approval; no price is specified by this SRS.
- Fees shall be disclosed before user commitment. A paid request shall not be
  represented as confirmed merely because the user reports having paid.
- Advocate access to case details shall be limited to the approved sharing scope.
- Source acquisition or model fluency shall not establish legal authority.
- A booking, emergency flag or generated draft shall not imply advocate acceptance,
  emergency dispatch or successful legal filing.

## 13. Dependencies and release prerequisites

The MVP depends on a working WhatsApp business integration, evaluated speech
services, model credentials and acceptable inference terms, approved legal sources,
review capacity, and a participating verified advocate network. Paid booking also
depends on a working merchant/payment setup and an agreed cancellation/refund policy.

Public release requires completion of the applicable acceptance scenarios,
stakeholder approval of outstanding policies, legal-content review, access-control
testing, provider-failure testing and a pilot with intended users. Access to API
keys alone does not satisfy these release prerequisites.

## 14. Open decisions and change control

1. Confirm initial legal topics, pilot geography and launch languages.
2. Identify the intended NALSAR material and authorize its use.
3. Verify BNS amendments and commencement through 31 December 2025; decide whether
   the product will additionally maintain post-2025 versions.
4. Select speech, embedding, inference, queue and storage providers; establish
   budgets and evaluation criteria before committing to a small-model migration.
5. Approve free/paid service boundaries, advocate verification, acceptance deadlines,
   cancellation, rescheduling and refund policies.
6. Approve data retention, consent wording, access roles, handling of sensitive
   cases and requirements relating to minors.
7. Approve benchmark size, legal/speech acceptance thresholds, availability targets
   and backup/recovery objectives.
8. Confirm document categories and required advocate review before draft delivery.

Changes to scope, legal coverage, languages, paid actions or data use shall update
this SRS, its acceptance scenarios and the implementation backlog. Draft status
shall remain until stakeholder review is recorded.

## 15. References and terminology

- [Repository ingestion and RAG notes](legal-rag.md).
- [NCRB Sankalan portal](https://www.ncrb.mha.gov.in/uploads/SankalanPortal/Index.html).
- [BNS reference section text](https://www.ncrb.mha.gov.in/uploads/SankalanPortal/ChaptersBNS.html).
- [BNS enactment Gazette](https://www.ncrb.mha.gov.in/uploads/SankalanPortal/DownloadPDF/GazetteBNS2023.pdf).

**ASR:** automatic speech recognition. **TTS:** text-to-speech synthesis.
**RAG:** retrieval of source passages followed by evidence-grounded generation.
**SLM:** small language model. **BNS:** Bharatiya Nyaya Sanhita.
**BM25:** keyword-based passage ranking. **MVP:** minimum viable product.
**p95:** the value at or below which 95% of measured observations fall.
