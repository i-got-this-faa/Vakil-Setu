# Repository materials audit — 18 October 2026

The GitHub `main` tree at `3c777d7c6b0f190b9a4d605b1e1da2b0708691c0` matched the local rebuild export. It contained the current application and engineering documentation, but none of the separate project presentation/report collection or legacy frontend/backend source.

## Completed inventory

| Result | Source | Destination | Verification | State |
|---|---|---|---|---|
| Current application retained | Committed `rebuild/` | Root `apps/`, `packages/`, `scripts/` | Compared fetched GitHub tree with existing subtree export | Proved |
| Documents and presentation collection | Root project deliverables, `output/`, selected `.codex-*` authoring inputs | `materials/` | 61 files copied with size/SHA-256 records; original bytes retained | Proved |
| Original legacy source | 62 tracked `frontend/` and `backend/` files plus parent README/manifests | `archive/legacy/` | 65 files copied with size/SHA-256 records | Proved |
| Navigation and historical caveats | Existing source and current requirements | Root README, materials catalogue, legacy archive notice | Relative-link and manifest checks | Proved |

The inventory contains 126 preserved files totalling 5,717,013 bytes, excluding the new catalogue, inventory and audit text. There are 11 PowerPoint decks, 9 Word documents, 3 PDFs, 1 architecture image, speaker scripts and authoring sources. Office ZIP integrity and document-text/slide presence were checked. PDFs passed header/trailer checks. A bounded credential-pattern scan of text and Office XML found no candidates; this is not a guarantee against every possible confidential value. Actual environment files were never read or included.

## Scope and exclusions

The audit covers this checkout's project root, exported `output/` artifacts, document/deck authoring inputs and tracked legacy application files. It does not claim to discover files on other disks, in other accounts or in cloud drives. Source originals and unrelated local files are preserved.

Dependencies, build caches, render previews, duplicated candidate exports, one-byte invalid preview PDFs, temporary Word lock files, scratch tests and unrelated `tokenopt` reference-paper files were excluded. No production data or actual `.env` files were added. Historical reports may assert old stack choices, payments, emergencies, model behavior or unmeasured performance; the catalogue points readers to the current decisions and verification evidence instead.

## Validation boundary

This update changes documentation and adds archival source/artifacts. No current application runtime code or dependency manifest changed. Application tests and a production rebuild were not repeated for this archival update. Existing binary artifacts were copied unchanged and checked for structural integrity; no new layout, speech, provider, hosted booking or document-rendering acceptance is claimed. Archived source was not executed.

Publication uses the authorized `rebuild/` subtree export to `sid4761/Vakil-Setu:main`. Verify the final remote commit against `publish/rebuild` after pushing; do not publish the original parent branch directly.
