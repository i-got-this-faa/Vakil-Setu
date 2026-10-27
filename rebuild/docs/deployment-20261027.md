# Hosted pilot — 27 October 2026

Web: https://vakil-setu-three.vercel.app

Vercel project: `sid4761s-projects/vakil-setu`, ID `prj_uTPdGRESae9fwElszwaOnF0vtP8r`.
Production deployment: `dpl_EMFba44c36jJnxRhiVwuivMikFCq`, observed `READY`.
Convex production: `https://accomplished-ibex-252.convex.cloud`, in the existing `siddharth-gupta-b0fea/vakil-setu` project. Development remains on `chatty-sandpiper-446`; its data was not copied to production.

## Configuration and redeployment

Run Vercel CLI from the workspace root (`rebuild/` in this parent checkout). Its project Root Directory is `apps/web`. The app's `vercel.json` installs and builds from the Bun workspace root, preserving all shared packages. Node is 24.x; Vercel selected Bun 1.4.4 and installed the frozen lockfile successfully.

Vercel production has `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, server-only sensitive `CLERK_SECRET_KEY`, and local sign-in/sign-up URL variables. Secrets were transferred through subprocess stdin and were not logged or committed. `.vercelignore` excludes environment files, local tooling, runtime files, references, archive and project materials. It preserves application/shared source and public fonts.

Convex production has the existing Clerk issuer, Gemini key/model and configured Vertex fallback variables. These were transferred from the existing development deployment without exposing their values. AI remains restricted to English, Hindi and Punjabi. Vertex dispatch still requires explicit user consent and an initial Gemini HTTP 429. No billing plan was changed.

Deploy the backend before publishing a frontend that depends on it:

```powershell
# From the workspace root, with Bun and Node on PATH:
bun run check
Push-Location packages/backend
node node_modules/convex/bin/main.js deploy --yes --typecheck disable
Pop-Location
bun x vercel@65.4.0 deploy --prod --yes --archive=tgz
```

Typechecking is run separately through the workspace's native TypeScript compiler. Convex CLI and Vercel CLI require authenticated accounts. Local `.vercel/project.json` links this workspace to the existing project; reuse it rather than creating a second project.

The Vercel Hobby plan rejected automatic linking of the private organization-owned GitHub repository with HTTP 409. CLI deployment succeeded. Git pushes do not currently deploy this site automatically. A future Git import must use repository Root Directory `rebuild/apps/web`, rather than the CLI upload root's `apps/web`.

## Identity and release limits

Clerk still uses the existing **development** instance and visibly labels sign-in Development mode. This is a hosted pilot, not a claim of production identity readiness. Moving to a production Clerk instance requires its keys, matching Convex JWT issuer/audience, and provider/domain configuration. Production Convex starts empty; existing development cases remain in development. No administrator was bootstrapped and no advocate was automatically approved.

The bundled eSpeak artifacts retain an unresolved source/build provenance note. The public CLI upload excludes the engine JS/data. Vercel builds use local device voices for read-aloud where a matching installed voice exists; typed input remains available. Local builds retain their existing bundled engine. `/api/health` reports this difference. Re-enabling public engine distribution requires resolving `apps/web/public/speech/espeak-ng/NOTICE.md` and updating both upload and build configuration.

## Evidence and surface ledger

- Dependencies: frozen installation checked 149 installs across 277 packages without changing the lockfile.
- Static/component/build: workspace typechecks passed; 272 backend, 30 locale and 24 web tests passed; one optional live test skipped. Local production build and Vercel's Linux production build passed.
- Backend/runtime: production schema/functions and 31 indexes deployed. Anonymous `accounts.me` returned null; a valid-shaped anonymous `cases.create` returned `UNAUTHENTICATED` and wrote no case. Public AI capabilities report Gemini and consented Vertex fallback configured.
- Provider/integration: a separate synthetic connectivity request through the actual AI adapter, using production Convex configuration, received Gemini HTTP 200 and nonempty text in 4.5 seconds. This does not prove legal quality, future quota, the hosted action path, or Vertex fallback execution.
- Web/runtime: public home, discovery, sign-in and health returned HTTP 200. Health reports configured Clerk/Convex and device-voice playback. Excluded engine data returns 404. Browser home rendered without console errors; Start with your concern redirected to the local Clerk sign-in form with the return URL preserved. A bare non-browser request without Clerk development-browser state returns 404 with `protect-rewrite, dev-browser-missing`; browser navigation reaches sign-in.
- Identity/integration: Google sign-in completed in the hosted browser and returned to `/workspace/intake`. The authenticated page displayed the signed-in user and the Convex-backed account onboarding form without console errors. The permanent account-role selection was left untouched; no production application account was created by this check.
- Pending acceptance: onboarding submission, persisted case writes/uploads/chat, admin/advocate workflows and booking lifecycle. A build and configuration response do not establish these flows.
- Not applicable: legacy Express/MongoDB deployment, deferred payments and native mobile. They are not dependencies of this rebuild and were preserved.

Deployment was performed through the Vercel CLI. Publishing these source changes to GitHub does not trigger an automatic deployment under the current project configuration.
