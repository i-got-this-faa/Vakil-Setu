# Gemini integration — 19 October 2026

New AI drafts use the Google Gemini API directly from the Convex Node action. The former gateway/Qwen runtime adapter is removed. Historical `gateway` provenance remains readable in stored summaries, booking snapshots and consent audits; new records use `gemini`.

Conversational assistance and private user document uploads now also use this provider. See [chat-and-documents.md](chat-and-documents.md) for the intake-to-chat flow, context-bound consent, attachment selection, limits, actual synthetic Gemini checks and hosted activation boundary. The summary draft flow below remains a separate operation.

## Configuration

In the **Convex development deployment** dashboard, set `GEMINI_API_KEY` to a Google AI Studio API key. Optionally set `GEMINI_MODEL`; the default is `gemini-3.8-flash`. Do not put the key in the frontend, a `NEXT_PUBLIC_` variable, Git, or chat. Setting it only in a local web environment does not configure hosted actions. Old `LLM_*`, `GATEWAY_BASE_URL`, and `GEMINI_API_URL` settings are ignored. Requests are pinned to Google's HTTPS origin.

Deploy updated backend functions and schema using `convex dev --once --typecheck disable` from `packages/backend`, with native typechecks run separately. Rebuild/restart the web server to display the updated consent recipient. Do not describe the migration as active in the hosted app until deployment succeeds.

## Request and response

The user saves an intake, opens optional AI assistance, consents to sending the saved text and recent follow-ups to Google Gemini, and requests a draft. The backend rechecks ownership, account state and revisions, applies the five-attempt hourly limit and records metadata-only consent before dispatch.

`POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` uses `x-goog-api-key`, a separate system instruction, authorized case content, and `generationConfig.responseFormat.text` with JSON MIME and schema. No SDK dependency is required. The timeout is 30 seconds and the response cap is 64 KiB.

Only a single candidate with finish reason `STOP` is accepted. Blocked prompts, incomplete/safety-stopped responses, missing text and malformed or wrong-language drafts produce an explicit unavailable state. Thought parts never become the summary. The backend validates locale, domain, urgency and text/action bounds before saving a new private version with server-derived Gemini provenance. Concurrent case edits or account disablement prevent persistence. The user must review before sharing. Manual summaries remain available.

This is prompted intake assistance, without legal retrieval or verified citations. JSON validation does not prove legal accuracy, language comprehension, or an actual Gemini connection. Speech remains separate and unchanged.

## Surface coverage

| Surface | Status |
|---|---|
| Native Gemini request, configuration and response parsing | Applies; replaces gateway transport |
| Consent, rate limiting, ownership and concurrent edits | Applies; existing boundaries retained |
| Summary provenance, booking snapshots and audit storage | Applies; additive historical compatibility |
| English/Hindi/Punjabi consent copy | Applies; identifies Google Gemini |
| Missing-key, blocked, truncated, invalid and wrong-language results | Applies; no invented success |
| Speech, native mobile and legacy application | No runtime change; outside this migration |
| Hosted deployment and live generation | Requires valid deployment authentication and Gemini key; record actual outcome in verification.md |

Sources: [Google model catalog](https://ai.google.dev/gemini-api/docs/models), [GenerateContent API](https://ai.google.dev/api/generate-content), [structured output REST](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).

## Hosted activation follow-up — 19 October 2026

Deployment authentication is now working. The backend/schema was published to the existing vakil-setu development deployment, chatty-sandpiper-446, and GEMINI_API_KEY was set there privately. Real website two-turn chat/reload persistence and a separate synthetic hosted document/model test passed. Browser file-picker automation remains unverified because of the extension permission restriction. See verification.md for evidence. This supersedes the earlier activation blocker; production is unchanged.
