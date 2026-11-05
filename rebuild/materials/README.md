# Project materials

This collection contains the project documents, presentation variants and authoring sources collected on 18 October 2026. Their branding and filenames were updated to Legal-Setu on 28 October 2026. Names such as `Final` are inherited names, not a declaration that the contents match today's implementation.

For current behavior and setup, use the repository [README](../README.md), [requirements](../docs/requirements.md), [decisions](../docs/decisions.md), [setup](../docs/setup.md) and [verification evidence](../docs/verification.md). These take precedence over archived reports and slides.

## Start here

| Purpose | Material |
|---|---|
| Original from-scratch requirements supplied for the rebuild | [SRS Word](documents/Legal_Setu_SRS_From_Scratch.docx), [PDF export](documents/Legal_Setu_SRS_From_Scratch.pdf) |
| Project presentation | [Project deck](presentations/Legal_Setu_PROJECT_Deck.pptx), [speaker script](documents/Legal_Setu_Presentation_Script.docx), [two-person script](presentations/Legal_Setu_Two_Person_Script.md) |
| Faculty presentation variant | [Faculty final](presentations/Legal_Setu_Faculty_Final.pptx) |
| Short presentation variant | [Compact final](presentations/Legal_Setu_Compact_Final.pptx) |
| Project synopsis | [Word](documents/Legal_Setu_Synopsis.docx), [PDF](documents/Legal_Setu_Synopsis.pdf) |
| Pitch reports | [Pitch report](documents/Legal_Setu_Pitch_Report.docx), [director pitch](documents/Legal_Setu_Director_Pitch.docx), [original pitch](documents/Legal-Setu%20pitch.docx) |
| Historical handoff and study guide | [Word](documents/Legal_Setu_Project_Handoff_and_Study_Guide.docx) |
| Historical SRS variants | [SRS Word](documents/Legal_Setu_SRS.docx), [SRS PDF](documents/Legal_Setu_SRS.pdf), [SRS report](documents/Legal_Setu_SRS_Report.docx) |
| Historical architecture illustration | [PNG](diagrams/legal_setu_architecture.png) |

## Structure

```text
materials/
  documents/       Original Word and PDF deliverables
  presentations/   PowerPoint variants and text speaker scripts
  diagrams/        Historical architecture image
  sources/
    root/          Original Markdown, HTML, Typst and Python generators
    codex-deck/    Deck authoring scripts and content
    codex-report/  Pitch report authoring scripts
    codex-srs/     From-scratch SRS generator
  inventory.json   Original paths, repository paths, sizes and SHA-256 hashes
archive/legacy/    Earlier frontend/backend source; outside Bun workspaces
docs/              Current requirements, setup, audits and validation evidence
```

All presentation variants are retained because filenames alone cannot establish which was approved. [The inventory](inventory.json) records current paths, sizes and hashes, together with the original baseline information for files changed during the rename. Source paths are relative to the parent checkout; destination paths are relative to this repository root. See [the rename verification](../docs/branding-rename.md) for checks and limits. The historical factual claims have not been revalidated.

## Historical claims and reuse

Some reports, diagrams and decks describe Vite/Express/MongoDB, payments, emergency connections, Gemini inference, bilingual voice support, or latency/cost targets. Those statements are historical designs or unverified claims. The current application uses Next.js, hosted Convex and Clerk, with English/Hindi/Punjabi as the pilot. Payments, reviews, guaranteed emergency connections and native mobile implementation are deferred. DGX inference has no supplied endpoint and remains unavailable. Browser speech capability and local playback evidence are documented separately in `docs/verification.md`; they do not prove pronunciation quality or universal speech recognition.

The old pitch includes “zero legal hallucinations” and OCR claims; this audit found no implementation evidence establishing them. Do not repeat those claims as verified behavior.

The authoring scripts are preserved as historical source, not installed application tooling. Some reference the original folder layout, local fonts, Windows tools, excluded reference images or agent-provided packages. They require path/dependency review before reuse; no reproducible document-build environment is claimed. The architecture illustration describes the older stack. Student names and roll identifiers remain in the original documents. GitHub reported this repository as public during the 18 October publication check; this update did not change visibility. Inclusion preserves the supplied artifacts and does not certify asset redistribution rights.

## Excluded local files

Credentials and real environment files, dependencies, caches, browser profiles, render previews, duplicate candidate exports, Word lock files (`~$*`), scratch `test*` files, and `tokenopt*` reference-paper extracts are excluded. The one-byte script-preview PDFs are invalid intermediate files and are excluded. Rendered slide/page PNGs and inspection dumps remain local; finished exports and authoring inputs are included. The Fleet checkout remains an external development reference with [restore instructions](../docs/fleet-reference.md).
