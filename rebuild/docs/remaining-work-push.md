# Remaining workspace publication

Requested result: preserve all pending local source, branding and document changes
in GitHub, integrate them with current main, and leave the source checkout clean.

| Result | Scope | State | Evidence |
|---|---|---|---|
| Preserve pending work | Original design checkout | In progress | 493 pending paths including individual output files; about 53 MB of present files |
| Check rebuild | rebuild/ | Proved | npm exec --package=bun@1.4.3 -- bun run check; five package type checks, tests and Next.js production compilation passed |
| Check upload contents | Source and document text | Proved | Credential-pattern scan of 440 present files, including XML in 49 Office packages; no matches; no file above 100 MB |
| Preserve current website | frontend/ and backend/ | In progress | Integrate latest main without replacing approved chat/voice/RAG behavior |
| Publish and verify | GitHub main | In progress | User explicitly authorized pushing all remaining changes |

This is publication of existing documents, not a new legal/medical review or a
regeneration of their content. Builds and tests do not prove hosted identity,
production inference, real speech accuracy or legal correctness. Existing local
API credentials and runtime data remain excluded by ignore rules.
