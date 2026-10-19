# Backend second-round handoff — 2026-10-14

Historical evidence below uses paths from the original parent checkout. In a standalone clone, use `bun run test` and `bun run typecheck` from `packages/backend`, or `bun run check` from the repository root. `.tooling` is workstation-local and is not required when Bun is installed normally. Current hosted evidence is in `docs/hosted-activation.md` at the repository root.

The four verified backend findings are implemented within `packages/backend`. Starting parent commits were `1348e24` and `e397df1`; starting HEAD was `e397df1`. The existing uncommitted oversized-discovery-cohort test was preserved. Parent owns web/domain integration, full-workspace checks, codegen and commits.

## Exact evidence

From `rebuild/packages/backend`, using the existing installed Bun:

- `../../.tooling/node_modules/bun/bin/bun.exe run test` passed: **60 tests**, one test file, Vitest 5.0.4. This includes the existing 41 tests and 19 new cases in this round. Final run duration reported 1.16 seconds; this is a check result, not a benchmark.
- `../../.tooling/node_modules/bun/bin/bun.exe run typecheck` passed: installed native TypeScript `tsc --noEmit`. Generated data model/API types derive from schema and existing module exports; this worker did not run codegen or edit generated files.
- From `rebuild`, `git diff --check -- packages/backend` passed.

Tests invoke registered Convex queries, mutations, actions, local storage and scheduler through convex-test. Provider calls use synthetic fetch responses; the final credential-permission test intercepts Blob.arrayBuffer to disable the reader while bytes are obtained. Evidence is local integration plus static typing. Hosted Convex OCC, real Clerk identities, hosted storage/scheduler, real gateway/DGX inference, language comprehension, browser/client flows and deployment migration were not tested. Missing hosted services remain an intentional user decision.

## Surface and completion ledger

| Surface | Result and exact test evidence |
|---|---|
| Approval/account changes | Ten new parameterized cases cover profile edit, credential invalidation, suspension, advocate disable and user disable at exact start and one hour afterward. Accepted booking documents, reservations, booking events and booking notifications remain identical; no new affected queue entry. Existing five future-loss tests still prove future flags and pending cancellation. |
| Existing flag crosses start | Two new cases reject admin cancellation at exact start and one hour afterward, preserving state/history/reservation. Retention still rejects suspended advocates, then succeeds after explicit reapproval. Existing completion and reactivation tests remain passing. |
| Analysis consent contract | Missing and false consent fail before fetch, rate attempts or consent records. All existing valid action calls now send consent:true. |
| Configured provider dispatch | A new test observes the audit already persisted when fetch begins, validates POST/auth/redirect/timeout contract, authorized context and successful private summary persistence. Exact audit fields contain current case/owner/version/context revision, timestamp, gateway and URL origin only. Endpoint path/query, API key, private intake/follow-up and credential content are absent. Existing unknown/emergency and language tests remain passing. |
| Final consent permission/revision boundary | A new test rejects foreign/admin callers, stale version/context and disabled owners in the internal consent mutation without recording consent. Configured public calls reject unauthorized/stale inputs without dispatch. Existing late-response tests reject changed account/version/context at persistence. |
| Unavailable provider | Existing no-key/rate-limit test additionally proves no consent audit. Unavailable configurations return before the consent mutation/fetch; no provider success is fabricated. |
| Credential read audit | A new test verifies exact owner/admin records containing only credentialId, readerId, derived role and timestamp. Foreign/anonymous/disabled owner/disabled admin reads and missing storage create no new audit. Internal audit authorization is tested directly. Another new test disables the owner during arrayBuffer and proves the final mutation rejects without an audit or returned bytes. Existing private metadata/URL, upload/review/remove tests remain passing. |
| Direct routes | Two new tests exercise bounded/invalid/wrong-table/deleted/nonowned routes, role/auth/disabled-account checks and pending/disabled public profiles. With 60 newer cases and 60 earlier-ranked profiles, first pages omit original links but direct resolvers return their branded IDs. Existing getMine/getPublic contracts still return their original results. |
| Clients | Parent-owned: pass consent:true and renew the checkbox on summary/context revision changes; use resolvePublic/resolveMine before typed reads. This worker edited no client files. Mobile is deferred. |
| Documents | Backend API, architecture and this validation handoff reflect the final contracts and observed evidence. |

## Contracts for parent integration

- `triage.analyze({caseId, expectedVersion, expectedContextRevision, consent: true})` now requires affirmative consent at the action validator. Consent is stripped from calls to existing internal consume/forAnalysis/saveProviderSummary functions. New private `aiConsents` records are written through `internal.triageRate.recordConsent` immediately before configured dispatch, after active ownership and revision rechecks. Audit records describe consented dispatch attempts, including provider failures.
- `credentials.read` returns its existing bytes/contentType/fileName shape. New private `credentialReads` records are written through `internal.credentials.auditRead` after arrayBuffer resolves and current active owner/admin authorization succeeds. No public audit queries or storage URLs were added.
- `advocates.resolvePublic({routeId: string})` returns `Id<"advocates"> | null`; `cases.resolveMine({routeId: string})` returns `Id<"cases"> | null`. Both bound route length to 1–128 and use normalizeId/direct lookup without casts or paging. The private resolver requires an active user and hides others with null. Existing typed getPublic/getMine contracts are unchanged.
- Newly affected accepted consultations require `start > now`. Admin cancellation also requires `start > now`, even when an old flag exists. Retention keeps its explicit active-user/approved-advocate guard after start.
- The schema adds two private tables; existing records require no new fields for these changes. Deployment/codegen remain parent-owned.

## Authored files and scope

This round changed only backend API.md, ARCHITECTURE.md, VALIDATION.md, tests/backend.test.ts, and convex/{admin,advocates,cases,credentials,schema,triage,triageRate}.ts plus convex/lib/lifecycle.ts. Generated bindings were untouched. No domain/web/root/vendor files, installs, locks, commits, staging, browser launches, hosted deployment or secret reads were performed.

The review false positives remain outside this implementation: i18n correctly uses Bun tests; candidate-cap overflow explicitly throws instead of silently truncating; discovery uses strict expertise matching followed by earliest-slot ordering. The parent owns the UI match explanation.

## Gemini migration checks — 19 October 2026

The current suite passes 74 backend tests: 64 registered-function integration cases and 10 transport/parser cases. New dispatches use native Gemini GenerateContent and server-derived `gemini` provenance. Historical gateway labels remain accepted for stored records. Tests inspect Google's pinned URL, `x-goog-api-key`, structured JSON configuration, pre-fetch consent metadata, language preservation and private version persistence. Safety/truncation stops, wrong-language/malformed output and changed authorization/revisions cannot create a summary. All external model responses remain synthetic. Typecheck and the workspace production build pass.

Hosted publication is blocked by an invalid/expired Convex deploy key (401). No live Gemini result or hosted migration is certified. Earlier gateway test descriptions above describe the previous snapshot; current configuration is documented in `../../docs/gemini-integration.md`.

## Case chat and documents — 19 October 2026

102 backend tests now pass, including 27 chat/document cases, 65 registered-function integration cases and 10 provider cases. Workspace native checks and production build pass; full suite totals 125. Tests cover per-owner documents, size/signature validation, selected-only model attachments, reviewed context revisions, request replay, quota/HTTP429, state changes during dispatch and scheduled lease expiry. Actual Gemini also passed a separate synthetic TXT and two-turn conversation test using local convex-test persistence. Hosted activation remains blocked by invalid Convex deployment authentication; these results do not certify hosted chat.
