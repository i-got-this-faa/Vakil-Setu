# Vakil Setu

A new responsive multilingual legal intake and consultation application, separate from the legacy Vite/Express implementation. The pilot languages are English, Hindi and Punjabi. AI output is preliminary information and requires professional review.

## Stack

Next.js 16.4.0, React 19.3.0, Convex 1.46.0, Clerk, Bun 1.4.3, Turborepo 2.11.8, Tailwind 4.3.3, shadcn UI components, and TypeScript 7.0.2's native Go compiler. Versions are pinned and recorded in `bun.lock` after installation.

## Development

Install Bun 1.4.3 or later and Node.js 24. Run commands from the workspace root (the directory containing this README and `package.json`). In the original checkout this is `rebuild/`; in a standalone clone it is the repository root.

```powershell
bun install --frozen-lockfile
bun run dev
```

The web app runs at http://localhost:3000. It renders public pages and explicit setup notices without service credentials. Authenticated persistence is not simulated.

Configure hosted Clerk and Convex using the examples in `apps/web` and `packages/backend`; see `docs/setup.md`. Never commit environment files. Clerk owns passwords and sessions; the Convex backend owns application roles and permissions. Bootstrap the first administrator through an internal backend operation, never a public role selector.

Saving an intake stores your own words privately; it does not run AI analysis. The saved case confirms that outcome and lets you review a manual summary starting from your intake or browse advocates. An AI draft requires a configured provider, explicit consent and review. No DGX endpoint has been supplied yet.

```powershell
bun run typecheck
bun run test
bun run build
bun run doctor
```

See `docs/verification.md` for the exact checks performed and remaining live acceptance work. A build is not evidence of real Clerk sessions, hosted persistence, speech accuracy, or DGX inference.

`bun run doctor` also checks the optional development reference at `vendor/fleet`. Restore it using [docs/fleet-reference.md](docs/fleet-reference.md) before running doctor; the app, build and tests do not require that checkout.

Local validation passes: native TypeScript checks across all five packages, 60 backend integration tests, 12 language tests, 6 React render tests, the production build, HTTP route checks, and browser checks at desktop/375/360px. Hindi/Punjabi read-aloud now uses a bundled local engine; real worker/audio lifecycle and eleven controlled browser scenario groups passed. Core pilot text is localized; longer English fallbacks are listed in `apps/web/README.md`. Human language/pronunciation review, physical speaker audibility and microphone recognition remain pending. Engine files need corresponding-source/build provenance review before public redistribution.

## Layout

- `apps/web`: responsive Next.js portal and role-specific workflows.
- `packages/backend`: Convex schema, authorized queries/mutations/actions, reservation lifecycle and tests.
- `packages/domain`: shared domain constants and types without browser dependencies.
- `packages/i18n`: language registry and English/Hindi/Punjabi interface translations.
- `packages/ui`: web shadcn components.
- `apps/mobile`: documented future React Native boundary; mobile implementation is deferred.
- `vendor/fleet`: cloned agent skills, excluded from the application tree; restore instructions in `docs/fleet-reference.md`.
- `docs`: source SRS extraction, decisions, legacy audit, setup and evidence.
- `materials`: [project documents, presentations, scripts and diagrams](materials/README.md), with original-source paths and preservation hashes in `materials/inventory.json`.
- `archive/legacy`: preserved Vite/Express source for reference, excluded from the active workspaces.

## Documents and presentations

The [materials catalogue](materials/README.md) links the SRS, synopsis, pitch reports, handoff guide, PowerPoint variants and speaker scripts. Older documents and legacy source describe previous designs; use `docs/requirements.md`, `docs/decisions.md` and `docs/verification.md` for the current implementation and its limits.

## Release boundary

Accounts, approved advocate profiles, reviewed intake, discovery, private summaries, future slots, consultation requests, acceptance, cancellation/expiry and notifications form the MVP. Payments, reviews, guaranteed emergency connection, legal drafting and native mobile are deferred.

The legacy gateway contract is documented in `docs/legacy-ai-audit.md`. The user has no DGX endpoint documentation yet. Until configured and verified, AI is unavailable; no successful model result is invented. Browser recognition may use a browser vendor's remote service and is never described as universally local or private.
