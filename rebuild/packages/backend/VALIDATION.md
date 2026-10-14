# Backend review handoff — 2026-10-14

Local implementation of the five backend integration-review gaps is complete. This record covers backend work only; the parent owns client integration, install/lock/codegen-script changes, overall verification, and the integration-review disposition.

## Evidence

Commands use the installed Bun at `rebuild/.tooling/node_modules/bun/bin/bun.exe`.

- From `rebuild`: `.tooling/node_modules/bun/bin/bun.exe scripts/codegen-local.mjs` passed. Used existing Convex 1.46.0 templates; no deployment contacted and no script changes.
- From `rebuild/packages/backend`: `../../.tooling/node_modules/bun/bin/bun.exe run typecheck` passed using installed TypeScript 7.0.2 native `tsc --noEmit`. Backend no longer requires `vite/client`; test glob typing is scoped to tests.
- From `rebuild/packages/backend`: `../../.tooling/node_modules/bun/bin/bun.exe run test` passed: 37 convex-test cases against registered functions. Real in-memory mutations, queries, scheduler, and storage; only the external provider call is replaced with synthetic test responses.
- From `rebuild/packages/domain`: `../../.tooling/node_modules/bun/bin/bun.exe ../../node_modules/typescript/bin/tsc --noEmit` passed. Domain package script/compiler migration remains parent-owned.

The evidence level is local integration through convex-test plus static types. Hosted Convex OCC, real Clerk identities, hosted storage/scheduler, DGX inference, language comprehension, browser/client flows and production schema migration were not tested. No hosted credentials are needed for these local checks.

## Surface and completion ledger

| Surface | Applicability and result | Evidence |
|---|---|---|
| Approval and account mutations | Applies: profile, credential, suspend, advocate disable, user disable preserve accepted bookings and close pending requests | Five parameterized loss-path tests; retained slot and redacted admin queue assertions |
| Reverse lifecycle | Applies: explicit admin cancel/retain, participant cancellation, completion/expiry, repeated flags | Durable event checks; reapproval leaves handling pending; unresolved completion rejected |
| Reservation races | Applies: two owners, same-key retries, publication overlaps, same-user cross-advocate overlap, acceptance/suspension, cancellation/expiry, repeated admin handling | Real registered mutations; one winning reservation/decision and no duplicate terminal event |
| Contracts/discovery | Applies: modes in profile/slot, trusted booked mode, unknown/emergency urgency | Mode ownership/injection checks; unsupported modes hidden; urgency preserved in snapshots/provider results |
| Follow-up/provider | Applies: owner/review requirement, bounded recent messages, Unicode/locale preservation, context revision conflict | Unauthorized append/analysis rejected; count/aggregate pruning; late results cannot overwrite changed context/account/version |
| Credential content | Applies: signatures, type/size/name, owner/admin read, owner removal, admin review, concurrent capacity and cleanup | PDF/PNG/JPEG fixtures; denied foreign access; deleted blobs; losing upload leaves no orphan |
| Clients/mobile | Parent integration applies; no client files owned here. Mobile does not apply: deferred product | Required API changes below; no browser acceptance claim |
| Connection modes | Manual/no-key and provider-action boundaries apply; speech/payment/video transport do not apply: deferred or unavailable | Explicit unavailable/rate-limited output; external failures cannot create a summary |
| Documents | Applies: API, architecture and this handoff updated | Executable contracts in schema and generated bindings |

## Parent integration requirements

1. Profile editors must send required `consultationModes: ("phone" | "video" | "in_person")[]`; slot publication must send required `consultationMode`. Display modes in discovery and booking review/history. Booking requests still send only slot IDs, never a client mode.
2. Read `case.contextRevision` (starts at zero), send it as `expectedContextRevision` to `triage.analyze` and `cases.appendFollowUp`, and expose reviewed follow-up text/consent. Refetch on revision conflicts. Add unknown/emergency urgency options with preliminary-label/no-guarantee copy.
3. Connect `admin.affectedBookings` and `admin.handleAffectedBooking`, display participant handling flags, use `bookings.history`, and require an advocate cancellation reason in the client. Reapproval alone does not clear flags.
4. The only shared domain edit is `packages/domain/src/index.ts`: add unknown/emergency urgency plus consultation mode constants/type, and widen `isUrgency`. Parent must integrate this contract and migrate the domain package's typecheck script if needed. Language registry files were untouched.
5. Fresh local fixtures use the required schema fields. If a deployment already has data, the parent must plan explicit backfill/migration for profile modes, slot/booked modes and case context revisions; no existing hosted data was guessed or changed.

## Exact authored files

All paths are relative to `rebuild/`.

- `packages/backend/convex/admin.ts`
- `packages/backend/convex/advocates.ts`
- `packages/backend/convex/bookings.ts`
- `packages/backend/convex/cases.ts`
- `packages/backend/convex/credentials.ts`
- `packages/backend/convex/schema.ts`
- `packages/backend/convex/slots.ts`
- `packages/backend/convex/triage.ts`
- `packages/backend/convex/triageRate.ts`
- `packages/backend/convex/lib/discovery.ts`
- `packages/backend/convex/lib/lifecycle.ts`
- `packages/backend/convex/lib/validators.ts`
- `packages/backend/tests/backend.test.ts`
- `packages/backend/tests/import-meta.d.ts` (new)
- `packages/backend/tsconfig.json`
- `packages/backend/package.json` (typecheck command only)
- `packages/backend/API.md`
- `packages/backend/ARCHITECTURE.md`
- `packages/backend/VALIDATION.md` (new)
- `packages/domain/src/index.ts` (shared contract; parent integration required)

The existing local generator also produced `packages/backend/convex/_generated/api.js`, `api.d.ts`, `server.js`, `server.d.ts`, and `dataModel.d.ts`. These are untracked generated artifacts, not handwritten bindings; the parent decides their integration policy.

## Parent integration additions

The parent added a status-filtered administrative profile queue, redacted account management query, future-only participant cancellation, and global availability ranking within a bounded 500-profile pilot cohort. New tests prove approved/suspended review reachability, role enforcement/redaction, disable/reactivation, cancellation at slot start, strict language filtering before pagination, ranked pages, and rejection of cursors from different filters. Final focused backend run: **40 passed**, with backend and domain native TypeScript checks passing. Full-workspace/browser evidence is recorded separately in `docs/verification.md`.

## Worker repository state and limits

Branch: `master`; inspected starting commit: `03e3204` (`docs(rebuild): record service activation and acceptance gates`). Source files were already untracked in this worktree; unrelated parent changes remain present. The worker performed no commit, staging, push, install, lockfile edit, codegen-script edit, legacy edit, or secret read. Parent Git actions are recorded in `docs/verification.md`.

No local backend implementation blocker remains. Parent-owned client integration and hosted acceptance are outstanding. The next integration step is to consume the updated generated API contracts in the web client and run the parent's complete checks.
