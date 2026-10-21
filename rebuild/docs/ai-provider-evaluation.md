# AI provider evaluation — 21 October 2026

The reproduced problem is long time to response headers on native Gemini 3.8 generation, even for a tiny synthetic input. Extending the timeout again would hide that delay and hold the user in a pending state longer. The screenshot's particular hosted request was not traced, and no real case or transcript was read for this investigation.

## Observed requests

The existing ignored `.runtime/gemini-api-key` was read only inside server-side scripts/tests. No legacy environment file, key, request header, raw intake, generated answer or error body was printed. Requests went directly to Google's pinned HTTPS API, without a gateway or undocumented DGX endpoint. The live catalog returned HTTP 200 and listed the evaluated models with `generateContent` support. A catalog success is not a generation health check.

Two rounds used the same fictional tenant/deposit preparation question. Round one compared 3.8 non-streaming with streaming concurrently. Round two compared three non-streaming configurations concurrently. These are individual observations on this machine/account, not a statistically controlled latency benchmark or a quality comparison.

- `gemini-3.8-flash`, `LOW`, 2,048 output tokens, `generateContent`: HTTP 200; headers 52,439 ms; first body 52,459 ms; complete `STOP` at 52,471 ms; 611 visible characters.
- `gemini-3.8-flash`, `LOW`, 1,024 output tokens, `streamGenerateContent?alt=sse`: HTTP 200; headers 53,144 ms; first body 53,148 ms; complete `STOP` at 54,201 ms; 577 characters. Streaming did not improve this observation enough to justify a streaming parser or exposing unvalidated partial output.
- `gemini-3.8-flash`, `LOW`, 1,024 output tokens, `generateContent`: deadline at 60,008 ms before any response headers or body. The smaller answer budget alone did not solve the delay.
- `gemini-3.6-flash`, `MINIMAL`, 1,024 output tokens: HTTP 200; complete `STOP` at 3,231 ms; 540 characters.
- `gemini-3.5-flash-lite`, `MINIMAL`, 1,024 output tokens: HTTP 200; complete `STOP` at 2,104 ms; 517 characters. It was not selected because the task does not include evaluating a Flash-Lite model's adequacy for this product.

Additional adapter checks on 3.6 returned complete Punjabi/Hindi text at 5,717/6,273 ms with the expected scripts present, and a schema-valid English triage at 1,872 ms. An English chat attempt returned HTTP 503 at 6,701 ms. This failure is part of the evidence; switching configurations does not eliminate upstream failures. Script presence and schema validity do not establish language comprehension, legal accuracy or suitability.

An opt-in integration check then ran the real Node actions and native adapter against actual Gemini with **local `convex-test` persistence**. It passed in 21.52 seconds total: English/Hindi/Punjabi chat with a fictional TXT marker, marker extraction, and an English follow-up recalling the marker without selecting or resending the document. It deleted its synthetic cases after each locale. This proves a live provider exchange through the action/state/attachment path in a local harness. It does not prove hosted Convex deployment or browser behavior.

## Chosen behavior

`geminiConfig` defaults to `gemini-3.6-flash`; the adapter sends its documented `MINIMAL` setting. `GEMINI_MODEL` continues to override that default. A deployment explicitly configured with `gemini-3.8-flash` will still use 3.8 with `LOW` until its operator changes the setting. Nothing in this task deploys functions or changes hosted environment settings.

Chat requests have one candidate and a 1,024-token answer budget, with the existing concise-answer instruction. Triage retains its 4,096-token structured-output budget and now uses the same adapter and model-specific thinking settings. The existing 60-second chat deadline, 75-second lease, 30-second triage deadline, 64 KiB response cap, and 8,000-character chat reply validation are retained. Unsupported model overrides use the model's default thinking settings instead of guessing a supported level. No automatic retries, alternate-provider dispatch, fabricated reply, confidence score, legal retrieval or verified citation is added.

The hard deadline races preparation/generation against a timer, aborts transport, and settles a terminal result even if a transport ignores abort. A late response cannot persist after the deadline. Storage reads check abort before proceeding to the consent audit or provider call. Body readers are cancelled on abort. Scheduled lease expiry remains the recovery path for an abandoned action.

The provider-neutral `AiRequest`/`AiResult`/`AiProvider` contract lives in `convex/lib/ai.ts`; Gemini roles, inline media, schema transport, supported thinking levels, and `STOP` parsing live in `aiGemini.ts`. Replacement adapters must preserve bounded input/output, explicit consent before dispatch, owner/revision checks and recipient auditing. Only native Gemini is implemented or advertised. A replacement recipient requires updating the consent persistence contract; the current chat audit correctly remains pinned to Google.

Only one `STOP` candidate with nonempty bounded visible text is accepted. Thought-only, tool-call, blocked, malformed, multiple-candidate and token-truncated envelopes remain failures. Triage additionally validates the JSON locale/domain/urgency/text/actions before saving a new private version. Both prompts prohibit inventing laws, sections, citations, scores or guarantees; prompting alone is not a factual/legal validation mechanism.

## Capability contract and locale permission

`chat.capabilities({})` is a public, read-only query with exactly these safe fields:

```ts
{
  configured: boolean;
  locales: string[]; // stored short codes
  provider: "gemini_native";
  evidence: "observed_runtime_only_not_quality_validated"
    | "operator_allowlist_not_quality_validated";
  reason?: "not_configured" | "invalid_config";
}
```

`configured` means the server has syntactically valid provider configuration, not that an upstream request will succeed. No key, key prefix, model override, endpoint, account information or case data is returned. Both chat and triage use the exact same locale policy independently of the UI.

- Unset `AI_CHAT_LOCALES`: only `en,hi,pa`, reflecting observed runtime evidence, without a language-quality claim. The default is deliberately independent of the expanded UI/domain locale registry.
- Explicit comma-separated short codes, for example `AI_CHAT_LOCALES=en,hi,pa,ta`: only those languages; whitespace is trimmed and duplicates removed. The operator must collect and review language-specific evidence before adding a language. The setting records permission, not proof.
- Every one of the domain's 23 codes is configurable: `en,as,bn,brx,doi,gu,hi,kn,ks,kok,mai,ml,mni,mr,ne,or,pa,sa,sat,sd,ta,te,ur`.
- An explicit empty setting disables all AI languages. An unknown code, regional tag, wildcard or empty list item fails closed to an empty locale list.
- A denied language returns `{kind:"unavailable",reason:"unsupported_language"}` from either action without provider dispatch or a dispatch-consent audit. Chat retains a terminal turn and request-ID replay behavior. Existing account attempt quotas still count valid attempts.
- Locale permission is checked again before accepting an in-flight reply or summary. Ownership, account disablement, case revisions, summary versions, idempotency and state-change protections remain independent checks.

Parent-owned frontend work must gate initial intake AI, existing chat send and triage using **both** `configured` and membership in `locales`. The backend enforces the same rule even if a client bypasses its gate.

## Privacy-preserving diagnostics

Server `console.info("ai_provider_diagnostic", metadata)` logs contain only `operation`, `phase`, a fixed allowlisted `reason`, total `latencyMs`, and `transport` timings/status. Transport metadata is `{httpStatus,headersMs,firstByteMs,latencyMs}`; missing observations are `null`. There are no transcripts, filenames, credentials, request IDs, case/account IDs, URLs, raw error objects, provider bodies or generated answers. The logger reconstructs the allowed shape and normalizes unknown reason strings to prevent accidental extra fields from being logged. There is no new diagnostic endpoint or stored transcript copy.

Interpretation:

- `timeout` with `phase:provider` and null header status: no headers observed before the deadline; does not distinguish provider compute/capacity from network routing.
- `timeout` with HTTP status/headers and no complete body: headers arrived but body completion exceeded the deadline.
- `provider_failed` with null status: transport rejection before headers.
- `provider_failed` with HTTP 503, or `rate_limited` with HTTP 429: explicit provider HTTP failure; response bodies are discarded.
- `malformed`, `blocked`, `truncated`, `response_too_large`: response-boundary failures; no answer is saved.
- `state_changed`/`persist`: a completed result was discarded because the state was no longer valid.

Triage preserves its existing public `provider_failed`/`invalid_result` categories while these logs record the precise safe cause. `unsupported_language` is an explicit addition to both public action contracts.

## Surface and completion ledger

| Surface/result | Applicability | Evidence/state |
| --- | --- | --- |
| Native chat + summary provider | Applies | Shared typed adapter; actual synthetic provider/action test passed |
| Configuration + public capability query | Applies | Exact-shape, missing/invalid config and secret-exclusion tests passed |
| 23 stored locale codes vs provider permission | Applies | All 23 explicitly configured action paths tested; default extra 20 denied on chat and triage |
| Ownership, consent, request replay, selected documents, history bounds | Applies | Existing real Convex harness tests retained; added cross-case isolation |
| Timeout, stalled body, ignored abort, late response and changed state | Applies | Component and Convex action integration tests passed |
| STOP-only validation and malformed/blocked/truncated responses | Applies | Existing extraction tests plus native-adapter tests passed |
| Frontend intake/chat/triage gates | Applies; parent owns files | Capability contract supplied; frontend changes not claimed here |
| Domain/schema/validators | Applies; other workers own files | Consumes their 23-code registry; no edits by this worker |
| Hosted/backend deployment, browser acceptance | Not performed | Parent integration/deployment required; not authorized for this worker |
| Speech, gateway/DGX, alternate provider | Does not apply | No implementation or claim added |

Validation on the shared checkout: backend `tsc --noEmit` passed. The final full backend run passed 203 tests (including concurrent workers' additions), with the one live test skipped by default. Opt-in actual-provider test passed separately. The default suite never reads a credential or makes live provider calls.

From `packages/backend`, the opt-in test command is `AI_SYNTHETIC_LIVE=1 bun run test -- tests/ai-live.test.ts` (PowerShell: `$env:AI_SYNTHETIC_LIVE='1'` in that process before running Bun). It requires the existing ignored runtime key file; never copy a key into argv. Ordinary validation is `bun run test` and `bun run typecheck`. Repository test runtime used here: `.tooling/node_modules/bun/bin/bun.exe`.

Unverified: hosted behavior of this change, browser flows, PDF/image generation quality, worst-case 6 MiB documents and maximum history latency, independent legal/language review, the extra 20 languages' live model behavior, sustained load, and availability/cost comparisons. No token-cost or accuracy benchmark is claimed.

Started on branch `master`, HEAD `fcd130834671036c0ca00fc5daf7926b06ed443f`. Shared worktree contains other workers' changes; only the assigned AI/provider files, their tests and this document were edited by this worker. No dependency was added; no deploy, commit, push, or hosted setting change was performed. Parent integrates and decides hosted activation.

Primary references: [Google thinking-level compatibility](https://ai.google.dev/gemini-api/docs/generate-content/thinking), [native generation/streaming](https://ai.google.dev/gemini-api/docs/generate-content/text-generation), [structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output). Google documents `MINIMAL` as unsupported for 3.8 Flash and supported for 3.6 Flash. These references explain valid request configuration, not actual service availability.
