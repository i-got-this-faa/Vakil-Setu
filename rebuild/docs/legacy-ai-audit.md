# Legacy AI audit — Vakil Setu (reference)

Status: draft audit of the legacy Express plus Vite codebase. It records only implemented behavior. It does not certify DGX hardware, speech accuracy, or language comprehension. The user has no DGX docs or DGX URL. Pilot languages for the rebuild are English, Hindi, and Punjabi. Rebuild hosts on Convex with Clerk. Payments, reviews, and emergency guarantees are deferred.

Mode: reference. Each section states facts with exact source paths.

## 1. College gateway AI path (actual)

- Outbound base URL: `GATEWAY_BASE_URL`. Example default in `backend/.env.example:14` is `https://ai-services.mietjmu.in`. No DGX API doc or live URL was available during this audit. Treat the host as unconfirmed.
- Outbound path: `LLM_API_URL`. Example default in `backend/.env.example:9` is `/gateway/llm/chat`.
- Join rule in `backend/src/services/aiService.js:243-246`: when `LLM_API_URL` starts with `/` and `GATEWAY_BASE_URL` is set, the service concatenates them with one slash. Otherwise it uses `LLM_API_URL` as an absolute URL. Default `LLM_API_URL` without `GATEWAY_BASE_URL` falls back to `https://api.openai.com/v1/chat/completions` per `backend/src/services/aiService.js:170`.
- Provider switch in `backend/src/services/aiService.js:167`: `LLM_PROVIDER` is `gateway` by default, or `gemini`. No other provider branch exists.
- Gateway request shape in `backend/src/services/aiService.js:253-267`: `POST` with `Content-Type: application/json`, body `{ model, temperature: 0.35, max_tokens: 4096, messages: [{ role: "user", content: prompt }] }`.
- Gateway response parsing in `backend/src/services/aiService.js:280-287`: reads `data.choices[0].message.content`, then `data.message.content`, `data.response`, or `data.output`. Any other shape yields an empty string and then the classifier defaults described in section 5.
- Classification prompt in `backend/src/services/aiService.js:32-62`: asks for one JSON object with `domain`, `domain_label`, `urgency`, `summary`, and `actions`. Supported domains in the prompt are `criminal | civil | family | property`. There is no `unknown` domain in the legacy prompt.
- Gemini alternate path in `backend/src/services/aiService.js:187-241`: `POST {GEMINI_API_URL}/models/{modelName}:generateContent?key={apiKey}` with body `{ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.35, maxOutputTokens: 4096 } }`. Model list comes from `GEMINI_MODEL` plus comma-separated `GEMINI_FALLBACK_MODELS`.

## 2. Environment names (names only, no secret values)

Source: `backend/.env.example:1-30`. The audit read only this example file.

| Name | Purpose | Default or example |
| --- | --- | --- |
| `LLM_PROVIDER` | Selects `gateway` or `gemini` | `gateway` |
| `LLM_API_KEY` | Gateway token (`dgx_...` pattern noted in comment) or Gemini key | placeholder |
| `LLM_MODEL` | Model string sent in the gateway body | `qwen3:latest` |
| `LLM_API_URL` | Gateway path or absolute chat-completions URL | `/gateway/llm/chat` |
| `LLM_API_KEY_HEADER` | Outbound auth header name | `Authorization` |
| `LLM_API_KEY_PREFIX` | Prefix prepended to the key with one space | `Bearer` |
| `GATEWAY_BASE_URL` | College gateway host, joined with a leading-slash `LLM_API_URL` | `https://ai-services.mietjmu.in` |
| `GEMINI_API_URL` | Gemini base URL | `https://generativelanguage.googleapis.com/v1beta` |
| `GEMINI_MODEL` | Primary Gemini model | `gemini-2.0-flash` |
| `GEMINI_FALLBACK_MODELS` | Comma-separated Gemini fallback models | `gemini-1.5-flash,gemini-1.5-pro` |
| `LLM_FALLBACK_MODE` | Enables the local rule-based fallback | `rule_based` |
| `VITE_API_BASE_URL` | Frontend backend origin (documented in `README.md:48`) | `http://localhost:5000` |
| `VITE_STT_PROVIDER` | Documented as `backend_whisper` or `webspeech` (`README.md:49-57`) | `backend_whisper` |
| `VITE_ENABLE_TTS` | Gates browser speech synthesis (`frontend/src/hooks/useLegalChat.js:22`, `frontend/src/pages/ResultsPage.jsx:12`) | `"true"` |

Header construction in `backend/src/services/aiService.js:248-251`: sets `Content-Type: application/json` and `headers[LLM_API_KEY_HEADER] = LLM_API_KEY_PREFIX ? "{prefix} {key}" : key`. With defaults this is `Authorization: Bearer <LLM_API_KEY>`.

## 3. Backend API shapes (legacy)

Mounted routes in `backend/src/server.js:25-29`. AI routes in `backend/src/routes/aiRoutes.js:4-6`.

### `POST /api/ai/classify`

- Controller: `backend/src/controllers/aiController.js:12-24`.
- Request body: `{ text: string }`. Missing `text` returns `400 { message: "text is required" }`.
- Calls `classifyLegalIssue(text)` with empty history.
- Response body: the classification object from section 5. No `sourceMode`, `limitations`, or locale echo beyond `response_language`.

### `POST /api/ai/triage`

- Controller: `backend/src/controllers/aiController.js:27-41`.
- Request body: `{ text: string, history?: Array<{ role, content }> }`. Non-array `history` becomes `[]`.
- Calls `classifyLegalIssue(text, prior)` and then `advocatesForDomain(classification.domain)`.
- Advocate lookup in `backend/src/controllers/aiController.js:5-10`: `Advocate.find({ expertise: canonical, availability: true }).sort({ rating: -1 }).limit(5)`.
- Response body: `{ classification, advocates }`.
- Frontend caller: `frontend/src/api/client.js:21-27` posts `{ text, history }` to `/api/ai/triage`. History shape comes from `frontend/src/utils/chatMessages.js:68-73` as `{ role, content }` pairs. The service keeps the last 10 messages per `backend/src/services/aiService.js:18-30`.

## 4. Speech endpoints (actual)

- No server speech endpoint exists. `backend/src/server.js:25-29` mounts only `/api/ai`, `/api/advocates`, `/api/bookings`, `/api/emergency`, and `/api/payments`.
- `README.md:8` advertises `Speech-to-text via Whisper API (/api/voice/process)` and `README.md:76` lists `POST /api/voice/process`. Neither route, controller, nor Whisper client exists in `backend/src`. Treat both README lines as stale.
- `VITE_STT_PROVIDER=backend_whisper` in `README.md:49-57` has no matching frontend branch. The grep for `VITE_STT` in `frontend/src` finds only `VITE_ENABLE_TTS`; no code reads `VITE_STT_PROVIDER`. All three voice inputs use the browser Web Speech API directly:
  - `frontend/src/components/VoiceRecorder.jsx:68-112`
  - `frontend/src/components/FollowUpChat.jsx:69-102`
  - `frontend/src/components/dashboard/LegalAssistantChat.jsx:90-123`
- Recognition settings: `recognition.lang` comes from `bcp47FromUiLanguage(preferredLanguage)`; `interimResults = true`; `continuous = true` only in `VoiceRecorder.jsx:78`, `false` in the two follow-up inputs.
- Transcript review exists: `VoiceRecorder.jsx:119-125` submits only the edited `transcript` on explicit Submit; the follow-up forms submit only the edited `text` field. Interim results are never auto-submitted.
- TTS path: `frontend/src/utils/classificationSpeak.js:1-12` speaks only `classification.summary` and maps `response_language` `hi` to `hi-IN`, `en` to `en-IN`, else the caller fallback. Playback uses `window.speechSynthesis` with chunking in `frontend/src/utils/webSpeech.js:45-69`. Callers are `frontend/src/hooks/useLegalChat.js:100-106` and `frontend/src/pages/ResultsPage.jsx:61-65`, both gated by `VITE_ENABLE_TTS`.

## 5. Language coverage against the English, Hindi, Punjabi pilot

- `inferUserLanguage` in `backend/src/services/aiService.js:4-16` returns only `hi` or `en`. Devanagari input with 2 or more Devanagari characters returns `hi`. Roman Hindi requires 2 or more marker tokens. Everything else returns `en`. There is no `pa` branch and no Gurmukhi detection.
- Prompt language rules in `backend/src/services/aiService.js:33-37` cover only Hindi (Devanagari output) and English. Punjabi input falls through to the English rule.
- Local fallback in `backend/src/services/aiService.js:84-147` returns only `response_language: "hi"` or `"en"`. Keyword lists cover English plus a small Hindi set. No Punjabi keywords exist.
- UI language state in `frontend/src/state/AppContext.jsx:23` defaults `preferredLanguage` to `"auto"`. `bcp47FromUiLanguage` in `frontend/src/utils/webSpeech.js:2-7` maps `english` to `en-IN`, `hindi` to `hi-IN`, and any other value (including `auto` and any future `punjabi`) to `navigator.language` or `hi-IN`. No `pa-IN` mapping exists.
- UI pickers expose only Auto, Hindi, and English in `frontend/src/components/VoiceRecorder.jsx:211-236` and `["auto", "hindi", "english"]` in `frontend/src/components/FollowUpChat.jsx:152`. `HomePage.jsx:21-22` describes only Hindi and English. A codebase grep for `Punjabi`, `punjabi`, `pa-IN`, `Gurmukhi`, and `ਪੰਜਾਬੀ` in `frontend/src` returns zero matches.
- TTS locale helper `ttsLocaleFromClassification` in `frontend/src/utils/classificationSpeak.js:7-12` returns only `hi-IN` or `en-IN`.
- Result: the legacy build can claim typed and AI behavior for English and Hindi only. Punjabi has no intake, classification, STT tag, TTS tag, or UI string support. The rebuild language registry must track interface, typed input, AI output, recognition, and playback separately per `rebuild/docs/srs-source.txt:129-143`.

## 6. Fallback hazards (do not carry into the rebuild)

1. Narrow fallback trigger on the gateway path. `backend/src/services/aiService.js:269-278` returns the local fallback only for HTTP 5xx or for error text matching `service unavailable|temporarily unavailable|gateway`. A `400`, `401`, `403`, `404`, or `429` from the gateway throws `LLM API error` and the client shows a generic error. Gemini falls back only on `429` per `backend/src/services/aiService.js:223-225`, and on `404` it tries the next model.
2. Silent domain default to `civil`. `normalizeLegalDomainForMatch` in `backend/src/utils/legalDomain.js:5-36` returns `"civil"` for empty or unmatched input. `extractClassificationFromRaw` in `backend/src/services/aiService.js:149-164` defaults missing urgency to `"medium"` and missing summary to a raw-text slice. This violates `rebuild/docs/srs-source.txt:135` which forbids silent default of unknown input to civil and requires an explicit unknown or failure state.
3. Missing-key failure mode. `backend/src/services/aiService.js:176-178` throws `LLM_API_KEY is missing` before any fallback. With no key the endpoint is unusable even though a labelled fallback exists.
4. No timeout or abort. `backend/package.json:12-19` has no HTTP client library. Both `fetch` calls in `aiService.js` set no `AbortSignal.timeout`, so the SRS 30-second provider timeout in `rebuild/docs/srs-source.txt:140` is unimplemented.
5. Boundary validation gap. `aiController.js:15-17,30-32` checks only that `text` is present. There is no input size limit, no locale validation, no authentication, and no rate limit at this boundary. History length is capped only later inside the prompt builder. Per `rebuild/vendor/fleet/skills/principle-boundary-discipline/SKILL.md:12-15`, this is the boundary that must validate, narrow types, and return errors; the rebuild contract proposes 10,000 characters and 10 messages in `rebuild/docs/srs-source.txt:140`.
6. Displayed confidence is derived, not measured. `confidenceFromClassification` in `frontend/src/utils/analysisDisplay.js:18-25` returns `42` for low-quality summaries and `88`, `91`, or `94` from urgency alone. `CaseHero.jsx:11,51-53` renders it as `AI confidence {confidence}%`. No model score or evaluation backs these numbers.
7. Derived urgency labels read as assessment. `caseStrengthFromUrgency` and `complexityLabel` in `frontend/src/utils/analysisDisplay.js:27-51` map urgency to `Serious`, `Critical`, or `High complexity` without a professional-review disclaimer in the string.
8. Trust copy overstates guarantees. `ResultsPage.jsx:30-42` shows `NAAC accredited` and `Encrypted session`. `CaseHero.jsx:31` shows `Encrypted session · Data stays in this browser`, but intake text leaves the browser for `/api/ai/triage` and then the gateway. Emergency and payment paths referenced by `frontend/src/api/client.js:45-71` exist in legacy but are deferred in the rebuild per `rebuild/docs/srs-source.txt:29-41`; do not present them as pilot guarantees.

## 7. What proves vs does not prove DGX hardware deployment

Proves DGX-backed inference (requires live evidence):

- A successful `POST` to the configured `GATEWAY_BASE_URL` plus `LLM_API_URL` from the backend host, returning a triage JSON with recorded status, latency, model name, and response headers, with the exact request ID retained in logs.
- Gateway operator docs or a signed statement naming the model fleet, the DGX Spark pool, and the served model string (for example whether `qwen3:latest` resolves to a DGX-served deployment).
- A backend health or readiness check that verifies the gateway key, reaches the gateway, and reports reachable or unavailable without leaking the key.

Does not prove DGX hardware:

- A `200` from `/api/ai/classify` or `/api/ai/triage` alone. Either endpoint can return the local rule-based fallback in `aiService.js:84-147`.
- The `GATEWAY_BASE_URL` example value `https://ai-services.mietjmu.in`, the `dgx_...` token shape noted in `backend/.env.example:6`, or the model string `qwen3:latest`. Names and URL shapes are configuration, not hardware attestation.
- A passing `npm run dev`, a Vite build, `GET /health` returning `{ status: "ok" }`, persisted Convex or MongoDB records, a Clerk login, browser STT working, or TTS audio playing. Per `rebuild/AGENTS.md:27`, a build does not prove hosted persistence, real Clerk login, DGX inference, speech accuracy, or language comprehension.
- README claims about Whisper or `/api/voice/process`. The endpoint does not exist in the served code.

## 8. Browser speech privacy caveats

- Web Speech recognition is a browser-vendor service, not a local-only transform. In Chrome and Edge the audio and interim transcripts go to the vendor STT service when `SpeechRecognition` runs. `VoiceRecorder.jsx:255` discloses only `Uses your browser · Chrome / Edge recommended`, which understates the network disclosure.
- Error strings in `VoiceRecorder.jsx:90-99` include a `network` case (`Speech recognition network error`), which confirms a network dependency in the STT path.
- TTS via `window.speechSynthesis` in `frontend/src/utils/webSpeech.js:45-69` generally synthesizes with local or OS voices, but voice availability, quality, and Punjabi coverage vary by browser and OS. No `pa-IN` voice selection exists in the legacy code.
- Microphone permission is requested implicitly by starting recognition. There is no pre-prompt explaining the recipient (browser vendor), the purpose, or retention. The rebuild requires that disclosure before provider submission or advocate sharing per `rebuild/docs/srs-source.txt:281`.
- Case text sent to `/api/ai/triage` leaves the device. Session persistence in `frontend/src/utils/chatMessages.js:30-66` keeps classification, advocates, and voice text in `sessionStorage`, so a shared device exposes case content after the session.

## 9. Rebuild implications

- Keep provider credentials server-only. The legacy gateway key stays in backend env; the rebuild must never place it in a client bundle or log, per `rebuild/docs/srs-source.txt:107-108`.
- Add an explicit `unknown` domain and urgency where the SRS requires them (`rebuild/docs/srs-source.txt:135,240`). Remove the silent civil default and the urgency-to-confidence mapping.
- Add `sourceMode` (`provider` or `fallback`) and a `limitations` string to every triage result, per `rebuild/docs/srs-source.txt:135`.
- Register Punjabi as a locale with independent capability flags before claiming support, per `rebuild/docs/srs-source.txt:129`. Until recognition, AI output, and playback are each tested in Punjabi, show Punjabi as unavailable with a typed fallback.
- Implement the missing live acceptance evidence: two-language plus English end-to-end intake, provider-failure labelling, transcript review, and atomic slot reservation per `rebuild/docs/srs-source.txt:291-330`. None of this evidence exists in the legacy audit.

## 10. Sources checked

- `backend/src/services/aiService.js:1-288`
- `backend/.env.example:1-30` (names only; no secret values read)
- `backend/src/server.js:1-44`
- `backend/src/routes/aiRoutes.js:1-8`
- `backend/src/controllers/aiController.js:1-41`
- `backend/src/utils/legalDomain.js:1-36`
- `backend/package.json:1-23`
- `README.md:1-99` (voice lines at 8, 49-57, 76 are stale)
- `frontend/src/utils/webSpeech.js:1-69`
- `frontend/src/utils/classificationSpeak.js:1-12`
- `frontend/src/utils/analysisDisplay.js:1-89`
- `frontend/src/utils/chatMessages.js:1-73`
- `frontend/src/api/client.js:1-71`
- `frontend/src/hooks/useLegalChat.js:1-149`
- `frontend/src/components/VoiceRecorder.jsx:1-271`
- `frontend/src/components/FollowUpChat.jsx:1-205`
- `frontend/src/components/dashboard/LegalAssistantChat.jsx:1-264`
- `frontend/src/components/dashboard/CaseHero.jsx:1-53`
- `frontend/src/pages/HomePage.jsx:1-43`
- `frontend/src/pages/ResultsPage.jsx:1-144`
- `frontend/src/state/AppContext.jsx:1-90`
- `rebuild/docs/srs-source.txt:1-367`
- `rebuild/AGENTS.md:1-27`
- `rebuild/vendor/fleet/skills/technical-writing/SKILL.md:1-129`
- `rebuild/vendor/fleet/skills/principle-boundary-discipline/SKILL.md:1-33`

Missing and still needed: DGX Spark URL, gateway API docs, auth scheme confirmation, served model list, STT provider choice for the pilot, Punjabi STT and TTS test results, retention policy, and administrator review criteria.
