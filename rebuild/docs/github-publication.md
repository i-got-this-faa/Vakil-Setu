# GitHub publication — 16 October 2026

Repository: https://github.com/sid4761/Vakil-Setu (private, default branch `main`). The owner explicitly authorized creation and push. GitHub confirmed the existing Git Credential Manager identity as `sid4761`; no token was printed or committed.

The new repository contains the committed `rebuild/` subtree at its root, retaining the rebuild's scoped source history. Legacy application files and unrelated user documents remain in the original checkout. Environment files, dependencies, build output, task tooling and the Fleet reference checkout are excluded. Environment templates and bundled speech artifacts/notices are included.

The first published code baseline is original commit `82c2d52`, exported as `04c1f148f8ab3adf7ffef2e0b1235ff357ec405d`. `git ls-remote` confirmed that exact hash on remote `main`, and the authenticated GitHub API confirmed the repository is private and non-empty.

A clean standalone worktree installed with the frozen lockfile and passed native typechecks across all five packages, all 78 registered tests and the production build without service keys. The six new React-render regressions use substituted auth/data/audio boundaries; the remaining hosted, microphone and DGX limits are in `verification.md` and `hosted-activation.md`.

For future updates from the original checkout, commit only the rebuild files, then export and push the subtree:

```sh
git subtree split --prefix=rebuild --branch publish/rebuild
git push https://github.com/sid4761/Vakil-Setu.git publish/rebuild:main
```

Verify the remote head against the exported branch after every push. Do not push the original checkout's `master` directly to this repository: it includes the legacy parent project. In a standalone clone, use normal commits and pushes on `main`.

## Visibility and materials update — 18 October 2026

GitHub now reports this repository as public (`isPrivate: false`); the private status above records its creation state on 16 October. This audit did not change repository visibility. Project documents, presentations, authoring sources and legacy code are now catalogued in `materials/README.md` and `docs/materials-audit.md`. The remote materials baseline `973ff092922e73f8edbe61710e3ad0c5fdf6353a` was verified against the local export.
