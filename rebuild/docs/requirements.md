# Product requirements

**Status:** Draft for rebuild review, 14 October 2026
**Source:** [`srs-source.txt`](srs-source.txt), VS SRS 001, version 1.0
**Scope:** New web release. No old application code is an implementation dependency.

Requirements in this file are proposed until the product owner approves them. `P0` gates the working release. `P1` can follow the release. The release acceptance matrix defines the evidence required for each P0 flow. The language registry and current evidence are in [`language-matrix.md`](language-matrix.md).

## Release outcome

A user creates an account, submits a reviewed legal issue in a selected language, finds an approved advocate, approves a specific case summary for sharing, requests an available slot, and sees the advocate's persisted decision. An administrator must approve an advocate before public discovery. Every private read and state change must enforce ownership and role permissions on the backend.

The MVP includes user and advocate accounts, administrator approval, multilingual text intake and triage, explicitly supported speech with a typed fallback, advocate discovery, private summaries, slot requests, booking decisions, and in-app status notices.

The MVP excludes payments, commissions, refunds, public questions and answers, reviews, ratings, a guide library, document OCR, deadline calculation, legal drafting, built-in video calls, court integrations, mass profile imports, in-place rescheduling, and guaranteed emergency response. To change a booking time, cancel the request and make a new one. A React Native client is a future product, not an MVP deliverable.

## Requirements

| ID | Priority | Requirement |
|---|---|---|
| ACC-01 | P0 | Register user and advocate accounts with a unique normalized email, name, password, and preferred language. Create administrator access only through a protected bootstrap process. |
| ACC-02 | P0 | Use Clerk for authentication and session issuance. Never store or return plaintext passwords. Reject expired or disabled accounts on private operations. |
| ACC-03 | P0 | Validate the Clerk identity in Convex and derive the application role from trusted account data. Check role, ownership, and assignment on every private backend operation. Client-supplied IDs or roles never grant access. |
| ADV-01 | P0 | Collect an advocate's expertise, languages, location, experience, consultation mode, enrollment details, and supporting credentials. Start each application as pending. |
| ADV-02 | P0 | Allow only an authorized administrator to approve, reject, or suspend an application. Record the decision, reason, and audit event. Publish only approved, active profiles. |
| ADV-03 | P0 | Keep credential files private. Re-review changes to enrollment identity or credentials before restoring public discovery. Describe only the checks actually completed. |
| ADV-04 | P0 | Label sample profiles and keep them separate from real advocate applications and discovery results. |
| LNG-01 | P0 | Maintain entries for the 22 Eighth Schedule languages and English, using stable BCP 47 locale tags. Track interface text, typed input, AI output, speech recognition, and speech playback as separate capabilities. |
| LNG-02 | P0 | Preserve the user's selected language through intake, follow-ups, results, and saved cases. Do not map other languages to Hindi. Preserve Unicode text and any selected script. |
| LNG-03 | P0 | Show a capability as available only when evidence verifies it for the language and configured environment. Keep unreviewed translations and unverified AI or speech output marked unverified; an optional browser path is not evidence of language support. Record recognition and playback separately. |
| LNG-04 | P0 | When speech is unavailable or fails, explain the limitation and offer typed input. Preserve reviewed text after failure. Microphone use requires browser permission and a visible recording state. |
| LNG-05 | P0 | Before release, approve the minimum pilot-language coverage required for speech. At least one confirmed pilot locale must pass separate recognition and playback checks. The release cannot claim speech scope is complete until that coverage passes. |
| IN-01 | P0 | Let users type an issue or record speech through a configured adapter. Let users review and edit the transcript before submission. Never submit interim recognition output automatically. |
| TRI-01 | P0 | Accept reviewed text, selected language, and only authorized case context. Enforce the configured input limit before calling an AI provider. Initial proposal: 10,000 characters per message and the latest 10 conversation messages. |
| TRI-02 | P0 | Return a domain, urgency, short summary, suggested actions, response language, source mode (`provider` or approved `fallback`), and limitations. Support criminal, civil, family, property, and unknown domains. Support low, medium, high, emergency, and unknown urgency values. |
| TRI-03 | P0 | Validate provider output against allowed types and values. Show an explicit error or a labelled, approved limited fallback for invalid output or provider failure. If no approved fallback is configured, show provider unavailability. Never silently classify an unknown issue as civil, invent legal analysis, or show a fabricated success. |
| TRI-04 | P0 | Keep follow-up context within the authorized case and a configurable recent-message bound. Never mix users' or cases' context. Configure the initial provider timeout to 30 seconds and offer retry or a clearly limited result after timeout. |
| TRI-05 | P0 | Label every AI result as preliminary information. Do not present urgency as a professional assessment or display unsupported confidence scores. Include legal citations or statutory deadlines only when checked against reviewed sources. |
| MAT-01 | P0 | Match only approved, active advocates by the user's selected practice area and requested communication language. Let users correct the suggested area. Apply location only when the user requests it. |
| MAT-02 | P0 | Do not weaken a required language filter without user action. Rank eligible advocates by documented expertise match and earliest requestable slot, with a stable tie-breaker. Explain each match without fabricated ratings or outcome claims. |
| MAT-03 | P0 | Show relevant expertise, languages, location, consultation mode, and valid future availability. Support pagination, filter reset, explicit empty results, and user-directed location broadening. |
| PRO-01 | P0 | Show public profile details and the checks completed. Keep advocate contact details private until a confirmed booking. |
| CAS-01 | P0 | Draft an editable summary with confirmed facts, location, key dates, and questions. Keep missing facts missing or mark them unresolved. |
| CAS-02 | P0 | Require the user to approve a specific summary version for a named advocate. Store the recipient, version, and consent time. Later edits never replace the approved version. |
| CAS-03 | P0 | Give an advocate access only to a summary shared with that advocate for an assigned request. Keep raw transcripts and private notes private. |
| CAS-04 | P0 | Let users view their own cases and delete or withdraw unshared drafts. Define and disclose retention for shared cases, credentials, bookings, and audit records before collecting real data. |
| PRIV-01 | P0 | Before sending case text or speech to a provider, or sharing a summary with an advocate, explain the recipient and purpose. Send only the minimum data needed. Never send credential files or private account data to an AI provider. Do not send real case text until provider processing and retention terms are approved. Triage consent does not authorize provider training use. |
| PRIV-02 | P0 | Do not give administrators routine access to case text or summaries. Limit advocate review to the assigned, user-approved summary. |
| SLT-01 | P0 | Let approved advocates publish future slots with a consultation mode. Store times in UTC and show an explicit user-facing time zone. Reject past slots, invalid durations, and overlapping active slots for the advocate. |
| SLT-02 | P0 | Make slot publication and reservation safe under concurrent requests. Count only future, valid, unreserved slots as available. |
| BKG-01 | P0 | Create a request from a trusted slot ID and user-approved summary version. Derive user, advocate, time, and mode from backend records. |
| BKG-02 | P0 | Reserve a slot atomically. At most one active requested or accepted booking can use a slot. A competing request receives a conflict and refreshed availability. |
| BKG-03 | P0 | Let only the assigned, approved advocate accept or decline a pending request. Reject unauthorized, expired, repeated, and conflicting transitions. |
| BKG-04 | P0 | Expire a requested booking at the earlier of its slot start or 24 hours after creation. Enforce expiry without an open browser. The 24-hour value remains a proposed business rule pending confirmation. |
| BKG-05 | P0 | Let users cancel their own future bookings. Require a reason when an advocate cancels an assigned future booking. Handle affected future bookings explicitly when an advocate is suspended. |
| BKG-06 | P0 | Persist bookings and status history across logout, refresh, and application restart. Retried requests or transitions must not create duplicates or corrupt state. Record completion only after the slot ends. |
| BKG-07 | P0 | Notify affected participants in-app after a status change. Notification failure must not change the booking result. |
| SEC-01 | P0 | Require HTTPS for a public pilot. Use secure session controls, restricted cross-origin access, and CSRF protection for cookie-based state changes. Enforce expiry, logout, disabled-account status, and privilege changes on backend access checks. |
| SEC-02 | P0 | Rate-limit authentication and expensive AI operations. Validate identifiers, enum values, text length, uploads, and database queries. Return safe errors without secrets or stack traces. |
| SEC-03 | P0 | Log request IDs, decision events, and failures. Exclude passwords, session tokens, credential contents, and full case text from logs. Exclude private fields from public responses. |
| FILE-01 | P0 | Accept only protected PDF, JPEG, and PNG credential uploads up to 5 MB per file. Validate type and content, use randomized storage names, audit private retrieval, and expose no public file URL. |
| REL-01 | P0 | Persist accounts, applications, cases, slots, and bookings in the configured database. Browser storage and development mocks do not satisfy release acceptance. |
| REL-02 | P0 | Commit booking transitions and slot reservation or release consistently. Failed operations must not leave orphan reservations. Retried operations return the prior result or a defined conflict. |
| REL-03 | P0 | Show an explicit unavailable state when the database or provider fails. Never show an unpersisted request as a successful booking. Provider and notification failures must not corrupt account or booking data. |
| UX-01 | P0 | Support 360 px mobile width and desktop widths, keyboard access, visible focus, labelled inputs, readable contrast, and status indicators that do not rely on color alone. |
| OPS-01 | P0 | Provide environment examples, health and readiness checks, deterministic development setup, database backups, and a documented restore check before a controlled pilot. |
| PRE-01 | P1 | Keep public preview useful when hosted Convex or Clerk credentials are absent. Label sample data. Do not present authentication, persistence, provider results, or bookings as successful when the real service path is unavailable. |
| PERF-01 | P1 | Measure the proposed target of p95 under one second for ordinary operations at 20 concurrent sessions, excluding external providers and uploads. The environment and target need approval; no benchmark is claimed. |
| FUT-01 | P1 | Keep authentication, permissions, and domain operations in the shared backend so a future React Native client can use them. Do not include a native app in MVP acceptance. |
| REC-01 | P1 | Add password recovery and external identity verification only when the selected deployment policy requires them or a later release approves them. |

The character, context, timeout, expiry, and performance numbers above are proposals from the source SRS. Confirm them through change control before treating them as final product policy.

## Technology decisions that replace the source SRS

The source SRS's architecture table is superseded by the rebuild decisions below and [`decisions.md`](decisions.md). The product requirements remain technology-independent. Preserve their semantics when implementation contracts change.

| Source SRS proposal | Rebuild decision | Effect on requirements |
|---|---|---|
| React with Vite | Next.js 16.4.0 | Build the responsive web client in Next.js. The package registry check is recorded in [`decisions.md`](decisions.md). |
| Node.js with Express API | Hosted Convex with Clerk identity | Implement backend operations with Convex functions and enforce the same permissions, validation, failure behavior, and state transitions. The proposed `/api/...` route names are not binding. |
| MongoDB with Mongoose | Convex database | Model the same accounts, applications, profiles, cases, slots, bookings, and audit data in Convex. Preserve privacy, uniqueness, and atomic reservation invariants. |
| React and Vite presentation stack | TypeScript 7.0.2 native Go-based compiler; Bun and Turborepo; shadcn/ui and Tailwind CSS | Use the selected toolchain for the web rebuild. The compiler is a native TypeScript executable; this does not add a separate Go service. Exact package pins are recorded in [`decisions.md`](decisions.md). |
| Native mobile apps deferred | React Native is a future client | Keep the MVP web-only. Retain backend-owned permissions and lifecycle rules for later client reuse. |
| Local or object storage proposal | Private credential storage is required; provider is undecided | Choose Convex file storage or a private object store before collecting real credentials. The requirement to block public URLs still applies. |
| Browser speech APIs or a configured provider | The web client has optional browser recognition and local-voice playback paths for the three pilot locales; neither has language-specific acceptance evidence, and no server speech provider is selected. | Store recognition and playback capabilities separately. Do not expose either as supported until the selected path passes language-specific checks. |
| Legacy gateway and browser speech configuration | Reference only, not approved providers | The legacy gateway URL and hardware are unverified. No DGX API documentation is available. Do not reuse legacy defaults or claim DGX-backed inference, speech support, or language quality without live evidence. See [`legacy-ai-audit.md`](legacy-ai-audit.md). |

**Compiler compatibility risk.** TypeScript 7.0 is the native Go-based compiler, but its release notes say it does not ship a programmatic API. The package pins are recorded in [`decisions.md`](decisions.md). Check Next.js, Convex, editor, and lint integrations before relying on tools that import the compiler API. Keep the native compiler as the required project type-checker. Raise any incompatibility for an explicit decision instead of silently switching compilers. ([TypeScript 7.0 release notes](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/))

## Open decisions before a real pilot

| Decision | Current state | Needed before |
|---|---|---|
| AI provider and case-data terms | The rebuild has a server-side gateway adapter, but no endpoint or key is documented for a rebuild deployment. Legacy gateway settings are reference examples only. No DGX URL or API documentation or data-handling terms are available. | Sending real case text to a provider or claiming DGX-backed inference. |
| Speech providers and minimum coverage | Optional browser recognition and local-voice playback paths exist for English, Hindi, and Punjabi, but no language-specific results or provider terms are recorded. No release speech support is approved. | Claiming release speech coverage complete. |
| Script and localization scope | English, Hindi, and Punjabi message bundles exist, but full UI coverage and independent language review are not recorded. Default and alternate script choices remain open. | Language-specific UI, input, and speech acceptance. |
| Advocate review | Credential and enrollment checks, reviewer access, and the verification label need policy. | Approving real advocates. |
| Account recovery | Password reset and external identity checks are unspecified. | Public account launch or a deployment policy that requires them. |
| Retention and deletion | Periods for case text, credentials, shared summaries, booking history, and audit events are unset. | Collecting real cases or credentials. |
| Contact sharing | The method for sharing contact details after a booking is not selected. | Confirmed booking flow. |
| Hosting and storage | Hosted Convex and Clerk identity are selected. Data location and private credential storage are unsettled. | Controlled pilot with real data. |
| Booking expiry | The source proposes 24 hours or slot start, whichever comes first. | Booking policy approval. |
| Performance target | The source proposes p95 under one second at 20 concurrent sessions, excluding providers and uploads. | Choosing the measurement environment and making a performance claim. |
| Triage quality | Review set, sample size, language-specific comprehension checks, and accuracy thresholds are unset. | Any claim about classification quality or legal usefulness. |
| Native compiler integrations | TypeScript 7.0.2 is selected as the native compiler. TypeScript 7.0 does not expose a programmatic API, so API-dependent tooling needs separate compatibility checks. | Integrating tools that import the TypeScript compiler API. |

The confirmed pilot is English (`en-IN`), Hindi (`hi-IN`), and Punjabi (`pa-IN`). It meets the SRS target of two Indian languages plus English. Pilot approval does not establish speech support.

## Release acceptance matrix

Run each acceptance scenario against the integrated web app and persistent data. A mock-only result does not pass. Record the build, environment, accounts, evidence, and failed cases. All P0 rows must pass before calling the release ready.

| Check | Acceptance scenario | Requirements | Pass evidence |
|---|---|---|---|
| AT-01 | Register separate user and advocate accounts, log in and out, expire a session, then attempt cross-account access. Use configured Clerk and hosted Convex services. | ACC-01–03, SEC-01 | Passwords are absent from responses. Expired or unauthorized access fails on the backend. Mocks do not count. |
| AT-02 | Submit an advocate application, confirm it stays hidden while pending, approve it as an administrator, then suspend it. | ADV-01–04, MAT-01 | Only approved active profiles appear. Suspension prevents new requests. Decision reason and history persist. Sample profiles are labelled and kept separate. |
| AT-03 | Use English, Hindi, and Punjabi for typed intake through advocate discovery. Verify the selected locale survives follow-ups and saved results. | LNG-01–04, IN-01, TRI-01–02 | Record the exact locale and scripts used. No language is silently changed to Hindi. |
| AT-04 | For each pilot language, check interface text, typed input, AI output, recognition, and playback independently. Attempt speech where the provider claims support and test fallback where it does not. | LNG-01–05, IN-01 | Keep provider and version, locale and script, device or browser, sample set, date, reviewer, and failures. At least one pilot language passes both speech checks before speech is marked supported. Optional browser features remain labelled unverified until then. |
| AT-05 | Submit valid, invalid, timed-out, and failed-provider triage requests. Continue a follow-up while checking that other cases remain private. | TRI-01–05, PRIV-01, REL-03 | Invalid results fail or show a labelled fallback. No result fabricates success, defaults unknown to civil, or presents urgency as a professional assessment. Provider submissions disclose recipient and purpose and exclude credentials. |
| AT-06 | Match advocates by expertise and language, broaden location only by user action, then approve a summary version for one advocate. Try to read it from another account and through routine administrator tools. Check public profiles before a confirmed booking. | MAT-01–03, PRO-01, CAS-01–04, PRIV-02 | Results explain matches. Only the named assigned advocate sees the approved version. Routine administrator tools expose no case text. A later edit does not change the shared version. Public profiles hide contact details before confirmation. |
| AT-07 | Publish future slots, reject past and overlapping slots, and request one slot from two user accounts at the same time. | SLT-01–02, BKG-01–02, REL-02 | Exactly one request reserves the slot. The other request gets a conflict and refreshed availability. |
| AT-08 | Accept or decline a pending request as the assigned advocate. Attempt the same transition from another account. Refresh and restart the app. | BKG-03, BKG-06, ACC-03, REL-01 | Only the assigned advocate can decide. The user sees the persisted state and history. |
| AT-09 | Exercise expiry, user cancellation, advocate cancellation, completion, notification failure, and retry paths. | BKG-04–07, REL-02–03 | Eligible slots release consistently. Retries do not duplicate or corrupt records. Notification failure leaves the booking correct. |
| AT-10 | Run the core journey at 360 px and desktop width with keyboard navigation. Check rate limits, private credential access, backup, and restore. | UX-01, SEC-01–03, FILE-01, OPS-01 | Record accessibility and security failures. Confirm private files have no public URL. Restore the persistent pilot data from backup. |
| AT-11 | Run public preview without hosted Convex or Clerk credentials. | PRE-01, ADV-04 | Public information remains usable. Sample profiles are labelled. No protected workflow reports a successful login, saved case, provider result, or booking. |

## Source references

- [`srs-source.txt`](srs-source.txt), VS SRS 001, draft for development review, 14 October 2026.
- [`decisions.md`](decisions.md), current user-confirmed pilot and rebuild technology decisions.
- [`legacy-ai-audit.md`](legacy-ai-audit.md), code audit of the old gateway, language, and browser speech paths.
- [The Constitution of India, Eighth Schedule](https://www.legislative.gov.in/static/uploads/2025/07/ca7ce5c746fa7480804bbdeb6cb704f0.pdf), Legislative Department, Government of India.
- [IANA Language Subtag Registry](https://www.iana.org/assignments/language-subtag-registry) and [RFC 5646, BCP 47 language tags](https://www.rfc-editor.org/rfc/rfc5646).
- [Next.js release index](https://nextjs.org/blog) and [TypeScript 7.0 release notes](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/).
