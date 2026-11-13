# Legal-Setu mobile (`@legal-setu/mobile`)

Native client (Expo SDK 58, React Native 0.88, Expo Router) for people seeking legal help: discover approved advocates, keep private cases, chat with the case assistant, request a consultation, and read alerts. Advocate and admin tools stay on the website. The app uses the same Convex backend and Clerk identity as the web app, and shares `@legal-setu/domain`, `@legal-setu/i18n` and the Convex API types. It does not use `@legal-setu/ui`, which is DOM-only.

Status: first MVP build. It type-checks, unit tests pass and the Android bundle exports. It has **not** been run on a device or emulator, and no live Clerk or Convex sign-in has been exercised from this app. See "Not verified" below.

## Run it

1. Install from the workspace root: `cd rebuild && bun install`.
2. Create the local config (never commit it):
   ```sh
   cp apps/mobile/.env.example apps/mobile/.env.local
   ```
   Fill in only public values: `EXPO_PUBLIC_CONVEX_URL` (an `https://` deployment URL) and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (`pk_test_…` or `pk_live_…`). Never put a Clerk secret key or a Convex deploy key in this app.
3. Start Metro: `bun run --filter @legal-setu/mobile start`, or `bun run --filter @legal-setu/mobile android` for an emulator or device.
   `EXPO_PUBLIC_*` values are inlined at bundle time. After changing `.env.local`, restart with a cleared cache: `bun run --filter @legal-setu/mobile start -c`.

With missing or invalid values the app shows a "Service setup is incomplete" screen that names the missing variables. It does not crash.

## Verify

Run from `rebuild/` unless noted.

| Check | Command |
| --- | --- |
| Types (mobile + the workspace packages it imports) | `bun run --filter @legal-setu/mobile typecheck` |
| Unit tests (pure helpers) | `bun run --filter @legal-setu/mobile test` |
| Android bundle (proves Metro resolves workspace TypeScript) | `cd apps/mobile && bunx expo export --platform android --output-dir <tmp-dir>` |
| Expo project health | `cd apps/mobile && bunx expo-doctor` |

`turbo run typecheck test --filter=@legal-setu/mobile` runs the same typecheck and test tasks through Turborepo.

## Layout

- `app/`: Expo Router routes. `(tabs)/` holds Discover, Cases, Bookings, Alerts and Profile. `advocate/[advocateId]`, `request/[advocateId]`, `case/new`, `case/[caseId]`, `sign-in` and `sign-up` are stack screens.
- `src/features/`: screens by area (discovery, cases, bookings, alerts, profile, auth, account gate).
- `src/providers/`: Clerk + Convex composition (`ClerkProvider` with a `expo-secure-store` token cache, then `ConvexProviderWithClerk`) and the interface-language provider.
- `src/lib/`: pure helpers with tests: config parsing, errors, locale, account-gate state, chat retry rules, booking actions, drafts and limits, IST formatting, speech-voice selection, consent notice and copy templating.
- `src/speech/`: read-aloud through device voices (`expo-speech`).

## Behaviour that mirrors the web app

- **Account gate:** private screens render only for an active `user` account. Signed-out users get a sign-in prompt; a `null` account goes to onboarding (display name and language, then `accounts.ensure({ role: "user" })`); advocate and admin accounts see a "use the website" screen; disabled accounts see the disabled notice.
- **Discovery:** `advocates.listPublic` with domain, language and city filters and "Load more"; advocate details via `advocates.resolvePublic`, `advocates.getPublic` and `slots.listPublic`. Times are shown in IST.
- **Booking:** choose a case with a saved summary, review the exact summary version, give explicit consent, then `bookings.request`. The idempotency key is generated once per screen and reused on retry. Participants can cancel only before a slot starts (`bookings.transition`, `"cancel"`). Pending requests show their expiry.
- **Case chat:** `chat.send` requires the server's `contextKey`, a stable `requestId`, `consent: true`, and `allowVertexFallback` only when the server enables it. Retries reuse the request ID only for an in-progress result. Unavailable and rate-limit results show their reason and are never reported as success.
- **Summaries:** manual versions via `cases.updateSummary` with `expectedVersion`. An optional AI draft via `triage.analyze` requires its own consent each time the case version or context changes.
- **Consent texts:** the Vertex-fallback notice is copied from the web component. AI output carries the preliminary-information disclaimer.
- **Read-aloud:** offered only when the device reports a voice for the text's language (`Speech.getAvailableVoicesAsync`). Otherwise the control is disabled with an explicit label. The app does not use the web's bundled speech engine.

## Languages

Interface languages are English, Hindi and Punjabi. Strings come from the `@legal-setu/i18n` draft bundles where they exist. Mobile-only copy is English (`src/lib/strings.ts`). Intake language can be any registered language, mirroring the web. AI and speech are offered only when the server lists the language and the device has a voice. Translations are drafts that have not been reviewed by a human; the app says so.

## Not in this MVP

- Case document upload and selection: show "available on the website". Chat sends no attachments.
- Advocate applications, credential upload, the advocate desk, the admin queue and affected-booking handling.
- Advocate comparison, client reviews and ratings.
- Case follow-up appends.
- Voice input (speech-to-text): a TODO sits in `src/features/cases/new-case-screen.tsx`.
- Payments, ElevenLabs and avatars.

## Clerk dashboard (owner steps)

1. Enable the **native API** for the Legal-Setu Clerk application (Configure → Native applications). `@clerk/expo` needs it for native sessions.
2. Enable the first factors this app uses: **Email and password**, and **Email verification code** for sign-in and sign-up. Enable email-address verification for sign-up.
3. Keep the **`convex`** JWT template that the web app already uses. Convex verifies Clerk tokens with audience `convex` (`packages/backend/convex/auth.config.ts`).
4. Native OAuth, passkeys and bundle-ID registration are not used by this MVP. If they are added later, register the Android package `in.legalsetu.app` and the iOS bundle ID `in.legalsetu.app` with Clerk.

## Known issues and decisions for the owner

- **Duplicate native modules (expo-doctor):** with Bun's default isolated linker, `expo-doctor` reports duplicate `expo-constants`, `expo-font`, `expo-linking` and `expo-status-bar`. Native builds can reject this. `bun install --linker hoisted` (run once from the root) makes `expo-doctor` pass 20/20. Making that the workspace default needs a root `bunfig.toml`, which is outside this app. Decide before the first EAS build.
- **react-dom:** listed although the app never renders to the web. It is included so Bun resolves the Expo packages with the same peer set as the web workspace (Expo's own template does the same). It is not imported at runtime.
- **Clerk package:** `@clerk/clerk-expo` is deprecated. This app uses `@clerk/expo` 4.x (Core 3). The lockfile moved the top-level `@clerk/shared` from 4.40.0 to 4.44.1 for this app. The web app keeps its nested 4.40.0 copies.
- **Discovery and inbox counts:** the alerts tab badge counts unread items in the first 50 notifications and shows `N+` when more pages exist. Convex exposes no unread-count query.
- **Long case threads:** chat turns are rendered in one scroll view, not a virtualized list. Very long threads will be slower.
- **Time zones:** times use `Intl` with `Asia/Kolkata`, with a fixed +05:30 fallback where the runtime lacks time-zone support.
- **Configuration URL:** the Convex URL must be `https`, matching the web configuration rule. A local `http://` backend will show the setup screen.

## Not verified

- Running on a device or emulator (sign-in, sign-up, email codes, notifications, safe areas on small Android phones, keyboard behaviour).
- Live Clerk and Convex sessions from the app, and any backend write made through it.
- Voice availability and speech quality on real devices.
- Expo Go compatibility versus a development build.
- Accessibility with a screen reader.
