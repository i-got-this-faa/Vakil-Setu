# Legal-Setu rename — 28 October 2026

The official display name is **Legal-Setu**, including translated interfaces. Local workspace packages use `@legal-setu/*`; npm package names and artifact filenames use the corresponding lowercase or underscore form. Current applications, archived application source, documents, generators, presentation scripts and saved deliverables are included.

## Surface and completion record

| Surface | Applicability and result | Verification |
|---|---|---|
| Entry points and clients | Applies: legacy Vite frontend and current Next.js app; title, navigation, chat, onboarding, Clerk headings, payment display name and translated brand mentions updated | Both production builds pass; local browser checks verify both homepages and the current how-it-works page |
| Local package contracts | Applies: manifests, Bun/npm locks, imports, Next.js transpilation and workspace command filters use the new names | Frozen offline Bun install and all five package type checks pass |
| Provider display labels | Applies: local Clerk sign-in/sign-up customization and legacy Razorpay checkout label updated | Type checks/builds pass; hosted authentication and payment were not exercised |
| Stored state and clearing | Applies: new locale/chat/session storage keys; old keys remain readable; chat clear removes both generations | Locale regression test; chat restore/save/clear assertions; browser restores an old Punjabi preference and persists the new key |
| Generated translation contracts | Applies: renamed English strings and matching hash keys updated across inventory, source map, bundle and checkpoint | Hash/lookup consistency verified; operational source scan passes |
| Documents and exported materials | Applies: visible branding, filenames and embedded figures; 134 saved previews regenerated; material links and inventory updated | 48 Office ZIP/XML packages, 11 PDFs, 126 inventory hashes and 17 renamed material links checked; native Office render comparison covers 296 pages/slides without page-count changes |
| Hosted resources and filesystem identity | No migration applied: existing repository URLs, Vercel domain/project, Convex project, MongoDB addresses and the actual checkout directory still identify existing resources | References retained rather than replaced with nonexistent addresses |
| Backend case records | Does not apply: branding requires no case-data or schema migration | No deployment or data mutation performed |

## Checks and limits

- `bun run check` passes: five package type checks, 327 tests (272 backend, 30 i18n, 25 web), and the Next.js production build. One live-AI test is skipped.
- Legacy `npm run build` passes. Local browser checks confirm the Legal-Setu title/header and AI greeting.
- Current app browser checks confirm Legal-Setu title/header, the how-it-works heading, and restoration of `vakil-setu.locale=pa-IN` into `legal-setu.locale=pa` with `lang=pa-Guru-IN`.
- Configured local Clerk routing timed out. Current-app browser verification used explicit unconfigured service settings and does not establish hosted sign-in behavior.
- `node scripts/operational-i18n.mjs --check` passes. `node scripts/generate-operational-drafts.mjs --check` remains blocked by the pre-existing missing Assamese operational bundle (`shape:missing-bundle:as`); no new translations were generated.
- Saved reports/decks were rendered using installed Word and PowerPoint. The skill's `render_docx.py` cannot run here because LibreOffice `soffice.exe` is absent; native Office PDF exports and rasterized changed pages were used for visual review. PDF name replacements use complete fonts to avoid missing-glyph boxes; synopsis PDFs also contain the renamed architecture figure.
- Remaining old-name strings are compatibility keys, original inventory provenance, real paths/resource addresses, and references to the unrelated company Vakilsearch or the word “Vakils”.

Work began on branch `design/deslop-impeccable` at `4a3a9e1`. Changes remain local and uncommitted. No push, deployment, remote project/domain rename, or checkout-directory move was performed.
