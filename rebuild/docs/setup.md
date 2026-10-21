# Local build and hosted activation

The local public website can run without accounts or service keys. Real registration, cases, advocate approval and bookings require the hosted services below. Development services were provisioned on 15 October 2026; see `hosted-activation.md` for the current evidence. Never paste secret keys into chat or commit environment files.

## Local development

Run from the workspace root containing `package.json` (`rebuild/` in the original checkout, or the root of a standalone clone), with Bun 1.4.3 and Node.js 22 or newer. The workstation used for validation had Bun 1.4.3 and Node.js 24.14.1:

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

## Gemini activation

Set `GEMINI_API_KEY` in the Convex deployment environment. Optionally set `GEMINI_MODEL`; the default is `gemini-3.6-flash`. The backend calls Google's HTTPS GenerateContent endpoint directly using the server-only `x-goog-api-key` header. Old gateway/LLM variables are ignored. Never use `NEXT_PUBLIC_` for AI credentials.

Deploy the updated backend functions/schema and rebuild/restart the web app. A local environment file does not configure hosted functions. See [gemini-integration.md](gemini-integration.md) for the protocol, deployment steps, historical-record compatibility and failure handling.

AI requires explicit consent and user review. The backend requests structured JSON in the configured allowed locale, enforces bounded deadlines (60 seconds for chat) and validates the result. Missing configuration, blocked/truncated responses and invalid output remain explicit unavailable states. Manual summaries need no provider key. Check Google data-processing/retention terms before sending real case text.

There is no server speech endpoint in the rebuild. The web client has optional browser speech recognition for English, Hindi, and Punjabi with user consent and transcript review; the browser may send audio to its speech service, and language accuracy is unverified. English read-aloud selects a matching local device voice. Hindi/Punjabi read-aloud uses the bundled browser worker and Web Audio; it needs no installed device voices and downloads about 19 MB of voice data. Its audio lifecycle has been checked with synthetic text, but pronunciation, comprehension and physical speaker audibility are unverified. Keep typed input available. Review the engine's GPL/source/build provenance notice in `apps/web/public/speech/espeak-ng/NOTICE.md` before public redistribution.

Sources: [Convex and Clerk integration](https://docs.convex.dev/auth/clerk), [Clerk Next.js quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart), [Convex CLI](https://docs.convex.dev/cli/overview), [Convex internal functions](https://docs.convex.dev/functions/internal-functions), [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API), [MDN local speech voices](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService). Follow current dashboard prompts if the provider setup UI changes.

## 21 October scope reduction

Prioritize existing intake, private case chat/documents, summaries and bookings. The selected development deployment now uses `GEMINI_MODEL=gemini-3.6-flash`. `AI_CHAT_LOCALES` defaults to `en,hi,pa`; keep it restricted until evaluation supports expansion. Missing configuration, quota errors and provider failures remain explicit; saving manually still works. OpenAI routing is deferred: the supplied login token was rejected by the public API and is not configured as an application key. See `urgent-working-site-20261021.md` for current evidence and deferred work.
