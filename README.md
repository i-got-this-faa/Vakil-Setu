# Legal-Setu

The avatar website in `frontend/` and the mobile MVP in `rebuild/apps/mobile/` now target the shared **Convex backend with Clerk identity** in `rebuild/packages/backend/`. The avatar messenger layout and browser voice controls are preserved.

See [Convex migration and setup](docs/CONVEX_AVATAR_MIGRATION.md) for service configuration, source import, consent and remaining live acceptance checks.

## Run the avatar website

```bash
npm install --prefix frontend
# Configure the public values in frontend/.env.local using frontend/.env.example.
npm run dev
```

Open http://localhost:5173/chat. MongoDB/Express are not required. With no service configuration, the public avatar renders and account operations remain explicitly unavailable.

Use the same Clerk application and Convex deployment for both clients. The avatar uses `VITE_CLERK_PUBLISHABLE_KEY`/`VITE_CONVEX_URL`; mobile uses their `EXPO_PUBLIC_*` equivalents. Provider secrets belong only in Convex environment settings. Never commit keys or place them in public frontend variables.

## Shared backend

Existing authorized Convex functions own accounts, cases, chat, reviewed summaries, approved advocates, real slots, booking acceptance/cancellation/expiry and notifications. The avatar website consumes those contracts. Chat replies can carry legal evidence and citations, rendered by web and mobile. RAG ingestion requires a reviewed operator import; the local legal index is not automatically available to hosted functions.

Keyword retrieval uses Convex search. Optional native vector retrieval requires re-embedding into the supported 768-dimensional Gemini profile. Existing local E5 vectors are preserved as historical artifacts, not silently reused. See the migration document for import commands and limitations.

```bash
npm test --prefix frontend
npm run build --prefix frontend
cd rebuild
bun run backend:codegen:local
bun run typecheck
bun run test
```

## Repository boundaries

- `frontend/`: active avatar Vite website.
- `rebuild/packages/backend/`: shared Convex backend and authorization rules.
- `rebuild/apps/mobile/`: Expo client MVP; device acceptance remains separate.
- `rebuild/apps/web/`: additional Next.js client; its UI does not replace the avatar website.
- `backend/`: preserved Express/Mongo prototype, public legal ingestion/export tooling and independent messaging demonstration. The active avatar website does not call it.
- `docs/CONVEX_AVATAR_MIGRATION.md`: current architecture and setup.

The old `npm run dev:legacy` command retains the historical Express/Mongo server startup for reference, but the frontend now uses Convex and does not offer a second Mongo backend mode. Payments, guaranteed emergency connections, ElevenLabs and legal-currentness certification are not part of this migration.
