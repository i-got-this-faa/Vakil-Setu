# Project materials

This collection preserves the project documents, presentation variants and authoring sources found in the local Vakil Setu workspace on 18 October 2026. Original files were copied without modification; names such as `Final` are original names, not a declaration that the contents match today's implementation.

For current behavior and setup, use the repository [README](../README.md), [requirements](../docs/requirements.md), [decisions](../docs/decisions.md), [setup](../docs/setup.md) and [verification evidence](../docs/verification.md). These take precedence over archived reports and slides.

## Start here

| Purpose | Material |
|---|---|
| Original from-scratch requirements supplied for the rebuild | [SRS Word](documents/Vakil_Setu_SRS_From_Scratch.docx), [PDF export](documents/Vakil_Setu_SRS_From_Scratch.pdf) |
| Project presentation | [Project deck](presentations/Vakil_Setu_PROJECT_Deck.pptx), [speaker script](documents/Vakil_Setu_Presentation_Script.docx), [two-person script](presentations/Vakil_Setu_Two_Person_Script.md) |
| Faculty presentation variant | [Faculty final](presentations/Vakil_Setu_Faculty_Final.pptx) |
| Short presentation variant | [Compact final](presentations/Vakil_Setu_Compact_Final.pptx) |
| Project synopsis | [Word](documents/Vakil_Setu_Synopsis.docx), [PDF](documents/Vakil_Setu_Synopsis.pdf) |
| Pitch reports | [Pitch report](documents/Vakil_Setu_Pitch_Report.docx), [director pitch](documents/Vakil_Setu_Director_Pitch.docx), [original pitch](documents/Vakil-setu%20pitch.docx) |
| Historical handoff and study guide | [Word](documents/Vakil_Setu_Project_Handoff_and_Study_Guide.docx) |
| Historical SRS variants | [SRS Word](documents/Vakil_Setu_SRS.docx), [SRS PDF](documents/Vakil_Setu_SRS.pdf), [SRS report](documents/Vakil_Setu_SRS_Report.docx) |
| Historical architecture illustration | [PNG](diagrams/vakil_setu_architecture.png) |

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

All presentation variants are retained because filenames alone cannot establish which was approved. [The inventory](inventory.json) maps each file back to its original local path and records hashes for byte-for-byte preservation. Source paths are relative to the original parent checkout; destination paths are relative to this repository root. Office packages were checked for ZIP integrity and text/slide content, and PDF headers/trailers were checked. Their page layouts and factual claims were not revalidated for this archival task.

## Historical claims and reuse

Some reports, diagrams and decks describe Vite/Express/MongoDB, payments, emergency connections, Gemini inference, bilingual voice support, or latency/cost targets. Those statements are historical designs or unverified claims. The current application uses Next.js, hosted Convex and Clerk, with English/Hindi/Punjabi as the pilot. Payments, reviews, guaranteed emergency connections and native mobile implementation are deferred. DGX inference has no supplied endpoint and remains unavailable. Browser speech capability and local playback evidence are documented separately in `docs/verification.md`; they do not prove pronunciation quality or universal speech recognition.

The old pitch includes “zero legal hallucinations” and OCR claims; this audit found no implementation evidence establishing them. Do not repeat those claims as verified behavior.

The authoring scripts are preserved as historical source, not installed application tooling. Some reference the original folder layout, local fonts, Windows tools, excluded reference images or agent-provided packages. They require path/dependency review before reuse; no reproducible document-build environment is claimed. The architecture illustration describes the older stack. Student names and roll identifiers remain in the original documents. GitHub reported this repository as public during the 18 October publication check; this update did not change visibility. Inclusion preserves the supplied artifacts and does not certify asset redistribution rights.

## Excluded local files

Credentials and real environment files, dependencies, caches, browser profiles, render previews, duplicate candidate exports, Word lock files (`~$*`), scratch `test*` files, and `tokenopt*` reference-paper extracts are excluded. The one-byte script-preview PDFs are invalid intermediate files and are excluded. Rendered slide/page PNGs and inspection dumps remain local; finished exports and authoring inputs are included. The Fleet checkout remains an external development reference with [restore instructions](../docs/fleet-reference.md).
