# Web implementation handoff

This document retains the web worker's historical handoff. Its `rebuild/` and local tool paths describe the original parent checkout. In a standalone clone, run `bun run typecheck` or `bun run build` from the repository root; see the root README and `docs/setup.md` for current setup. For web-only checks after workspace code generation, run `bun run typecheck` from `apps/web`.

Owned scope in the original checkout: `rebuild/apps/web/**`. No dependency installation, commits, nested delegation, or edits to legacy/root tooling were performed by the web worker.

The responsive App Router portal has a paper/cream and muted teal public landing, approved advocate discovery, public profiles and slots, Clerk sign-in/up, and a sidebar workspace. Workspace routes provide onboarding, reviewed intake, private case and summary history, follow-up context, consultation lifecycle controls, notifications, advocate applications/private credentials/availability, and administrator credential/application review. All persistent operations call the generated Convex functions; the browser never invents a successful operation.

## Configuration boundary

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `NEXT_PUBLIC_CONVEX_URL` must pass configuration parsing before both ClerkProvider and ConvexProviderWithClerk mount. The server key is required for protected route middleware and is never passed to clients. Keys are supplied through the parent environment setup. No actual legacy environment files were read.

A placeholder-only template is checked in at `apps/web/.env.local.example` (no real secrets). Copy it to ignored `apps/web/.env.local` and fill values from the Clerk/Convex dashboards per `docs/setup.md`.

With missing configuration, public pages and the intake editor render without mocked accounts, advocate records, or saved cases. Saving is explicitly disabled. Input remains in page memory and is lost on navigation/reload. `/api/health` reports configuration categories without key values or deployment URLs; it does not probe connectivity.

## Language and speech boundaries

Core navigation and form labels use `@vakil/i18n`. The web's `src/lib/copy.ts` supplies additional English/Hindi/Punjabi intake headings, placeholders, character-count units, setup notices, disabled-account and onboarding-role notes, follow-up/summary/AI consent, cancellation timing, self-disable, and landing copy. Hindi/Punjabi entries in `copy.ts` are worker-drafted interface strings, not human-verified legal translations.

Exact untranslated remainder (English-only, not promised): workspace overview cards and headings, advocate-desk profile/slot labels, admin review/affected-booking/account-row operational text and empty states, booking history/event labels, discovery result badges, notification rows, speech error/status strings (`speech.tsx`), how-it-works explainer cards, footer/how-it-works marketing copy, and most `EmptyState`/`LoadMore`/loading messages. Interface locale and intake language are separate: switching the interface never translates or rewrites entered text.

Browser Web Speech capture is optional. It starts only after explicit consent that browser vendors may process audio on their servers. Recognition availability is detected at runtime; language recognition and accuracy are unverified. Interim words are never appended or submitted. Final transcripts remain editable and require a separate “add reviewed text” action. Intake saving then requires another reviewed-text acknowledgement. No audio recording is persisted by this app.

English read-aloud uses only matching `localService` voices reported by the device. Hindi/Punjabi use the bundled eSpeak NG engine in a worker with Web Audio, so installing device voices is unnecessary for those languages. The engine data is about 19 MB; generation times out after 60 seconds and rejects output longer than five minutes without changing the text. Stop, edits, language changes and navigation cancel the worker and close its audio context. No text is sent to a speech service by this adapter. Pronunciation remains unverified. Attribution, hashes, GPL license and source/build provenance limits are in `public/speech/espeak-ng/NOTICE.md`; public redistribution needs corresponding-source review before deployment.

AI draft creation requires separate consent and passes the current summary version and context revision. Unavailable provider results are displayed explicitly; manual summaries remain available.

## Contract and state handling

Generated `@vakil/backend/api` and `@vakil/backend/data-model` bindings drive query/mutation/action and document types. Follow-up revisions, consultation formats, urgency variants, lifecycle events, and administrator handling added during integration are consumed from the current executable contract. Backend validators and authorization remain authoritative; UI role checks are only navigation assistance.

Second-round web changes: `admin.queue` is called with an explicit `status` filter (`pending` default, plus `approved`/`rejected`/`suspended`) so approved suspension and rejected/suspended reapproval stay reachable; `admin.accounts` paginated table calls `admin.setDisabled({accountId, disabled, reason})` with required reason/confirmation and self-disable blocked in UI (backend also forbids it); booking action availability uses `nextBookingState({state, action, actor, now, start, end})` with `start` passed so cancellation shows only before slot start. Mobile workspace uses `minmax(0, 1fr)` with `min-width: 0` children, wrapping header locale controls, and breaking long intake/summary text; keyboard `:focus-visible` styling is unchanged.

Route strings are normalized by direct backend resolvers and checked for ownership/approval before becoming branded IDs. Detail pages do not depend on loading directory or case-list pages. Booking consent binds the named recipient and exact latest saved summary version. Editing a summary resets consent through the version-keyed request component. AI consent resets when the summary or follow-up revision changes and is required by the backend before dispatch auditing. Requests use a stable per-form idempotency key; the selected slot snapshot remains mounted after reservation so the service receipt is visible. Profile edits and credential changes disclose their effect on future consultations; past accepted appointments are preserved.

The parent also added actual filter-match explanations, earliest-slot ordering copy, an admin cancellation guard in the UI, and trusted structured service-error display. Final parent validation uses stable native `tsc`, 72 tests and the production build. Isolated headless Chrome checked 1280/375/360px layouts, Hindi/Punjabi switching, Unicode text retention, reviewed-state reset, disabled unconfigured saving, no server writes and no page errors. T3 preview automation failed to reconnect for final snapshots; `docs/verification.md` records that limit and the fallback evidence.

## Verification recorded by the web worker

- Native compiler: `rebuild/node_modules/.bin/tsc.exe --noEmit`, from `apps/web`, passed (TypeScript 7.0.2 stable native) after the second-round admin/bookings/copy edits. First-round notes below are retained for history.
- Production: `node node_modules/next/dist/bin/next build`, from `apps/web`, passed with Next 16.4.0. All 16 expected App Router entries and proxy were compiled.
- Live local HTTP: public, authentication, workspace, role, detail, and health routes returned 200 in unconfigured mode; `/missing-page` returned 404.
- T3 collaborative browser: English landing and intake rendered; at 390px width Hindi and Punjabi switching changed headings/navigation and document `lang`; the page width stayed at 390px; Devanagari text entry was retained; saving remained disabled without service configuration. Actual browser recognition/voice availability was shown. No microphone or private data was used.
- Second round (no browser/server per parent scope): `tsc --noEmit` re-passed; `admin.queue` status arg, `admin.accounts`/`setDisabled` calls, and `nextBookingState` object call grep-verified; mobile CSS uses `minmax(0, 1fr)` with `min-width: 0` children and wrapping locale controls; `.env.local.example` contains placeholders only. No dev server started, no packages installed, no hosted Convex/Clerk run.
- Dependencies were verified against npm registry metadata. Installation belongs to the parent.

Not proved: real Clerk sign-in/token integration, hosted Convex persistence and ownership controls, advocate approval/credential storage, atomic reservation under concurrent users, lifecycle notifications/expiry timing, DGX/provider results, microphone permissions and recognition accuracy, or spoken playback on a real device. A successful build does not establish those behaviors. Parent live acceptance testing needs genuine service configuration and test identities.

## Surface ledger

| Surface                                                                 | Applies | Evidence/state                                                                                                 |
| ----------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| Public landing/discovery/profile/workflow                               | Yes     | Implemented; unconfigured HTTP/browser checked                                                                 |
| Clerk routes and protected workspace                                    | Yes     | Implemented; real identity blocked by configuration                                                            |
| Accounts, roles, approval, private credentials                          | Yes     | Typed Convex calls implemented; hosted path untested                                                           |
| Intake, summary versions, follow-up, AI unavailable state               | Yes     | Typed calls and explicit consent implemented; local editor checked; hosted/AI path untested                    |
| Slots, recipient/version consent, booking transitions, notifications    | Yes     | Typed calls and reverse actions implemented; hosted concurrency and timing untested                            |
| English/Hindi/Punjabi switch and text input                             | Yes     | Core controls/browser checked; extended English fallback disclosed                                             |
| Browser speech/device playback                                          | Yes     | Read-aloud lifecycle/error states checked; real English device API emitted start/end; audibility, pronunciation and microphone input unverified |
| Unconfigured mode and configuration health                              | Yes     | HTTP/browser checked; no simulated success                                                                     |
| Native mobile, payments, ratings/reviews, guaranteed emergency dispatch | No      | Explicitly outside the requested pilot                                                                         |
| Documentation and generated artifacts                                   | Yes     | This handoff; Next generated local route types/build output; backend generation owned by parent/backend worker |

No Git action was authorized for this worker. The parent owns final integration, workspace-level checks, and commits.
