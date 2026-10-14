# Vakil Setu rebuild

A new responsive multilingual legal intake and consultation application, separate from the legacy Vite/Express implementation. The pilot languages are English, Hindi and Punjabi. AI output is preliminary information and requires professional review.

## Stack

Next.js 16.4.0, React 19.3.0, Convex 1.46.0, Clerk, Bun 1.4.3, Turborepo 2.11.8, Tailwind 4.3.3, shadcn UI components, and TypeScript 7.0.2's native Go compiler. Versions are pinned and recorded in `bun.lock` after installation.

## Development

Install Bun 1.4.3 or later and Node.js 24. The current Windows workstation also has a task-local Bun binary at `.tooling/node_modules/bun/bin/bun.exe`; it is ignored by Git.

```powershell
cd C:\Users\DELL\Vakil-Setu\rebuild
bun install --frozen-lockfile
bun run dev
```

The web app runs at http://localhost:3000. It renders public pages and explicit setup notices without service credentials. Authenticated persistence is not simulated.

Configure hosted Clerk and Convex using the examples in `apps/web` and `packages/backend`; see `docs/setup.md`. Never commit environment files. Clerk owns passwords and sessions; the Convex backend owns application roles and permissions. Bootstrap the first administrator through an internal backend operation, never a public role selector.

```powershell
bun run typecheck
bun run test
bun run build
bun run doctor
```

See `docs/verification.md` for the exact checks performed and remaining live acceptance work. A build is not evidence of real Clerk sessions, hosted persistence, speech accuracy, or DGX inference.

## Layout

- `apps/web`: responsive Next.js portal and role-specific workflows.
- `packages/backend`: Convex schema, authorized queries/mutations/actions, reservation lifecycle and tests.
- `packages/domain`: shared domain constants and types without browser dependencies.
- `packages/i18n`: language registry and English/Hindi/Punjabi interface translations.
- `packages/ui`: web shadcn components.
- `apps/mobile`: documented future React Native boundary; mobile implementation is deferred.
- `vendor/fleet`: cloned agent skills, excluded from the application tree; restore instructions in `docs/fleet-reference.md`.
- `docs`: source SRS extraction, decisions, legacy audit, setup and evidence.

## Release boundary

Accounts, approved advocate profiles, reviewed intake, discovery, private summaries, future slots, consultation requests, acceptance, cancellation/expiry and notifications form the MVP. Payments, reviews, guaranteed emergency connection, legal drafting and native mobile are deferred.

The legacy gateway contract is documented in `docs/legacy-ai-audit.md`. The user has no DGX endpoint documentation yet. Until configured and verified, AI is unavailable; no successful model result is invented. Browser recognition may use a browser vendor's remote service and is never described as universally local or private.
