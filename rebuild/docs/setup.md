# Local build and hosted activation

The local public website can run without accounts or service keys. Real registration, cases, advocate approval and bookings require the hosted services below. The user confirmed these projects have not yet been created. Never paste secret keys into chat or commit environment files.

## Local development

From `rebuild` with Bun 1.4.3 and Node.js 22 or newer. This workstation currently has Bun 1.4.3 and Node.js 24.14.1, matching the workspace package-manager and engine fields:

```powershell
bun install --frozen-lockfile
bun run typecheck
bun run test
bun run build
bun run dev
```

On this workstation, the ignored local Bun executable is `.tooling/node_modules/bun/bin/bun.exe`. Open http://localhost:3000. A setup notice means hosted services are unconfigured; it is not a demo login. The web app can render the public preview without credentials, but this does not test login or persistence.

## Clerk and Convex

1. Create a Clerk development application. Configure its registration/session policy in Clerk; the application does not store passwords.
2. Activate Clerk's Convex integration and copy the Clerk Frontend API URL. The backend `auth.config.ts` uses this as `CLERK_JWT_ISSUER_DOMAIN` with `applicationID: "convex"`.
3. Create or select the rebuild's Convex development deployment in the Convex dashboard. Before syncing functions, set `CLERK_JWT_ISSUER_DOMAIN` in that deployment's environment settings. The current `auth.config.ts` throws when this value is absent.
4. From `packages/backend`, run `bun run dev --once` to sync the auth config and functions. For ongoing development, run `bun run dev`. These commands use the installed `convex` dependency declared by `@vakil/backend`; `convex dev` generates the ignored local deployment configuration. Confirm that it targets the rebuild project before any deployment.
5. Copy `apps/web/.env.local.example` to `apps/web/.env.local`. Replace the placeholders using the Clerk and Convex development dashboards:

   ```text
   NEXT_PUBLIC_CONVEX_URL=<Convex deployment URL>
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<Clerk publishable key>
   CLERK_SECRET_KEY=<Clerk secret key>
   ```

   The public URL and publishable key are client configuration. `CLERK_SECRET_KEY` remains server-only. `.env.local` is ignored by Git.
6. Restart the web app. Confirm Clerk login succeeds and Convex reports authenticated identity before onboarding a user or advocate. Application role is checked in backend records, independent of any client role selector.

The first administrator is created through the internal `accounts.bootstrapAdmin` operation with an explicit Clerk subject, display name, and pilot locale. Use the Convex dashboard's function runner or `convex run` against the selected development deployment; never add administrator choice to public registration. Inspect `packages/backend/API.md` for its exact arguments before invoking it. This operation has not been run against a hosted project.

Use separate user, advocate and administrator accounts. Upload/review a private advocate credential, approve the profile, publish a future slot, save an intake, approve a summary version and request the slot. Accept from the assigned advocate account and confirm the user sees the persisted decision after refresh. Attempt unauthorized reads and a simultaneous second reservation. These are activation checks, not checks already completed by the local build.

## DGX activation

No DGX URL or API documentation is available. The legacy values in `legacy-ai-audit.md` came from `.env.example`; they are not confirmed rebuild settings or evidence of a DGX deployment. Set any provider values only in the Convex deployment environment. Never use `NEXT_PUBLIC_` for AI credentials.

The rebuild currently implements only a server-side `gateway` provider adapter. Its code contract is:

- `LLM_API_KEY` is required. `LLM_PROVIDER` defaults to `gateway`; every other provider value is unavailable.
- The legacy `GEMINI_*` and `LLM_FALLBACK_MODE` settings are not read by the rebuild adapter. Do not copy them as rebuild configuration.
- Set `LLM_API_URL` to an absolute HTTPS URL, or set `GATEWAY_BASE_URL` and optionally `LLM_API_URL` (which defaults to `/gateway/llm/chat`). The adapter rejects non-HTTPS URLs. `LLM_MODEL` selects the body model; the sample `qwen3:latest` string is not a deployed-model assertion. The default header is `Authorization` with a `Bearer` prefix; header name and prefix can be overridden.
- The adapter sends a chat-completions-shaped JSON request with a system instruction and the reviewed case text. A response must contain JSON with `sourceMode: "provider"`, `provider: "gateway"`, the exact requested pilot locale (`en`, `hi`, or `pa`), an allowed domain and urgency, a non-empty summary, and bounded actions. Tag validation does not prove that the text is understandable or legally correct in that language.
- The request timeout is hard-coded to 30 seconds; it is not an environment setting. The language capability registry is also not provider configuration. An unset or invalid provider returns an explicit unavailable result. Manual intake and user-written summaries do not require an AI key.

Before sending real case text, obtain the gateway operator's actual request/response protocol, supported model and locale details, data processing and retention terms, and quotas. A matching URL, key prefix, model tag, or successful response proves only that a gateway returned a response; none identifies the hardware serving it. Do not configure the old host or claim DGX-backed inference without operator evidence tying a live request to DGX Spark hardware.

There is no server speech endpoint in the rebuild. The web client has optional browser speech recognition for English, Hindi, and Punjabi with user consent and transcript review; the browser may send audio to its speech service, and language accuracy is unverified. Read-aloud selects local device voices with a matching language tag, but pronunciation is untested. Neither path is accepted as release speech support; keep typed input available.

Sources: [Convex and Clerk integration](https://docs.convex.dev/auth/clerk), [Clerk Next.js quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart), [Convex CLI](https://docs.convex.dev/cli/overview), [Convex internal functions](https://docs.convex.dev/functions/internal-functions), [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API), [MDN local speech voices](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService). Follow current dashboard prompts if the provider setup UI changes.
