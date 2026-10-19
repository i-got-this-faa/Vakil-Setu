# Local verification — 14 October 2026

## Gemini migration — 19 October 2026

New AI requests now use Google's native Gemini GenerateContent API, defaulting to `gemini-3.8-flash` with a server-only `GEMINI_API_KEY` and optional `GEMINI_MODEL`. The runtime no longer reads the old gateway variables. Stored gateway summary/booking/audit provenance remains compatible. Pilot-language consent text now names Google Gemini. See `gemini-integration.md` for protocol and configuration.

Native typechecks passed across all five packages. The test run passed 74 backend tests (64 registered-function integration cases and 10 provider boundary cases), 12 language tests and 6 UI render tests, for 92 total. The production web build passed. Gemini responses are synthetic in these checks. Tests verify native request/auth/schema shape, pre-dispatch consent audit, historical data reads, Unicode/locale preservation, access/revision checks, rejected safety/token-limit results, bounded output and no legacy-key fallback. Independent read-only review found no concrete code blocker. `git diff --check` passed.

The first workspace check could not find Bun for Turbo child tasks; adding the existing local Bun directory to the task PATH resolved it, without installing dependencies. Deployment was attempted with the existing local credential and failed before publication: `401 Unauthorized: AuthenticationFailed: Invalid Convex deploy key`. The user will add the Gemini key in Convex; a fresh deployment credential or CLI login is also needed. No hosted backend change, real Gemini generation, browser acceptance of the new provider flow, or web-server restart is claimed. The existing health endpoint correctly retains `ai: not_verified`.

The authorized local rebuild is implemented under `rebuild`. The checks dated 14 October below prove local boundaries only. Hosted development services were subsequently provisioned on 15 October; current evidence and remaining login/submission checks are in [hosted-activation.md](hosted-activation.md).

## Commands and results

- `bun install --frozen-lockfile`: passed; 149 installed dependency entries checked across 277 packages, no changes.
- `bun run check`: exited 0. Script types and all five workspace packages passed stable TypeScript 7.0.2 native `tsc`; 60 backend convex-test cases and 12 language tests passed; Next.js 16.4.0 production build compiled all 16 App Router entries and proxy.
- `bun run test`: passed again after correcting Turbo test outputs to an empty list (these commands do not produce coverage files). No missing-output warnings remain. The domain package has no standalone test files; its lifecycle policy is exercised through backend integration tests. No coverage percentage is claimed.
- `bun run doctor`: exited 0 for local prerequisites. Web/backend environment files are explicitly PENDING hosted activation. The doctor checks file existence only and never reads their secrets.
- `git diff --check` and the scoped staged checks: passed before commits.

A clean export of committed source at `7a281bc`, without `.next`, installed with the frozen lockfile (139 packages) and passed `bun run typecheck` across all five packages with zero cache hits. This verifies the documented first typecheck does not depend on earlier Next output or uncommitted bindings. The isolated source export is ignored under `.runtime/clean-source`.

Convex bindings generate without deployment credentials through the pinned installed application templates and schema-derived aliases. This does not validate a hosted deployment; `convex dev` becomes authoritative when activated.

## Runtime and browser boundary

A fresh production process was started with `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3000` from `apps/web`. It reported ready in 371 ms; this is a startup observation, not a performance target certification.

Fifteen HTTP checks returned 200 across public, sign-in/up, workspace, role, detail and health routes, including malformed detail IDs in unconfigured mode. `/missing-page` returned 404. Health reports Clerk/Convex unconfigured, AI not verified, browser speech device dependent, and explicitly says configuration does not establish connectivity. These HTTP checks do not prove authenticated operations.

T3 preview opened the production page but then failed snapshot/resize/navigation automation with `No preview automation host is available ...` and a snapshot timeout. Status/open retry did not restore automation. Final interactive checks therefore used installed Google Chrome in a fresh isolated headless context, with Playwright Core 1.64.1 installed only in ignored `.runtime/browser-qa`.

At 1280px, 375px and 360px, the production browser checks passed:

- English landing renders; Hindi/Punjabi selection updates headings and canonical document language tags.
- Actual navigation to intake preserves selected interface language; the intake locale starts with that selection.
- Synthetic Devanagari/Gurmukhi text remains editable and unchanged when intake language changes.
- Changing intake locale resets reviewed acknowledgement. Saving remains disabled even after acknowledgement because hosted services are absent.
- Keyboard Tab moves focus from the title field; no horizontal overflow and no JavaScript page errors were observed.
- Editing and reviewing sent zero POST requests. No microphone, playback, real case data, credential files or real provider calls were used.

Local QA script, JSON evidence and screenshots are in ignored `.runtime/browser-qa`. This is a focused browser smoke check, not a complete accessibility audit, native-device test or human language review.

## Read-aloud repair — 2026-10-15

The reported screenshot was reproduced with five real local English voices, an empty intake, disabled Read aloud, and incorrectly enabled Stop playback. The empty-text gate was intentional but had no explanation. Read-aloud now explains empty text, unsupported browsers and missing local voices; Stop is enabled only during starting/active playback. Playback retains its utterance, handles completion/errors and a ten-second start timeout, and stops on text/language changes or unmount. Cancelled utterance events cannot overwrite the newer state. The shared component covers intake, saved case text and summary editing; interface messages cover English/Hindi/Punjabi and remain subject to human language review. Native mobile and server speech do not apply to this repair.

Isolated installed Chrome used the real browser/Windows speech API with synthetic text. It selected Microsoft Ravi (English India) and emitted `start` then `end`; the page displayed `Playback finished.` This proves the device API lifecycle, not audible output at the user's speakers or pronunciation quality. Focused browser regression checks substitute only the device speech API for deterministic lifecycle/error cases; local script and report are under ignored `.runtime/browser-qa/speech-check.mjs` and `speech-report.json`. The production build and native web typecheck passed. No microphone or hosted service was used. T3 preview snapshot timed out and evaluation explicitly reported `No preview automation host is available`, so the browser check used an isolated local context.

The final browser run passed seven scenario groups with no reported errors: starting/speaking/stopping and late events; edit cancellation and completion/replay; blocked playback, thrown failures and start timeout; language-change cancellation, remote-only rejection and delayed local voices; whitespace guidance and 375px overflow; Hindi/Punjabi status rendering; and an unsupported browser with both controls disabled. Real device playback also emitted start/end on this final build. The server was restarted on port 3000 after building.

## Bundled Hindi and Punjabi read-aloud — 2026-10-15

Hindi/Punjabi now use the pinned unmodified eSpeak NG Emscripten engine inside a browser worker; English retains local device voices. Engine files match upstream artifact revision `7ab07eba2d966ce45040c88d9be953e1d68640e7` by SHA-256. The local notice and license routes return HTTP 200. Data is approximately 19 MB. No case text is sent to an external speech service by the adapter.

In the T3 collaborative browser against a fresh production process, actual engine/Worker/Web Audio APIs produced nonzero 22,050 Hz audio and emitted start/end for synthetic Hindi (10,685 samples) and Punjabi (20,075 samples). Both displayed `Playback finished.` and closed their audio context. This establishes generated audio and the browser playback lifecycle, not audibility at physical speakers or pronunciation/comprehension quality.

Eleven browser scenario groups exercised the real React UI with only Worker/Web Audio substituted: empty text; generation/playback/duplicate output/stop/late events; editing and language cancellation; completion/replay; worker errors; invalid audio and explicit duration limit; blocked/rejected resume; worker-construction/source-start failures; the generation timeout; unsupported workers; and navigation unmount. All 13 created test contexts closed. Separate real-worker boundary checks rejected empty text, 10,001 characters, unsupported locale, and actual synthesis beyond five minutes. The input text remains unchanged on failure. T3 typing twice left the controlled textarea empty; QA used its native value setter plus an input event, followed by actual T3 button clicks for real playback. The first two regression attempts exposed test-harness scheduling/unbound-timer mistakes; corrected tests passed.

Muse xhigh's static review prompted the missing notice, bundled-specific error messages, voice lookup, duplicate-response handling and lower audio cap. Runtime inspection proved the inherited `set_rate(0.9)` truncated to zero; the worker now uses 175 words per minute. It verifies the engine's actual sample rate and voice-selection return code. Source inspection confirms SSML parsing, so escaping is retained. A source is stored for cleanup only after successful start; completion/stop/start-failure cleanup was verified. The unmodified engine's exact corresponding-source/build relationship remains unproven and must be reviewed before public redistribution; local use is the current scope.

Stable native TypeScript checks and production build passed after integration. `bun run check` passed the existing 72 tests (unchanged backend/language test results were reused from Turbo cache); these tests do not substitute for the new browser checks. Repeatable local scenario code and metadata-only reports are ignored under `.runtime/browser-qa/local-speech-scenarios.js` and `local-speech-report.json`. No microphone, hosted identity/database, real case data or DGX call was used.

## Backend integration evidence

Sixty registered-function tests cover trusted identity/roles, account isolation/disablement, private credential validation/read audits, approval and reapproval, strict ranked discovery and cohort-limit rejection, direct checked route IDs, Unicode follow-ups and revision conflicts, exact sharing consent/immutable snapshots, mode derivation, competing/idempotent reservations, lifecycle races, scheduler expiry, notifications and durable history. They also prove past accepted appointments are not retrospectively flagged/cancelled, and configured AI dispatch requires consent with a metadata-only audit before fetch.

The harness runs real in-memory Convex functions/storage/scheduling with synthetic identities and test files. External provider responses are synthetic. It does not prove real Clerk tokens, hosted Convex OCC, hosted storage/scheduler execution, persistence after service restart, or live model quality.

## External release gates

- Create matching Clerk/hosted Convex projects, configure issuer and ignored environment files, bootstrap an explicit admin subject, then run independent-account and refresh/restart acceptance from `setup.md`.
- Obtain DGX gateway protocol, credentials, operator hardware attribution, supported models/locales, quotas and approved data-processing/retention terms. Legacy `/gateway/llm/chat` and `qwen3:latest` do not prove DGX hardware. The advertised legacy Whisper route is absent; no server speech provider is claimed.
- Evaluate actual microphone permission/error paths, recognition and device playback in pilot languages, plus human/legal comprehension of translations. Some operational copy remains English, enumerated in the web README. Other scheduled languages have registry entries, not complete UI/AI/speech implementations.
- Agree retention, credential-review criteria, consultation contact-sharing and proposed expiry policy before real pilot data; rehearse backup/restore. The initial 24-hour request deadline remains a documented proposal.
- Scaling discovery beyond the bounded 500-profile cohort needs an indexed projection; overflow is an explicit error, never a silently incomplete match list.

Native mobile, payments, reviews and guaranteed emergency dispatch remain outside the confirmed MVP.

## Git scope

### Saved intake outcome — 16 October 2026

The no-summary state now confirms that the concern was saved and explicitly states that no AI analysis was generated. The new status copy covers English, Hindi and Punjabi. Users can open a manual summary prefilled with their unchanged intake or browse advocates. Category and urgency start as unknown. Review remains mandatory; a summary over 4,000 characters asks for shortening and cannot be saved, while the complete intake remains intact. No AI request or write runs automatically.

Six actual React render tests cover the three pilot-language outcomes, prefilled text, mandatory review, a long Gurmukhi intake, an unreviewed provider draft and the reviewed-summary state. Auth/data/audio boundaries are substituted; unexpected writes or AI calls throw. These are render-boundary tests, not browser interaction or live-provider evidence. Native typechecks, all 78 registered tests and the production build passed; unchanged backend/language test results were reused from Turbo cache.

The final live check used the T3 browser and the existing Google session to sign into Clerk without requesting credentials. A new labelled synthetic Punjabi intake, `[TEST] Saved outcome browser check`, saved to hosted Convex and opened its case page. DOM checks confirmed the saved notice, explicit absence of AI analysis, exact Gurmukhi intake preservation, identical manual-summary starter, unknown urgency and initially closed summary editor. The primary action opened the editor and focused the prefilled textarea; saving remained disabled before review. Switching the interface to Punjabi displayed the Punjabi saved/no-analysis notices with `pa-IN` document language. A full reload retained the intake, confirmation and summary starter. Interface selection reset to English on reload; that preference persistence remains unresolved. No summary, AI request, microphone input or deletion was submitted during this check. The screenshot is a local browser artifact, excluded from the repository.

The user authorized a new repository under `sid4761` and a push after completion. The standalone export of committed `rebuild/` excludes legacy source, local environment files, dependencies and build output. GitHub CLI is installed in ignored `.tooling/github-cli`; the existing Git Credential Manager authorization was verified by GitHub as `sid4761`. Credentials are passed only to the child process, never printed or added to the export. Verified remote publication is recorded in `github-publication.md`. The user confirmed that the two cancelled queued requests were the blank post-submission flow and GitHub push; both are covered by this work.

The independent repository audit found no real environment files or dependency/build directories in the subtree history. Its one bearer-string candidate was verified as an explicit synthetic test marker: the stubbed environment and expected authorization header use the same value, with a mocked fetch and fake endpoint. No credential rotation is indicated. Standalone setup paths and the Fleet prerequisite for doctor were clarified after the audit; no runtime code changed in that follow-up.

### Case detail redesign — 15 October 2026

The case page now prioritizes the saved intake and one next step. Summary editing, follow-ups, playback controls, AI, history and draft deletion are disclosed on demand, with the original mutations and review acknowledgements retained. An AI-generated summary prompts review; a manually reviewed summary offers advocate discovery. This is a focused case-detail change, not a redesign of the entire portal. Operational copy still includes English fallback.

Native typechecks and the production build passed. In the existing authenticated Chrome session, the primary button opened the editor and focused its textarea. Closing and reopening the disclosure retained the synthetic Gurmukhi summary. Keyboard review acknowledgement and submission saved version 1 of the labelled test case to hosted Convex. Reload showed the persisted summary, the updated next step and collapsed secondary tools. No real user case was edited, no AI request was sent, and no deletion was performed.

CSS layout checks at 390px and 1280px found no horizontal overflow and the expected single/two-column layouts. Screenshots are ignored at `.runtime/browser-qa/case-redesign-phone.png` and `case-redesign-desktop.png`. The existing browser zoom produced a 6144px CSS viewport and screenshot timeouts; temporary CDP mobile metrics were used at both widths to isolate the responsive layout from that zoom. Pointer actions under emulation were unreliable, so phone interaction checks used the real keyboard controls; this does not certify native touch behavior. The browser disconnected after the interruption, preventing another final capture or an explicit metrics reset. No browser session remains available to this agent.

Work stays on `master` and changes only `rebuild`. Legacy and unrelated user files are preserved. Scoped implementation commits are `1348e24` (backend/domain), `e397df1` (shared UI/languages/native tooling), `92214b2` (consent/private-read audits and direct lookup), and `7a281bc` (responsive multilingual web workflows). The 15 October continuation adds `be56a94` (bundled Hindi/Punjabi playback) followed by its evidence commit. At that implementation milestone no push or public deployment had been performed; the later private GitHub publication is recorded in `github-publication.md`. Build outputs, tooling binaries, browser QA files, clean-source export and actual environment files are ignored.

## Conversational Gemini and private documents — 19 October 2026

`bun run check` passed five-package native typechecks, 125 tests (102 backend, 12 language, 11 React render), local generated bindings and the production Next build. The backend cases cover ownership, disabled accounts, selected file validation/storage, stale consent context, idempotent reservation/replay, quota/HTTP failures, scheduled timeout expiry and deletion cleanup. Render tests substitute identity/data/model boundaries.

A separate local Convex integration harness called actual Gemini with a synthetic TXT marker, persisted the reply, and recalled that marker in a second turn without reattaching the document. The complete two-turn check passed after low thinking was selected. This is real provider evidence with local harness persistence, not hosted deployment evidence.

A browser fixture using actual intake/chat components verified review/consent reset, private save, long intake save-and-chat, locked pending controls, unavailable reply recovery and lost-acknowledgement retry. Final review found that retry skipped unchecked consent; the guard now applies to every send and the Retry button requires consent. Browser regression showed Retry disabled with consent unchecked, then successful replay with one persisted turn after renewed consent. File chooser automation was blocked by the extension's file-URL permission; no permission was changed. Backend storage and actual Gemini TXT processing were verified separately. See chat-and-documents.md for limits and evidence boundaries.

Activation remains blocked: the existing Convex deployment credential returns 401. The supplied Gemini key was validated and stored only in ignored local environment/runtime files, not written to hosted Convex. Browser sign-in reached Convex Terms of Service, left unaccepted. The new backend/schema and hosted environment configuration must be published before the new frontend is started against that deployment. No remote push or hosted chat acceptance is claimed.

## Hosted activation completed — 19 October 2026

After the user completed Convex browser login, the CLI device flow authenticated the existing account. The obsolete CONVEX_DEPLOY_KEY entry was removed from the ignored backend environment file so it no longer overrode account authentication. `convex dev --once --typecheck disable` successfully published to the existing vakil-setu development deployment, chatty-sandpiper-446 (EU West). The new case/chat/document indexes were created. GEMINI_API_KEY was configured on that deployment from an ignored local file without printing the key or passing its value as a command argument.

The authenticated website saved a labelled synthetic intake using Save and start AI chat, displayed a real Gemini preparation checklist, and answered a second context-dependent question. Reload retained both replies and the original case. The labelled browser test case remains available for inspection; no real case was modified or shared with an advocate.

A separate operator-run hosted acceptance used an explicitly synthetic identity and case, uploaded a synthetic TXT, listed and privately read it back, sent it to Gemini and verified its CEDAR-731 marker, then verified recall in a second turn without reattaching the file. All checks passed and that synthetic case/document/chat were deleted through deleteDraft. The synthetic test account remains labelled in the development database. This operator-identity check verifies hosted storage and provider behavior; the website check separately verifies real Clerk sign-in and chat.

Chrome's automation extension blocked file selection because file-URL access was disabled; the alternate T3 preview upload also timed out. No browser permissions were changed. Therefore browser-picker-to-upload acceptance remains unverified, while the deployed upload/read/model path passed. This section supersedes the earlier authentication/hosted-key blockers. Production deployment and public web hosting were not requested or performed. No application source change was needed for activation.

## Save first and chat timeout recovery — 19 October 2026

The user requested removing Gemini from intake submission and fixing a timed-out Hindi chat. Read-only metadata for the reported case confirmed a persisted unavailable/timeout result under the old 45-second lease; no raw intake or message was printed and no real case was re-sent to Google. The provider previously aborted after 30 seconds.

Intake now has one localized Save and continue button (Saving… while the mutation runs), no Gemini checkbox and no automatic AI call. The existing review, input lock, duplicate-submit guard and stable create request ID remain. Case chat is a separate next step. The signed-in website saved a labelled synthetic Hindi intake and opened its case with zero conversation turns. That labelled test case is retained for inspection.

Chat now allows 60 seconds with a 75-second lease, requests concise replies of at most 150 words and uses 2,048 output tokens with low thinking for Gemini 3/4. These backend changes were deployed to the existing development deployment. Two real hosted Hindi exchanges passed in 26.2 and 28.5 seconds (CLI-inclusive timings); this is observed acceptance, not a latency guarantee. Their synthetic case was cleaned up. Historical timeout records remain truthful rather than being rewritten as successes.

Recoverable failed turns offer Review and try again. It restores the message and still-available selected attachments only into an empty composer, resets consent and uses a new request ID for the next send. A browser fixture with real React components and substituted data/model boundaries verified save creates one case with zero sends, restored message with unchecked consent/disabled Send, and successful consented recovery using a fresh ID. It cannot overwrite an existing message draft.

Full bun run check passed native typechecks, 130 tests (103 backend, 12 language, 15 React render) and production build. Backend tests include a successful reply at 35 seconds and a bounded timeout before lease expiry. Independent review found no actionable P1/P2 issues. No production deployment or remote push occurred.

## Clarified button wording — 19 October 2026

The user clarified that only the phrase Saving and asking Gemini should change; removing automatic chat was a misunderstanding. Restored the original consented save-and-chat handler and private-only option, preserving input review, context consent reset, idempotent case creation and initial request ID. The primary button now reads Save and continue and its pending state is only Saving… in English, Hindi and Punjabi. The Gemini recipient remains disclosed in the consent checkbox. The timeout/recovery backend improvements are unchanged and need no new deployment.

Full checks pass: native typechecks, all 130 tests and production build. Browser fixture interaction with the actual intake component and substituted backend/model boundaries observed Saving… while one case creation and one chat send were pending, then navigation with a reply. No additional real case data was sent. This supersedes the prior save-only intake behavior; historical checks above remain records of the preceding version.
