# Convex and Clerk setup at the repository root

## Convex: one backend, referenced from the root

The Convex backend is `rebuild/packages/backend/convex/` (schema, functions, `auth.config.ts`, and generated bindings in `_generated/`). The root does not own a second backend.

- **Root `convex.json`** sets `"functions": "rebuild/packages/backend/convex/"`. The Convex CLI run from the root therefore resolves the existing backend rather than a new `convex/` directory. No root `convex/` exists, so there is no second `schema.ts` and no duplicate bindings.
- **Root dependency** `convex@1.46.0` (exact pin) matches `rebuild/packages/backend`, `rebuild/apps/mobile`, and the frontend's `^1.46.0` resolution.
- **Root `npm run convex:dev` script** runs `convex dev` against the existing backend. It was added as requested but not run: it syncs functions to a configured deployment. `rebuild/packages/backend` also defines `dev` and `codegen`.
- **Codegen is offline in this workspace.** Convex 1.46's `codegen` needs a deployment for this setup, so use `cd rebuild && bun run backend:codegen:local` (see `rebuild/scripts/codegen-local.mjs`). It contacts no deployment.

### Convex AI files (installed by `npx convex ai-files install`)

| Path | Purpose |
| --- | --- |
| `rebuild/packages/backend/convex/_generated/ai/guidelines.md` | Convex API guidelines; `AGENTS.md` and `CLAUDE.md` point here |
| `rebuild/packages/backend/convex/_generated/ai/ai-files.state.json` | Installer state (hashes, skills revision) |
| `AGENTS.md`, `CLAUDE.md` (root) | Short Convex pointer section; no other content |
| `.agents/skills/` (root) | Convex agent skills (33) |
| `.claude/skills/` (root) | Copy of the same skills for Claude Code |
| `skills-lock.json` (root) | Skill source and hash lock written by the installer |

Check with `npx convex ai-files status`. Re-run the install if a download fails.

### Agent plugins

- Claude Code: `convex@claude-plugins-official` at user scope (marketplace `anthropics/claude-plugins-official`).
- Codex: `convex@convex-codex-plugin` (marketplace `convex/convex-codex-plugin`).

## Clerk: existing applications, no new application

Clerk is already wired in both clients and was not re-initialised. Initialising would create a replacement application and new keys.

| Client | Package (installed) | Clerk generation | Wiring |
| --- | --- | --- | --- |
| Avatar web (`frontend/`) | `@clerk/react` 6.18.6 | Core 2 (v5–v6 range) | `ClerkProvider` + `ConvexProviderWithClerk` in `frontend/src/state/ConvexServices.jsx` |
| Mobile (`rebuild/apps/mobile/`) | `@clerk/expo` 4.15.1 | Current (v3+ range) | `ServiceProviders` in `src/providers/service-providers.tsx`, token cache in `expo-secure-store` |

The two clients use the same Clerk application and Convex deployment but different SDK generations. The web client keeps Core 2 until someone chooses to upgrade it. Review both together when either is upgraded.

The backend `rebuild/packages/backend/convex/auth.config.ts` trusts the Clerk issuer in `CLERK_JWT_ISSUER_DOMAIN` with `applicationID: "convex"`. The matching Clerk JWT template is named `convex`.

## Live configuration still required

Nothing below was configured or verified against live services in this setup.

1. **Clerk dashboard (existing application):** activate the `convex` JWT template, and add the local and hosted web origins.
2. **Convex deployment environment (dashboard only):** `CLERK_JWT_ISSUER_DOMAIN`. The backend throws at startup when it is absent.
3. **Client public variables (local files, not committed):** `VITE_CONVEX_URL`, `VITE_CLERK_PUBLISHABLE_KEY` for the web client; `EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` for mobile. Use the same values for both clients.
4. **Hosted function sync:** not run. Sync the backend only through the operator workflow in `rebuild/docs/setup.md`.
5. **Sign-in test:** a real Clerk sign-in followed by an authenticated Convex identity check, in a browser and on a device.

## Local verification (no hosted calls)

- `frontend`: `vitest run` (8 tests pass); `vite build` succeeds.
- `rebuild/packages/backend`: `tsc --noEmit` exits 0; `vitest run` reports 277 passed, 1 skipped.
- `rebuild/packages/backend`: offline codegen leaves `_generated/` bindings unchanged.
- `rebuild/apps/mobile`: `tsc --noEmit` exits 0.
- Plugins: `claude plugin list` shows `convex@claude-plugins-official` enabled; `codex plugin list` shows `convex@convex-codex-plugin` installed and enabled.

Related: `rebuild/docs/setup.md` (Clerk and Convex steps for the Next.js client) and `docs/CONVEX_AVATAR_MIGRATION.md` (avatar client).
