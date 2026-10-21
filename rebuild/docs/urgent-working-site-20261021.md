# Working-site checkpoint ? 21 October 2026

The user reduced scope to a usable current website ASAP; broader feature completion is deferred. This record supersedes completion assumptions in earlier task notes, not historical evidence.

## Newly observed

- Local Next development server is listening on port 3000 and collaborative browser renders home and discovery. Protected intake redirects to Clerk sign-in in this browser profile; no authenticated identity is available here. No auth bypass or real case submission was attempted.
- Native Go TypeScript checks pass for all five packages plus scripts. Normal test suite: 204 backend, 30 registry/localization, 18 React/localization tests pass; one opt-in live provider test skipped. Production Next build passes. Log is ignored `.runtime/urgent-check.log`.
- Selected existing Convex development deployment `chatty-sandpiper-446` synced successfully. Hosted `GEMINI_MODEL` readback is `gemini-3.6-flash`. Source includes Gemini adapter/deadline/locale gates, comparison, and review schema/functions; no production deployment or remote push.
- One final synthetic connectivity request to Gemini 3.6 returned HTTP 429, RESOURCE_EXHAUSTED, after 949ms. No answer was simulated. Earlier English/Hindi/Punjabi provider tests are documented separately; they do not prove current availability. Restore provider quota/billing or use a working server-side Gemini key before live chat can succeed. Generation traffic stopped.
- Public discovery at 390x844 fits viewport exactly (document/body scroll width 390). Kashmiri selection changes `lang=ks-Arab-IN`, `dir=rtl`; observed width stays 390. Draft language quality is unverified. English desktop home renders at 1280x800.
- Fresh regression test rejects a stale admin moderation decision after a new abuse report, keeps the queue entry, and preserves report deduplication. Both content revision and immutable report count are checked atomically.

## Current behavior

Existing reviewed intake, private-only save, consented Save and continue (pending label Saving?), case chat/documents, summary review, approval and booking access controls remain. Chat text may be copied into the private summary editor; this does not save/share it automatically. Existing approved advocate discovery now exposes comparison of up to three public profiles. Completed-booking owners can submit/edit/withdraw feedback, report abuse and admin moderation retains audit records; ratings derive from eligible published reviews.

## Deferred or unverified

- Full authenticated browser acceptance of save/chat/uploads, advocate/completed-booking feedback and admin flows is not newly observed. Backend behavior has automated coverage; the current preview profile requires sign-in.
- All 23 locale codes resolve. Complete draft bundles: en/as/bn/brx/doi/gu/hi/kn/ks/kok/mai/mr/pa. Other ten explicitly use English fallback; static operational labels remain partly English. All machine drafts require human review. AI stays enabled only for configured locales (default en/hi/pa); additional AI comprehension/output and speech accuracy are not established. Typed input remains available.
- Operational translation generator/checkpoint tooling is deferred and not applied to runtime components. Its full-coverage verification is separate from the normal app suite and intentionally fails until translation generation is complete. No further quota should be spent generating drafts during urgent site use.
- OpenAI/round-robin deferred: supplied login access token was rejected by public API (403), no supported application API key configured. No credentials copied into frontend or tracked files.
- No claim of production readiness, legal accuracy, translation quality or complete accessibility. No payments, native mobile or emergency guarantees.

## Changed surfaces

Web: intake/case/chat/summary gates, advocate discovery/comparison/reviews, administrator moderation, locale preferences/options, optional speech, logical-direction styles and locally hosted script fonts. Backend: provider adapter/diagnostics/timeout/locale gating; public comparison; feedback schema/access/eligibility/moderation/audit/aggregate logic and tests. Shared packages: 23-code registry, truthful draft/fallback metadata and typed localized copy. Maintenance scripts, setup/environment/API/evaluation documentation record current limits. Unrelated parent-directory documents and credentials are excluded.
