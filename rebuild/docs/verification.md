# Local verification — 14 October 2026

The authorized local rebuild is implemented under `rebuild`. This record proves local boundaries only. Hosted services have not been provisioned by user decision.

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

Work stays on `master` and changes only `rebuild`. Legacy and unrelated user files are preserved. Scoped implementation commits are `1348e24` (backend/domain), `e397df1` (shared UI/languages/native tooling), `92214b2` (consent/private-read audits and direct lookup), and `7a281bc` (responsive multilingual web workflows). The evidence/setup commit follows these in Git history. No push or public deployment was performed. Build outputs, tooling binaries, browser QA files, clean-source export and actual environment files are ignored.
