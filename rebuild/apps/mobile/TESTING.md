# Mobile testing note (`@legal-setu/mobile`)

Date: 2026-11-13. Scope: the native Expo app in `rebuild/apps/mobile` only. Expo SDK 58.0.25, React Native 0.88.1, Expo Router.

Evidence level reached: source reading, typecheck, unit tests, Expo doctor, Android production export, and a Metro dev bundle served over HTTP. **No device or emulator was used.** No live Clerk session, Convex auth, chat send, booking, speech, or persistence check was run from the app.

## Local configuration

- `apps/mobile/.env.local` (git-ignored) was created from only two allowlisted public values in `frontend/.env.local`: `VITE_CONVEX_URL` → `EXPO_PUBLIC_CONVEX_URL` and `VITE_CLERK_PUBLISHABLE_KEY` → `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`. Values are not recorded here.
- Before this run no mobile `.env.local` existed, so nothing conflicting was overwritten.
- The Clerk publishable key decodes to the `sharing-redbird-4901` instance (checked as a boolean). The Convex URL is the dev deployment `chatty-sandpiper-446` from the website config.
- Legacy `frontend/.env`, `backend/.env` and any secret key were not read.

## Checks run

Commands run from `rebuild/` unless noted. Typecheck and tests were run before and after the Expo bump.

| Check | Command | Result |
| --- | --- | --- |
| Types | `bun run --filter @legal-setu/mobile typecheck` | exit 0 |
| Unit tests | `bun run --filter @legal-setu/mobile test` | 46 pass, 0 fail, 99 `expect()` calls, 12 files |
| Expo doctor, before fix | `cd apps/mobile && npx --yes expo-doctor@latest` | 18/20. Failed: duplicate native modules; `expo` 58.0.24 vs expected `~58.0.25` |
| Expo doctor, after fix | same | 19/20. Failed: duplicate native modules only |
| Android production export | `cd apps/mobile && ./node_modules/.bin/expo export --platform android --output-dir <scratchpad>/android-export` | Exported. 1,529 modules. Hermes bundle about 5.5 MB |
| Metro dev server | `./node_modules/.bin/expo start --port 8081 --host lan --clear` | Listening on `*:8081`. LAN and localhost manifests return HTTP 200 |
| Metro Android dev bundle | `GET /apps/mobile/node_modules/expo-router/entry.bundle?platform=android` | HTTP 200, about 10.4 MB, no Metro errors in the log. Convex host and Clerk test key present in the bundle. Placeholder key absent |

`bunx expo-doctor` failed with exit 127 because the `expo` CLI was not on the path that `bunx` uses. Use `npx --yes expo-doctor@latest` from `apps/mobile`. `expo-doctor` is not a dev dependency of this app.

## Changes made

- `apps/mobile/package.json`: `expo` `~58.0.24` → `~58.0.25`, the version the SDK expects.
- `rebuild/bun.lock`: the only change from this run is the `expo` entry (`58.0.24` → `58.0.25`). The lockfile already had uncommitted changes from earlier work, which were left as they were.
- `apps/mobile/tsconfig.json`: rewritten by the Expo dev server. The explicit `expo-env.d.ts` include was dropped. The file is still covered by the `**/*.ts` glob, so typecheck scope is unchanged.
- `apps/mobile/.env.local`: created (git-ignored).
- No source, test, backend, schema, or web file was changed. No regression test was added: nothing in app code changed.

## Dependency warnings

- **Duplicate native modules** (`expo-constants`, `expo-font`, `expo-linking`, `expo-status-bar`). Cause: Bun's isolated linker. The fix is a workspace-level `bunfig.toml` (`linker = "hoisted"`), which is outside this app. The owner must decide before the first EAS or native build. This is the one remaining doctor failure, and it was not changed here.
- The Metro dev server was started with `--clear` to make sure the new `.env.local` values are inlined.
- Expo Go versus a development build is not decided. The app declares `scheme: legalsetu` and uses `expo-secure-store`, `expo-web-browser`, `expo-auth-session`, `expo-speech` and `@clerk/expo`. Compatibility with Expo Go on SDK 58 is unverified.

## Read-through findings (no code change)

- **Possible infinite loading state:** `useAccountGateState` shows a loading state while Clerk is signed in but Convex is not authenticated. If the Clerk `convex` JWT template is missing, or the Convex `CLERK_JWT_ISSUER_DOMAIN` does not match the Clerk instance, the app stays on the spinner with no error. This is a plausible runtime blocker. It needs a live check. A timeout message would make it visible; that is a product decision, so it was not added.
- The Convex hosted deployment's `CLERK_JWT_ISSUER_DOMAIN` and its match to the Clerk instance are **unverified**. Reading that env requires a hosted-deployment read that was out of scope.
- `frontend/.env.local` has a stale comment that says the Clerk key is "NOT set yet" while the variable has a value. That file is outside this scope; noted only.
- Router params and navigation targets (`advocateId`, `caseId`, `slotId`, `/request/...?slotId=`) match their route files. Typed Convex references are checked by typecheck.
- No browser-only globals (`window`, `document`, `localStorage`, `crypto.randomUUID`) are used in app code. IST date formatting falls back to a fixed `+05:30` rendering when `Intl` time-zone support is missing.

## Metro for phone testing

- Running at `http://10.253.17.183:8081`. Expo Go URL: `exp://10.253.17.183:8081`. The phone must be on the same network as this machine, and the firewall must allow port 8081.
- QR image (not printed to the terminal): `<scratchpad>/expo-go-qr.png`, the scratchpad of the test session.
- Metro log: `<scratchpad>/metro-watch.log`. The dev server runs without `CI=1` so fast refresh works.
- Restart: `cd rebuild/apps/mobile && ./node_modules/.bin/expo start --port 8081 --host lan --clear`. Clear the cache again after any `.env.local` change.

## Not verified

- Any device or emulator run (sign-in, sign-up, email codes, notifications, safe areas on small Android phones, keyboard behaviour).
- Live Clerk sign-in or sign-up from the app, and the Clerk `convex` JWT template.
- Convex hosted auth, the issuer value, and any read or write through the app. No account, booking, or chat was created, and no billable provider was triggered.
- Voice input and read-aloud on real devices.
- Persistence across app restarts.
- Expo Go compatibility versus a development build.
- Accessibility with a screen reader.


## Website visual alignment — November 13, 2026

The mobile theme now uses the active Vite website's indigo primary colors, slate text,
light neutral background, thin card borders, compact corner radii, and serif headings.
Native Georgia (iOS) / serif (Android) substitutes for the website's Fraunces font;
body text stays in the platform font. No remote font download is needed.

Shared UI components apply these treatments to discovery, cases, bookings, alerts,
profile, authentication, and account setup. The tab layout adds the Legal-Setu wordmark
and uses the same indigo selection treatment; stack headers use the heading font.
Chat uses pale indigo user bubbles and bordered white assistant bubbles. Splash and
adaptive icon background configuration uses indigo. Avatar visuals remain absent.
Native tab navigation, 48-point touch targets, safe areas, and existing service logic
are preserved. This aligns the visual language; the native screen flow still differs
from the website's desktop navigation.

Validation: mobile TypeScript and all 46 helper tests pass. Android production export also passes (1,529 modules, 5.5 MB Hermes bundle,
`/tmp/vakil-mobile-ui-parity`). Device layout, font fallback for Hindi/Punjabi, keyboard behavior,
and live account/case/booking flows still need a phone or emulator check.
