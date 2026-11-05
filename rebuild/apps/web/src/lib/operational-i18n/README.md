# Operational interface draft labels

This directory is independent of core copy and domain/schema localization. All
non-English labels are machine drafts. Human language, legal terminology and
contextual review are unverified. Key and Unicode script checks do not establish
translation quality or legal accuracy. Labels adjoining dynamic values may need
whole-sentence restructuring during human review.

`source.json` maps exact normalized English to stable SHA-256-derived keys.
`inventory.json` records source occurrences and the scan scope/exclusions.
`bundles/en.json` is the English reference. `metadata.json` lists only complete
locale bundles. The generated `bundles/index.ts` exports only those bundles;
partial successes are checkpoints, never usable locale bundles.

`translateOperational(locale, english)` returns `{ text, lang, dir, known }`.
It accepts stored short codes and language tags. Unknown English, unavailable
bundles and unrecognized locales preserve the original string with `lang: en-IN`
and `dir: ltr`. Explicitly retained Latin proper names/units also retain English
annotation. Use this helper only for static interface copy, never case data,
names, credentials, summaries or other user content.

Run from `rebuild`:

```powershell
node scripts/operational-i18n.mjs --extract
node scripts/generate-operational-drafts.mjs
node scripts/generate-operational-drafts.mjs --check
node --test apps/web/test/operational-i18n.verification.mjs
node scripts/operational-i18n.mjs --check
```

Generation uses `gemini-3.6-flash` with `MINIMAL` thinking. It privately reads
`GEMINI_API_KEY` or the ignored `.runtime/gemini-api-key`. No provider bodies or
credentials are logged. Requests have a 120-second timeout, four bounded attempts
and checkpointed successes. Default concurrency is one to share provider quota;
`OPERATIONAL_CONCURRENCY` can explicitly select 1–4. HTTP exhaustion stops queued
work with failure. Rerun to resume; no fake translations are substituted. Exact
keys, placeholders, ASCII numbers, explicit unchanged-name exceptions and target
scripts are validated before a full bundle becomes available. Kashmiri, Sindhi
and Urdu require Arabic; Manipuri requires Meitei Mayek; Santali requires Ol Chiki.

The extractor uses the installed Next Babel parser for TSX. It extracts English
JSX text with React whitespace normalization, direct displayed string literals,
ternary branches and `&&` right operands. It excludes attributes (including
accessibility labels and placeholders), object properties, calls, identifiers,
dynamic templates, code/pre/script/style and existing `InterfaceText` contents.
Remaining excluded labels belong to the integrating UI worker.

Only the parent integrating UI changes should run:

```powershell
node scripts/operational-i18n.mjs --apply
```

The parent must first create the named `InterfaceText` export in
`@/components/interface-text`, consuming the helper result. The transformer
checks source keys against the extraction inventory, preserves client directives
and boundary spaces, requires metadata for all 23 complete bundles, adds the
import, and reparses all output before the first write. It does not alter
attributes or dynamic content. Review native option/text-only contexts and
translated fragments during UI integration. The implementation worker does not
run `--apply`; dry-transform tests only operate in memory.

Deferred maintenance tooling: this generator is not connected to runtime components. Its full coverage verification intentionally fails until all bundles exist; it is separate from the normal Bun application suite. Generation stopped after HTTP 429 to preserve quota for live chat.
