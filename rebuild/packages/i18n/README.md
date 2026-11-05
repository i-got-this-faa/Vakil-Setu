# Localization foundation: current coverage

All 23 short stored codes are accepted by the domain and backend locale validator. Existing `en`, `hi`, and `pa` records remain valid. `LOCALES` and the compatibility alias `PILOT_LOCALES` cover English and all 22 scheduled languages. Native option labels, stable registry codes, and script-specific tags remain available through `getLocaleOptions()` and `getLanguage()`.

## Complete draft bundles

English plus Assamese, Bengali, Bodo, Dogri, Gujarati, Hindi, Kannada, Kashmiri, Konkani, Maithili, Marathi, and Punjabi have complete bundles. Each contains 343 string leaves: 159 shared messages, 66 product strings, 8 case strings, 54 chat strings (including four interpolation templates), 7 intake-chat strings, 48 feature strings, and 1 translation-quality disclosure. Comparison, review moderation, public consent, and summary actions are included. Proper names and technical units may retain standard spelling.

The new translations were machine-drafted with Google Gemini. **Human language quality, legal terminology, and linguistic correctness are unverified.** Type parity, script checks, and generated copy do not establish human review or legal accuracy.

## Deferred translations and explicit fallback

Malayalam (`ml`), Manipuri (`mni`), Nepali (`ne`), Odia (`or`), Sanskrit (`sa`), Santali (`sat`), Sindhi (`sd`), Tamil (`ta`), Telugu (`te`), and Urdu (`ur`) use English interface copy. Their interface capability is **unavailable**, and each selection visibly discloses that the translation is unavailable and English is shown. They are not labeled translated. The generated Manipuri text used Bengali script and was rejected; a Meitei Mayek bundle remains deferred. Santali requires Ol Chiki. Translation generation was stopped at the user's request; no provider generation process or retry remains active.

`draftedLocales` and `hasDraftTranslation()` expose exact coverage. `draftBundles` and all existing typed copy exports resolve every registered choice without missing imports. `getInterfaceLocale()` reports English for unfinished interfaces, independently of the selected language of typed case information. Document language/direction follow the actual interface. Registry direction remains RTL for Kashmiri, Sindhi, and Urdu; only Kashmiri currently has a translated interface.

## Independent capabilities and preferences

Registry metadata marks complete interfaces `unverified`, unfinished interfaces `unavailable`, typed input `available`, and AI/speech `unavailable` until runtime configuration is supplied. `getLanguageCapabilities(locale, runtime)` accepts public server readiness and independent browser/device speech facts. Configured AI input/output and available speech remain `unverified`, with independent unavailable states. Registry membership and interface copy never prove AI comprehension or speech accuracy. Do not send secrets to the client.

The locale provider restores/persists `vakil-setu.locale`, accepts historical registry tags, synchronizes storage events, and applies the actual interface's `document.lang` and `dir`. Storage denial does not prevent selecting a language. User-entered text is not automatically translated.

Tests cover all registered keys, complete native-script drafts, explicitly disclosed fallback, named placeholders, typed copy wiring, preference persistence, blocked storage, and independent capabilities. Browser, deployment, speech, human language review, and legal acceptance remain untested. Parent-owned UI may still contain operational English labels.
