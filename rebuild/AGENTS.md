# Vakil Setu rebuild

This workspace is the new implementation. In the original parent checkout it is under `rebuild/`; in the standalone repository it is the root. Preserve any legacy application and unrelated files when working in the parent checkout. Commit only scoped workspace changes. Do not push without user authorization.

## Fleet references

Fleet is cloned at `vendor/fleet` from https://github.com/jr4dh3y/fleet. Read its `AGENTS.md` and relevant skills before work. This checkout is reference material, not a runtime dependency; do not edit it. Clone it again if absent. Track its source revision in `docs/fleet-reference.md`.

Apply these skills: `vendor/fleet/skills/typescript-best-practices/SKILL.md`, `principle-type-system-discipline/SKILL.md`, `principle-boundary-discipline/SKILL.md`, `hit-every-surface/SKILL.md`, `finish-the-work/SKILL.md`, and `verify-real-behavior/SKILL.md`. Use the parent user's blunt critique instructions; do not invent completion, legal accuracy, benchmarks, or language support.

## Confirmed decisions

- Next.js latest stable 16.x; Bun workspaces and Turborepo; Convex hosted persistence; Clerk identity; shadcn/ui and Tailwind.
- Use the TypeScript native Go compiler for type checks. Document its actual release status. The compiler's implementation language does not require a separate Go application service.
- Pilot English, Hindi, Punjabi. Registry covers all 22 scheduled Indian languages plus English; speech and AI capability must remain truthful and independent of interface translations.
- MVP: account roles, advocate onboarding and private credential review, administrator approval, reviewed multilingual intake, discovery, private versioned summaries, slots, consultation requests and advocate acceptance, notifications and cancellation/expiry.
- Deferred: payments, commissions, reviews, guaranteed emergency connections, native mobile implementation. Share platform-independent domain/language packages so React Native can be added later.
- AI drafts now use Google Gemini directly, replacing the gateway runtime. Configure GEMINI_API_KEY and optional GEMINI_MODEL only in Convex. Keep historical gateway record labels readable, preserve explicit unavailable states, and never fabricate successful triage or booking.
- Never read or print actual legacy `.env` credentials. Read `.env.example` only.

## Collaboration

Use T3 delegated tasks with explicit file ownership. Requested providers: GPT-6.1 medium/high for complex work, Muse Spark 1.3 Free xhigh and Gemini 3.8 Flash High for normal work, GPT-6-Luna xhigh for smaller work. Verify availability through the live catalog. Parent integrates and commits; workers must not commit shared index changes.

## Validation

Validate input at external boundaries, derive identity and role on the backend, use atomic Convex mutations for reservation/lifecycle, never trust client ownership. Backend access controls apply even when the UI hides controls. Label development fixtures. A build does not prove hosted persistence, real Clerk login, DGX inference, speech accuracy, or language comprehension. Record exact checks and missing live acceptance evidence.
