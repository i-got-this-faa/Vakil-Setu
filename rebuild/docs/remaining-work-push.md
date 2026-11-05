# Remaining workspace publication

Requested result: preserve all pending local source, branding and document changes
in GitHub, integrate them with current main, and leave the source checkout clean.

| Result | Scope | State | Evidence |
|---|---|---|---|
| Preserve pending work | Original design checkout | Proved | 493 pending paths including individual output files; about 53 MB of present files |
| Check rebuild | rebuild/ | Proved | npm exec --package=bun@1.4.3 -- bun run check; five package type checks, tests and Next.js production compilation passed |
| Check upload contents | Source and document text | Proved | Credential-pattern scan of 440 present files, including XML in 49 Office packages; no matches; no file above 100 MB |
| Preserve current website | frontend/ and backend/ | Proved | Merged current main, preserving chat/voice/RAG behavior; 63 tests and Vite production build passed |
| Publish and verify | GitHub main | In progress | User explicitly authorized pushing all remaining changes |

This is publication of existing documents, not a new legal/medical review or a
regeneration of their content. Builds and tests do not prove hosted identity,
production inference, real speech accuracy or legal correctness. Existing local
API credentials and runtime data remain excluded by ignore rules.


Integration notes:

- Snapshot commit e677ea0 preserves all original pending content before integration.
- Main base: 05938a3. Conflicts in README, HomePage and VoiceRecorder retain the
  approved current app. Both versions remain available in merge history.
- Package display names and lockfiles use legal-setu while retaining all current
  backend dependencies. Old and new CSS names coexist for styling compatibility.
- Chat/session storage keys use legal-setu and migrate existing vakil-setu data;
  the new migration regression test passes.
- Document/image extensions are marked binary in .gitattributes to preserve bytes
  and prevent misleading line counts for PDFs.
- Hosted auth, real speech accuracy and external production services were not
  revalidated during this publication task. No credentials were staged.
