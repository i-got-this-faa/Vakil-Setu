# Language capability matrix

**Status date:** 14 October 2026
**Source:** [`srs-source.txt`](srs-source.txt), VS SRS 001, version 1.0

This matrix records product targets and current evidence; a locale appearing here does not establish language support. The source SRS lists the 22 languages in India's Eighth Schedule plus English, but names no AI or speech provider and includes no language test results. The rebuild has English, Hindi, and Punjabi message bundles, but there is no independent language-review record and the bundles do not cover every UI string. Treat interface localization as unverified.

## Capability status

| Status | Meaning |
|---|---|
| Target, unverified | The source SRS includes this text capability in product scope. Code or message bundles may exist, but the rebuild has no complete language-specific acceptance record. Do not present it as human-reviewed or tested. |
| Available, generic Unicode entry | Text fields accept Unicode input; this is a runtime baseline, not language-specific validation or usability evidence. |
| Unverified path | A code path may exist, but no language-specific acceptance record establishes release support. Label it unverified. |
| Unavailable, no locale path | No code path for this capability is configured for that locale. This does not claim that no provider could support it. |

The three text columns and two speech columns are independent. A language's AI output status does not imply interface localization, typed input validation, recognition, or playback. Recognition does not imply playback.

## Language entries

The locale tags below use BCP 47 language subtags with the India region tag. They are stable identifiers for this registry, not proof of provider compatibility. They do not select a writing system. Add an explicit script subtag when the product supports and records a script variant.

| Language | Locale tag | Interface text | Typed input | AI output | Speech recognition | Speech playback | Pilot status |
|---|---|---|---|---|---|---|---|
| Assamese | `as-IN` | Target, unverified | Available, generic Unicode entry | Target, unverified | Unavailable, no locale path | Unavailable, no locale path | Not selected |
| Bengali | `bn-IN` | Target, unverified | Available, generic Unicode entry | Target, unverified | Unavailable, no locale path | Unavailable, no locale path | Not selected |
| Bodo | `brx-IN` | Target, unverified | Available, generic Unicode entry | Target, unverified | Unavailable, no locale path | Unavailable, no locale path | Not selected |
| Dogri | `doi-IN` | Target, unverified | Available, generic Unicode entry | Target, unverified | Unavailable, no locale path | Unavailable, no locale path | Not selected |
| Gujarati | `gu-IN` | Target, unverified | Available, generic Unicode entry | Target, unverified | Unavailable, no locale path | Unavailable, no locale path | Not selected |
| Hindi | `hi-IN` | Unverified, bundle not human-reviewed | Available, generic Unicode entry | Unverified, no live provider evidence | Unverified, browser path | Bundled local engine lifecycle checked; pronunciation unverified | Confirmed pilot |
| Kannada | `kn-IN` | Target, unverified | Available, generic Unicode entry | Target, unverified | Unavailable, no locale path | Unavailable, no locale path | Not selected |
| Kashmiri | `ks-IN` | Target, unverified | Available, generic Unicode entry | Target, unverified | Unavailable, no locale path | Unavailable, no locale path | Not selected |
| Konkani | `kok-IN` | Target, unverified | Available, generic Unicode entry | Target, unverified | Unavailable, no locale path | Unavailable, no locale path | Not selected |
| Maithili | `mai-IN` | Target, unverified | Available, generic Unicode entry | Target, unverified | Unavailable, no locale path | Unavailable, no locale path | Not selected |
| Malayalam | `ml-IN` | Target, unverified | Available, generic Unicode entry | Target, unverified | Unavailable, no locale path | Unavailable, no locale path | Not selected |
| Manipuri (Meitei) | `mni-IN` | Target, unverified | Available, generic Unicode entry | Target, unverified | Unavailable, no locale path | Unavailable, no locale path | Not selected |
| Marathi | `mr-IN` | Target, unverified | Available, generic Unicode entry | Target, unverified | Unavailable, no locale path | Unavailable, no locale path | Not selected |
| Nepali | `ne-IN` | Target, unverified | Available, generic Unicode entry | Target, unverified | Unavailable, no locale path | Unavailable, no locale path | Not selected |
| Odia | `or-IN` | Target, unverified | Available, generic Unicode entry | Target, unverified | Unavailable, no locale path | Unavailable, no locale path | Not selected |
| Punjabi | `pa-IN` | Unverified, bundle not human-reviewed | Available, generic Unicode entry | Unverified, no live provider evidence | Unverified, browser path | Bundled local engine lifecycle checked; pronunciation unverified | Confirmed pilot |
| Sanskrit | `sa-IN` | Target, unverified | Available, generic Unicode entry | Target, unverified | Unavailable, no locale path | Unavailable, no locale path | Not selected |
| Santhali (Santali) | `sat-IN` | Target, unverified | Available, generic Unicode entry | Target, unverified | Unavailable, no locale path | Unavailable, no locale path | Not selected |
| Sindhi | `sd-IN` | Target, unverified | Available, generic Unicode entry | Target, unverified | Unavailable, no locale path | Unavailable, no locale path | Not selected |
| Tamil | `ta-IN` | Target, unverified | Available, generic Unicode entry | Target, unverified | Unavailable, no locale path | Unavailable, no locale path | Not selected |
| Telugu | `te-IN` | Target, unverified | Available, generic Unicode entry | Target, unverified | Unavailable, no locale path | Unavailable, no locale path | Not selected |
| Urdu | `ur-IN` | Target, unverified | Available, generic Unicode entry | Target, unverified | Unavailable, no locale path | Unavailable, no locale path | Not selected |
| English | `en-IN` | Unverified, bundle not human-reviewed | Available, generic Unicode entry | Unverified, no live provider evidence | Unverified, browser path | Unverified, local-voice path | Confirmed pilot |

The “Available, generic Unicode entry” cells describe text fields that accept Unicode strings; they do not establish language-specific validation, script shaping, font coverage, or input-method quality. The pilot's English, Hindi, and Punjabi message bundles exist in `packages/i18n`, but the web app still contains hard-coded English strings and no independent language-review record. The registry therefore keeps pilot interface status unverified. “Unverified” pilot speech cells identify the optional browser recognition and local-voice playback code paths; they do not mean those paths have passed language-specific checks.

The 22 scheduled language names follow the current Eighth Schedule. The schedule spells the names **Odia** and **Santhali**. The IANA language subtags retain `or` for Odia and `sat` for Santali. The product label uses the constitutional spelling and keeps the IANA tag as the machine identifier. English is an additional product language, not an Eighth Schedule entry.

## Script and provider rules

- Store the selected BCP 47 tag with every intake, follow-up, AI result, and advocate language claim.
- Do not treat a language tag as a script or speech-provider identifier. Decide default and alternate scripts for languages with script variants before pilot acceptance.
- Keep separate flags for interface text, typed input, AI output, recognition, and playback. Store the evidence date and provider configuration for each verified flag.
- Do not turn an unknown capability into `supported`. Pilot speech controls may expose an optional browser path, but it remains unverified and must be labelled accordingly; keep typed input available as a fallback.
- A support record must name the locale and script tested, operation, provider and model or runtime version, device or browser, test set, reviewer, date, results, and failures.
- Evaluate names, dates, amounts, code-switching, and common accents in each selected pilot language. Review AI comprehension separately from whether the provider returned text in the requested language.
- Test recognition and playback independently. A provider's language list alone is not evidence that the configured product path works.

## Pilot decision

The confirmed pilot is English (`en-IN`), Hindi (`hi-IN`), and Punjabi (`pa-IN`), as recorded in [`decisions.md`](decisions.md). It meets the SRS target of two Indian languages plus English. Dogri was an earlier candidate and is not in the current pilot.

The confirmed pilot does not assert evaluated speech quality for any of its languages. Optional browser recognition asks for user consent and allows transcript review; it is not pinned to on-device processing. English playback selects matching local device voices. Hindi/Punjabi use the bundled eSpeak NG worker: actual nonzero audio and start/end events passed synthetic-text checks on 15 October 2026. Pronunciation/comprehension, physical speaker audibility and recognition accuracy remain unverified, so the capability registry is not upgraded to supported. No locale path exists for the other 20 scheduled languages. The AI adapter also has no live provider or language-comprehension evidence.

## Legacy behavior is not rebuild evidence

The legacy code audit found explicit English and Hindi branches for text classification and AI response language. It found no Punjabi branch, Gurmukhi path, or Punjabi playback tag. It found no explicit support path for the other scheduled languages. Generic text fields do not establish language-specific AI or interface support.

The legacy web app calls browser speech recognition and speech synthesis. The audit found no language-specific accuracy or comprehension results. Browser and operating-system voice availability do not establish support for the rebuild. The new language flags start unverified even where the legacy code has a branch. See [`legacy-ai-audit.md`](legacy-ai-audit.md) for code evidence.

## References

- [The Constitution of India, Eighth Schedule](https://www.legislative.gov.in/static/uploads/2025/07/ca7ce5c746fa7480804bbdeb6cb704f0.pdf), Legislative Department, Government of India.
- [IANA Language Subtag Registry](https://www.iana.org/assignments/language-subtag-registry).
- [RFC 5646, BCP 47 language tags](https://www.rfc-editor.org/rfc/rfc5646).
