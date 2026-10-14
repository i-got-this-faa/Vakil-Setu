# Local build and hosted activation

The local public website can run without accounts or service keys. Real registration, cases, advocate approval and bookings require the hosted services below. The user confirmed these projects have not yet been created. Never paste secret keys into chat or commit environment files.

## Local development

From `rebuild` with Bun 1.4.3 and Node.js 24:

```powershell
bun install --frozen-lockfile
bun run typecheck
bun run test
bun run build
bun run dev
```

On this workstation, the ignored local Bun executable is `.tooling/node_modules/bun/bin/bun.exe`. Open http://localhost:3000. A setup notice means persistence is unconfigured; it is not a demo login.

## Clerk and Convex

1. Create a Clerk development application. Configure its registration/session policy in Clerk; the application does not store passwords.
2. Activate Clerk's Convex integration and obtain the Frontend API issuer URL. The Convex auth config uses `applicationID: "convex"`. If using a legacy Clerk application with JWT templates, follow the integration's matching `convex` token setup.
3. From `packages/backend`, run `bunx convex dev` and authenticate to create or select a hosted development project. This generates the ignored `.env.local` deployment configuration. Confirm that it targets the rebuild project before any deployment.
4. In that Convex deployment's dashboard environment settings, set `CLERK_JWT_ISSUER_DOMAIN` to the Clerk issuer URL. This exact name is read by `convex/auth.config.ts`. Run `bunx convex dev --once` again to sync the auth configuration and backend functions.
5. Copy `apps/web/.env.local.example` to `apps/web/.env.local`. Set `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY` using the corresponding development dashboards. Public keys/URLs are client configuration; the Clerk secret remains server-only.
6. Restart the web app. Confirm Clerk login succeeds and Convex reports authenticated identity before onboarding a user or advocate. Application role is checked in backend records, independent of any client role selector.

The first administrator is created through the internal `accounts.bootstrapAdmin` operation with an explicit Clerk subject, display name, and pilot locale. Use the Convex dashboard's function runner or the CLI for that deployment; never add administrator choice to public registration. Inspect `packages/backend/API.md` for its exact arguments before invoking it. This operation has not been run against a hosted project.

Use separate user, advocate and administrator accounts. Upload/review a private advocate credential, approve the profile, publish a future slot, save an intake, approve a summary version and request the slot. Accept from the assigned advocate account and confirm the user sees the persisted decision after refresh. Attempt unauthorized reads and a simultaneous second reservation. These are activation checks, not checks already completed by the local build.

## DGX activation

The user has no DGX URL or API documentation yet. The old gateway contract is recorded in `legacy-ai-audit.md`. Set provider values only in Convex deployment environment settings. Never use `NEXT_PUBLIC_` for AI credentials.

Expected configuration names are `LLM_PROVIDER`, `GATEWAY_BASE_URL`, `LLM_API_URL`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_API_KEY_HEADER`, and `LLM_API_KEY_PREFIX`; confirm the implementation's example and provider adapter before activation. Timeout and language capability configuration are separate. An unconfigured or invalid provider returns an explicit unavailable result. Manual intake and user-written summaries remain usable after hosted activation.

Before enabling real case submission, obtain the actual request/response protocol, supported models/locales, privacy/retention terms and quotas. The old host and `qwen3:latest` string do not prove a DGX deployment. Server speech remains unavailable until its protocol is documented. Browser speech may send audio to the browser vendor; it is an optional adapter with typed fallback.

Sources: [Convex Clerk integration](https://docs.convex.dev/auth/clerk), [Clerk Next.js setup](https://clerk.com/docs/nextjs/getting-started/quickstart), [Convex CLI](https://docs.convex.dev/cli/overview). Follow current dashboard prompts if the provider setup UI changes.
