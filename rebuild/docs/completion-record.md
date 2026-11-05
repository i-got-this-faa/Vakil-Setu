# Completion record

## Objective and exit condition

Create a new maintained Bun/Turbo/Next/Convex/Clerk application under `rebuild`, preserve the legacy app, implement the approved SRS MVP and pilot interfaces, verify all locally testable boundaries, and make scoped commits. External credentials and device/language evaluation remain explicit release gates when unavailable.

## Confirmed scope

English/Hindi/Punjabi pilot; hosted Convex and Clerk; payments/reviews/emergency guarantees deferred; DGX docs unavailable. Fleet checkout is pinned and referenced in `AGENTS.md`. A native mobile app is deferred; shared packages must remain platform-neutral.

## Completed

- Extracted attached SRS and recorded technology overrides/user decisions.
- Audited legacy gateway, missing advertised Whisper endpoint, two-language limitation and fabricated confidence.
- Cloned and referenced Fleet; installed task-local Bun; pinned foundation versions.
- Initial scoped commit `0d70a46` created the rebuild foundation.
- `1348e24` implements the authorized Convex backend, private credentials/cases, exclusive reservations, lifecycle/history and shared domain.
- `e397df1` adds pilot dictionaries/registry, real shadcn components, the locked workspace and stable native TypeScript tooling.
- `92214b2` adds dispatch consent/private retrieval audit and checked direct lookup; `7a281bc` commits the complete responsive web workflows.
- Discovery, account management and admin status review now have complete backend/client paths. Local tests additionally cover ranked paging, strict filters, candidate limits and cancellation timing.

## Initial implementation record

All implementation and review rounds have finished. Codex high completed provider consent/private-read audits/direct route resolution; Muse xhigh completed client/admin/mobile fixes; Luna xhigh audited language/setup/legacy contracts; the parent verified Gemini findings and rejected false positives with source/test evidence. Native checks, all 72 tests, production build and fresh isolated-browser checks at 1280/375/360px pass. Final scoped commits and their evidence are recorded in `verification.md`.

The 15 October continuation completes local Hindi/Punjabi read-aloud with a pinned bundled engine. Actual T3 browser worker/Web Audio checks and eleven controlled lifecycle groups passed. The engine's voice lookup/sample rate and integer WPM contract were verified; incorrect inherited relative-rate handling was fixed. Human pronunciation review and physical speaker audibility remain unverified. Engine corresponding-source/build provenance must be checked before public redistribution.

## External gates

- Independent-account authorization and complete hosted booking/approval acceptance. Clerk/Convex configuration and authenticated intake/summary persistence were completed later; see `hosted-activation.md`.
- DGX endpoint contract and credentials, model/language capabilities and privacy terms.
- Microphone/playback trials and human comprehension review in all three pilot languages.
- Administrator credential review criteria, retention and contact-sharing policies, backups/restore rehearsal before real pilot data.

Final checks and Git state will be recorded in `verification.md`; none of these external gates is waived by a successful build.

## Subsequent verified work

On 16 October, hosted Clerk login and Convex intake/summary persistence were verified. The final local check passed 78 tests (60 backend, 12 language, 6 React render), native typechecks and the production build. The rebuilt application was pushed to the private `sid4761/Vakil-Setu` repository. These later facts supersede the initial 72-test baseline above; full MVP acceptance is not implied. On 18 October, project materials and historical source were inventoried and added; see `materials-audit.md`.

## Gemini provider migration — 19 October 2026

User requested replacing the gateway/Qwen adapter with Gemini. Local implementation, historical record compatibility, pilot-language recipient consent, focused tests and active setup/API documentation are complete. Five-package native checks, 92 tests and production build passed. No remote push performed.

Remaining activation: user adds `GEMINI_API_KEY` in Convex and refreshes invalid local deployment credential or authenticates CLI. Retry `convex dev --once --typecheck disable` from packages/backend, then start the rebuilt web app and run a labelled synthetic case through consent, Gemini generation, private draft persistence and review. Last deploy attempt failed 401 before publication. Do not send real case text during acceptance or claim hosted Gemini works before that check.

## Conversational chat and uploads — 19 October 2026

Implemented case-linked Google Gemini conversations, explicit per-send context consent, private PDF/JPEG/PNG/TXT uploads, selected attachments, stored history, idempotent retries and deletion cleanup. The intake offers save-and-chat or a private save without AI. Final review's retry consent bypass was fixed and browser-checked. Native typechecks, 125 automated tests and production build pass. Actual Gemini processed a synthetic TXT attachment and a second conversational turn in a local Convex harness.

Hosted activation is incomplete because Convex deployment authentication still returns 401. The Gemini key is configured locally in ignored files only. Existing browser login reached an unaccepted Terms of Service screen. No hosted deployment, hosted key configuration or remote push is claimed. Detailed evidence and limitations are in verification.md and chat-and-documents.md.

## Hosted chat activation — 19 October 2026

The earlier Convex authentication blocker is resolved. CLI device authentication succeeded; the backend/schema deployed to the existing vakil-setu development deployment and its hosted Gemini key was set privately. The website completed a two-turn real Gemini conversation and retained it on reload. Hosted TXT upload, private read, Gemini attachment processing and conversational recall also passed using an explicitly synthetic operator identity; that test case was cleaned up. Browser picker automation remains blocked by the extension permission, so full browser upload acceptance is not claimed. See verification.md for scope and retained labelled browser case. No production deployment or remote push was performed.

## Save-first intake and bounded chat recovery — 19 October 2026

Removed intake AI consent and automatic chat dispatch. A single Save and continue action now saves privately before opening the case. Chat remains explicitly consented on the case page. Increased chat deadline/lease to 60/75 seconds, reduced output budget and requested concise replies. Recoverable failed turns can be restored for review and renewed consent without overwriting a draft. Backend deployed; hosted Hindi two-turn acceptance, real website save-without-AI, browser-fixture recovery, native checks, all 130 tests and production build passed. The reported old timeout remains an accurate historical result and can be retried through the new review action. No real case was automatically re-sent, no production change or remote push performed.

## Button wording correction — 19 October 2026

User clarified intent: retain save-and-chat and change only the visible action wording. Restored Gemini consent and automatic initial chat, plus private-only save. Primary/pending labels are Save and continue / Saving… across pilot languages. All 130 tests, native checks, production build and actual component browser interaction with substituted services pass. Timeout and retry improvements remain active. Prior save-only behavior is superseded.
