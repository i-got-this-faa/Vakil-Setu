# Legal-Setu developer setup

This guide covers going from a fresh clone to a running backend, website and mobile app. For background on the product and its decisions, see `rebuild/docs/` and `docs/`.

## 1. What is in this repository

Legal-Setu is a multilingual legal help app for people in India. People describe their problem by voice or text in their own language, get simple legal information, and book a lawyer.

Every client talks to **one shared backend**: Convex for the database and server functions, and Clerk for sign-in.

| Path | What it is | Stack | Runs at |
| --- | --- | --- | --- |
| `rebuild/packages/backend/` | **Shared backend**: schema, queries, mutations, actions, crons, tests | Convex 1.46, TypeScript | Convex cloud |
| `rebuild/apps/mobile/` | **Voice-first mobile app** (talk, book a lawyer, emergency) | Expo SDK 58, React Native 0.88, Expo Router, `@clerk/expo` | Expo Go / device |
| `frontend/` | **Avatar website** (chat with a talking avatar) | Vite 5, React 18, `@clerk/react` | http://localhost:5173 |
| `rebuild/apps/web/` | Next.js portal (user, advocate and admin workflows) | Next.js 16, React 19, Tailwind 4, `@clerk/nextjs` | http://localhost:3000 |
| `rebuild/packages/domain/` | Shared types and constants (no browser code) | TypeScript | – |
| `rebuild/packages/i18n/` | Language registry and interface strings (en, hi, pa, …) | TypeScript | – |
| `rebuild/packages/ui/` | shadcn components for the Next.js app | React | – |
| `backend/` | **Legacy** Express/Mongo prototype, plus legal-data scrapers and WhatsApp/Twilio demos. Active clients do not call it. | Node, Express | – |
| `rebuild/archive/legacy/` | Old source, kept only for reference | – | – |

`rebuild/` is a **Bun + Turborepo workspace**. `frontend/` and `backend/` are separate **npm** projects. The root `convex.json` points the Convex CLI at `rebuild/packages/backend/convex/`, so there is only one Convex backend.

```
            ┌────────────── Clerk (sign-in, JWT template "convex") ──────────────┐
            │                                                                     │
 Mobile app (Expo) ─┐                                                             │
 Avatar site (Vite) ┼──► Convex deployment ◄── rebuild/packages/backend/convex ───┘
 Next.js portal ────┘        │
                             ├─► Google Gemini (chat, triage, embeddings, speech)
                             ├─► Bhashini (Indian-language speech and translation, optional)
                             ├─► DGX / Vertex AI (optional model routes)
                             └─► WhatsApp Cloud API (optional)
```

## 2. Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Bun | **1.4.3+** | Package manager for `rebuild/` (`packageManager: bun@1.4.3`) |
| Node.js | **22+** (24 recommended) | Needed by the Convex CLI, Vite and Next.js |
| npm | bundled with Node | For `frontend/` and `backend/` |
| Git | any recent | – |
| Expo Go | build matching **SDK 58** | On your phone, for the mobile app |
| Accounts | Convex, Clerk, Google AI Studio (Gemini key) | Free tiers work for development |

## 3. Clone and install

```bash
git clone https://github.com/i-got-this-faa/Vakil-Setu.git
cd Vakil-Setu

# Bun workspace: backend, mobile, Next.js portal, shared packages
cd rebuild
bun install --frozen-lockfile
cd ..

# Avatar website (npm)
npm ci --prefix frontend

# Optional: root helpers and the legacy backend tools
npm ci
npm ci --prefix backend
```

## 4. Set up the backend (Convex + Clerk)

Every client depends on this. Do it first.

### 4.1 Clerk

1. Create a Clerk development application for a fresh setup. For an existing development deployment, ask the team for access to its Clerk application so users and keys match.
2. In Clerk, open **Integrations → Convex** (or **JWT Templates**) and enable the template named **`convex`**.
3. Copy the **Frontend API URL**, for example `https://xxxx.clerk.accounts.dev`. You will use it as `CLERK_JWT_ISSUER_DOMAIN`.
4. Copy the **publishable key** (`pk_test_…`). The clients use it. Only the Next.js portal also needs the **secret key** (`sk_test_…`).
5. Add your local origins (`http://localhost:5173`, `http://localhost:3000`) to the allowed origins.
6. Enable phone number verification in Clerk to test mobile sign-in.

### 4.2 Convex

1. Create or select a cloud development deployment in the Convex dashboard.
2. Open its environment settings and set `CLERK_JWT_ISSUER_DOMAIN` to your Clerk Frontend API URL. `convex/auth.config.ts` requires it on the first sync. Set `GEMINI_API_KEY` in the same dashboard if you're testing AI features.
3. Select that deployment and sync the functions. Replace `your-team:your-project:dev/your-dev-ref` with the development deployment reference shown in the dashboard. Selection writes the ignored `rebuild/packages/backend/.env.local` file.

   ```bash
   cd rebuild/packages/backend
   bunx convex login
   bunx convex deployment select your-team:your-project:dev/your-dev-ref
   bunx convex dev --once
   ```

4. Copy the deployment URL (`https://<name>.convex.cloud`) from the Convex dashboard. All clients use this URL. During development, run `bun run dev` in `rebuild/packages/backend` to watch and sync backend changes.

Store backend secrets in the Convex deployment's environment settings. For CLI entry without putting the secret in shell history, run `bunx convex env set GEMINI_API_KEY` and follow the prompt.

### 4.3 Backend environment variables (set in Convex, not in files)

| Variable | Required? | Purpose |
| --- | --- | --- |
| `CLERK_JWT_ISSUER_DOMAIN` | **Yes** | Clerk Frontend API URL. Sign-in fails without it. |
| `GEMINI_API_KEY` | **Yes for AI** | Chat, triage, voice replies, embeddings. Without it, AI features show "unavailable". |
| `GEMINI_API_KEYS`, `GEMINI_KEY_ORDER` | Optional | Several keys, used in rotation when one hits its quota |
| `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS`, `GEMINI_ATTEMPT_TIMEOUT_MS`, `GEMINI_TTS_MODEL` | Optional | Model choice and timeouts |
| `AI_CHAT_LOCALES`, `AI_VOICE_LOCALES` | Optional | Comma-separated languages with AI turned on (chat defaults to `en,hi,pa`) |
| `AI_PROVIDER` | Optional | `gemini` uses Gemini only and skips the DGX route (useful for demos) |
| `BHASHINI_API_KEY`, `BHASHINI_API_KEY_FALLBACK` | Optional | Indian-language speech-to-text, translation and voice |
| `DGX_URL`, `DGX_API_KEY`, `DGX_MODELS`, `DGX_QUERY_MODEL`, `DGX_TIMEOUT_MS`, `DGX_KEEP_WARM` | Optional | Self-hosted model route; `DGX_KEEP_WARM=false` turns off the keep-warm cron |
| `VERTEX_FALLBACK_ENABLED`, `VERTEX_SERVICE_ACCOUNT_JSON`, `VERTEX_LOCATION`, `VERTEX_MODEL` | Optional | Fallback to Vertex AI when Gemini hits its quota (see `rebuild/docs/setup.md`) |
| `LEGAL_VECTOR_ENABLED` | Optional | Turns on vector search over the legal corpus (keyword search always works) |
| `PAYMENTS_MODE=demo` | Optional | **Demo only.** Records a fake consultation fee. No money moves. |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` | Optional | Alternative voice output |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_GRAPH_VERSION` | Optional | WhatsApp Cloud API bot (see `docs/META_WHATSAPP.md`) |

### 4.4 Create the first admin

An admin can't sign up through the app. Sign in once with Clerk, copy your Clerk user ID (`user_…`), then run:

```bash
cd rebuild/packages/backend
bunx convex run accounts:bootstrapAdmin '{"clerkSubject":"user_xxx","displayName":"Admin","locale":"en"}'
```

## 5. Run the clients

Each client needs **only public values**: the Convex URL and the Clerk publishable key. Use **the same Clerk application and Convex deployment for every client**.

Run each client's setup commands in a new terminal from the repository root, unless a command changes directories.

### 5.1 Mobile app (Expo)

```bash
cd rebuild/apps/mobile
cp .env.example .env.local
```

`.env.local`:

```ini
EXPO_PUBLIC_CONVEX_URL=https://<name>.convex.cloud
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
# Optional, dev builds only:
# EXPO_PUBLIC_DEMO_LOGIN=1   # one-tap demo sign-in using a Clerk test account
# EXPO_PUBLIC_DEMO_MODE=1    # scripted demo booking and payment screens
```

Start it:

```bash
./node_modules/.bin/expo start --port 8081 --host lan --clear
```

- Scan the QR code with **Expo Go**. Your phone and computer must be on the **same Wi-Fi**, and the firewall must allow port **8081**.
- Use `--clear` after any `.env.local` change, because `EXPO_PUBLIC_*` values are baked into the bundle.
- If the phone can't reach your machine, for example on a different network or a strict firewall, use `--tunnel` instead of `--host lan`.
- **Expo Go limits:** if the runtime cannot generate secure random bytes, the app opens with phone sign-in available. Guest chat and automatic Clerk demo sign-in require secure randomness. Use a native development build to test those flows if your Expo Go build lacks it.
- `bun run typecheck` and `bun test` run in `rebuild/apps/mobile`. More notes are in `rebuild/apps/mobile/README.md` and `TESTING.md`.

### 5.2 Avatar website (`frontend/`)

```bash
cp frontend/.env.example frontend/.env.local
```

```ini
VITE_CONVEX_URL=https://<name>.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_ENABLE_TTS=true
```

```bash
npm run dev            # from the repo root; serves on 0.0.0.0:5173
# open http://localhost:5173/chat
```

The website imports the generated Convex API straight from `rebuild/packages/backend/convex/_generated/` (Vite alias `@convex-api`), so **install `rebuild/` first**.

### 5.3 Next.js portal (`rebuild/apps/web/`)

```bash
cp rebuild/apps/web/.env.local.example rebuild/apps/web/.env.local
```

```ini
NEXT_PUBLIC_CONVEX_URL=https://<name>.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...        # server-only, never prefix with NEXT_PUBLIC_
```

```bash
cd rebuild
bun run dev            # http://localhost:3000
```

Without credentials, the portal still shows its public pages along with a "services not configured" notice.

## 6. Data: lawyers and the legal corpus

A new deployment is empty. With no lawyers there is nothing to book, and with no legal corpus there are no citations.

### Demo lawyers (development deployments only)

`convex/demoSeed.ts` has internal operator functions. They can't be called from the app.

| Function | What it does |
| --- | --- |
| `demoSeed:importRoster` `{advocates:[…], slotDays}` | Adds approved demo lawyers with slots at 11:00 and 16:00 IST. Their accounts can't sign in. |
| `demoSeed:extendSlots` `{days: 1–14}` | Adds future slots so the demo lawyers stay bookable |
| `demoSeed:resetUser` `{accountId}` | Wipes one test user's bookings and conversations, for demo retakes. **Can't be undone.** |
| `demoSeed:removeRoster` `{}` | Removes all demo lawyers |

The full roster and corpus exports live under the ignored `backend/data/` directory. Ask the team for a copy or regenerate them with the tools in `backend/scripts/`. To try booking with a fictional lawyer, run this on your own development deployment.

```bash
cd rebuild/packages/backend
bunx convex run demoSeed:importRoster '{"slotDays":7,"advocates":[{"key":"sample-jammu","displayName":"Demo Advocate","city":"Jammu","bio":"Fictional profile for booking tests","barRegistration":"DEMO-ONLY","yearsExperience":5,"domains":["civil"],"locales":["en","hi","doi"],"consultationModes":["video"]}]}'
bunx convex run demoSeed:extendSlots '{"days":7}'
```

### Legal corpus (laws and judgments used for answers)

```bash
cd rebuild
node scripts/import-legal-corpus.mjs ../backend/data/convex-export \
  --deployment-name your-development-deployment
```

- After checking the dry run, add `--apply` to publish the corpus for keyword search. To add vectors later, rerun with `--apply --skip-import --embed`. The embedding step uses your Gemini quota and can resume after a quota reset.
- More detail: `docs/BACKEND_RAG.md`, `docs/VECTOR_RETRIEVAL.md`, `docs/legal-rag.md`.

## 7. Everyday commands

From `rebuild/`:

| Command | What it does |
| --- | --- |
| `bun run backend:dev` | Watches and pushes Convex functions (same as `bun run dev` in `packages/backend`) |
| `bun run backend:codegen:local` | Regenerates `convex/_generated` **offline** (no deployment needed) |
| `bun run typecheck` | Codegen, then type-checks every package |
| `bun run test` | All workspace tests (backend uses `vitest` + `convex-test`; mobile and web use `bun test`) |
| `bun run build` | Production builds |
| `bun run check` | typecheck, test and build together |
| `bun run doctor` | Checks the environment. It expects the optional `vendor/fleet` reference (see `rebuild/docs/fleet-reference.md`). |

Backend tests only: `cd rebuild/packages/backend && bunx vitest run` (one file: `bunx vitest run tests/voice-booking.test.ts`).
Avatar website: `npm test --prefix frontend` and `npm run build --prefix frontend`.

## 8. Working on the Convex backend

- **Read `rebuild/packages/backend/convex/_generated/ai/guidelines.md` first.** It has the project's Convex rules: object-form functions, validators on every argument, indexes instead of filters, and so on.
- Further reading: `rebuild/packages/backend/ARCHITECTURE.md` (design), `API.md` (every public and internal function), `VALIDATION.md` (input limits).
- Functions that clients may call are `query`, `mutation` or `action`. Operator-only ones are `internal*`, run with `bunx convex run`.
- Authorization is enforced on the server from the Clerk identity and the `accounts` role (`user`, `advocate` or `admin`). Never trust a role sent by the client.
- Add or update a test in `rebuild/packages/backend/tests/` for every backend change.

## 9. Deployment

| Piece | Where | How |
| --- | --- | --- |
| Backend | Convex | `bunx convex deploy` from `rebuild/packages/backend`. Set the production env vars in the prod deployment first. |
| Next.js portal | Vercel | `rebuild/apps/web/vercel.json`; see `rebuild/docs/deployment-20261027.md` |
| Avatar website | Cloudflare Pages | `npm run deploy:cloudflare --prefix frontend` |
| Mobile | EAS / native build | Not set up yet. Expo Go is for development only. |

## 10. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Convex push fails with an auth config error | `CLERK_JWT_ISSUER_DOMAIN` isn't set in the deployment |
| Signed in, but the app spins forever | The Clerk `convex` JWT template is missing, or the issuer domain doesn't match the Clerk instance |
| AI replies show "unavailable" | `GEMINI_API_KEY` isn't set, the quota ran out, or the language isn't listed in `AI_CHAT_LOCALES` / `AI_VOICE_LOCALES` |
| "No lawyer is available right now" | No approved lawyers with future slots. Seed the roster or run `demoSeed:extendSlots`. |
| Expo Go: `Cannot find native module 'X'` | Check that Expo Go matches SDK 58. Use a development build for modules your Expo Go version lacks. |
| Phone can't open the QR link | Different Wi-Fi, or port 8081 is blocked. Try `--tunnel`. |
| `EXPO_PUBLIC_*` change has no effect | Restart Expo with `--clear` |
| `expo-doctor` reports "duplicate native modules" | Inspect the reported versions and resolve the duplicate dependencies before building natively. |

## 11. Secrets checklist

- Never commit `.env`, `.env.local` or any key. All of them are git-ignored.
- Clients get **only** the Convex URL and the Clerk publishable key.
- Everything else (Gemini, Bhashini, DGX, Vertex, WhatsApp, Clerk secret) is stored in **Convex env** or on the **Next.js server**.
- AI output is preliminary legal information, not legal advice, and the product says so to users.
