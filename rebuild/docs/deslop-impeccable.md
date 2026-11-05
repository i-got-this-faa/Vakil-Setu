# Impeccable design pass

Branch: `design/deslop-impeccable`, based on local `master` at `132fcd8`.
Git authorization: create a branch and edit the website. Changes remain uncommitted; no push or deployment was requested. Existing unrelated files were preserved.

## Guidance and decisions

Used https://impeccable.style/ and the upstream Impeccable skill at revision `dad8dbb3aac21ad1fa236c110315ef4abece23e8`, cloned outside the repository. Read the skill, distill, craft-floor, and polish playbooks. The context launcher failed to download engine 0.1.16, so this pass used the documented manual path. No automated detector result is claimed.

The primary problem was the mismatch between useful legal intake and generic reassuring decoration. Removed the oversized arch/scales illustration, italic display accent, ornamental heading labels, repeated CTA panel, and equal-sized workflow cards. The homepage now uses the existing translated concern heading, preparation copy, a semantic ordered workflow, and sharing facts. No product capabilities were added.

Shared typography uses self-hosted Public Sans with the original SIL OFL notice. The unmodified font is 103,316 bytes; SHA-256 `d75a7dc1a27eb9e336d5b33f55489d2ecb5621bf694d5c43b2415bce2ca830a8`. Source: https://github.com/google/fonts/tree/main/ofl/publicsans. Existing script fonts remain available.

The header separates the language-quality notice from navigation. The notice expands using a native details control and remains the selector's accessible description. English-only content is explicitly annotated. No translation coverage or language quality claim was added. Urdu continues to show the existing explicit English fallback.

The guide's obsolete claim that reviews are absent was removed after checking the implemented public feedback components. Payment and emergency limitations remain. The overview places advocate/admin tasks first for the corresponding account. Clerk's generic application heading now names Vakil Setu; authentication behavior is unchanged.

## Surface ledger

- Entry points — applies: homepage, guide, discovery, authentication, workspace overview, and operational headings. Shared layout/styles supply the visual changes; route destinations remain present.
- Clients — applies: responsive web. Legacy Vite app and deferred native mobile do not apply to this active workspace change.
- Providers — presentation only: Clerk headings/font/accent. Convex, AI, speech, payment, and storage behavior do not apply; no provider or backend contracts were changed.
- Reverse states — applies: focus/hover, translated and unavailable-language states, collapsed/expanded translation notice. Existing loading, empty, error, disabled, cancellation, and permission states retain their behavior.
- Connection modes — public pages and signed-out routing apply. Authenticated live persistence and offline workflows were not exercised.
- Tests and documents — existing checks plus browser inspection; design conventions recorded in `DESIGN.md`.

## Verification

- `bun run typecheck` — passed across all five packages; the web check executed and unchanged dependency checks used Turbo cache.
- `bun run test` — passed. The 18 web tests executed after the final source changes; unchanged i18n (30 tests) and backend (204 passed, one skipped) results were replayed from Turbo cache.
- `bun run build` — passed after the final source changes, with an uncached Next.js production build.
- `git diff --check` — passed. Final source review found no actionable introduced regressions.
- Live browser — inspected the homepage at 320, 375, 768, and 1280 CSS pixels; checked discovery, guide, and authentication surfaces at narrow widths. No horizontal document overflow in the measured views.
- Language selector — Hindi and Punjabi changed the headline and retained correct document language tags. Urdu retained its explicit English fallback and saved the selected `ur` preference. Restored English before handoff. These observations do not establish translation quality.
- Translation notice — expanded/collapsed correctly; the selector's `aria-describedby` resolves to the notice paragraph. English content blocks retain their own language/direction attributes.
- Keyboard — Tab focused the primary intake link with a visible solid 3px teal outline.
- Contrast — primary button text/background 5.96:1; hero and preparation body text/background 6.05:1, measured from browser-computed colors. Shared header controls measured at least 44px high; the primary intake link measured 47px.
- Routing — clicking the homepage intake link reached Clerk sign-in with `/workspace/intake` preserved in the return destination. Sign-in and sign-up rendered the Vakil Setu headings. No login or account creation was performed.
- Assets — Public Sans loaded successfully from the local font route. No external runtime font service was added.

Local command evidence is in the ignored `.runtime/deslop-typecheck.log`, `.runtime/deslop-tests-final.log`, and `.runtime/deslop-build-final.log`. A desktop screenshot was captured through the collaborative browser. Browser inspection was of the development process; the production build was checked separately.

Completed: source edits, design documentation, static checks, existing tests, production build, public browser inspection, and final read-only review. Worktree has scoped edits plus the new design record and font/license files. Existing unrelated untracked parent-checkout files remain untouched. No commit, push, or deployment was performed.

## Limits

Authenticated intake saving, AI, microphone/audio, booking, credential review, and real account-role workflows were not exercised. Existing component/backend tests do not prove hosted behavior. Human language review remains pending. The pass does not claim every existing page is fully translated.
