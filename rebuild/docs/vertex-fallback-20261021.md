# Vertex AI quota fallback ? 21 October 2026

## Implemented surfaces

- Primary Google Gemini chat and summary requests can attempt Google Cloud Vertex AI exactly once after HTTP 429. Missing/invalid primary configuration, safety refusal, other errors or expired deadlines do not trigger fallback.
- Same overall deadline and existing per-user rate limits. Conversation/selected-file limits and ownership checks are preserved. No round-robin, additional retries, automatic sharing or third-party provider was added.
- Vertex adapter uses validated service-account JSON from Convex server environment, pinned Google OAuth RS256 exchange, bounded short-lived token cache and native Vertex generateContent. Model/location defaults global / gemini-3.6-flash, with minimal thinking. No dependency installation or exposed secrets.
- Intake, chat composer and AI summary consent include the Vertex fallback disclosure when configured. Requests must explicitly send allowVertexFallback:true; older clients remain Gemini-only. Existing pending intake button remains Saving?.
- Each attempted recipient is audited before dispatch. Between primary and fallback, account ownership/state and case/context revisions are rechecked. Replay cannot change the consent route flag or duplicate dispatch. Vertex summaries record provider vertex; historical records remain readable.

## Newly observed evidence

- Actual supplied credential: OAuth HTTP 200. Initial regional synthetic generation returned 403 SERVICE_DISABLED. Attempt to enable Vertex via Service Usage returned 403 SERVICE_DISABLED. Subsequent user-requested retry against global Gemini 3.6 returned 403 BILLING_DISABLED, after 3607ms. No generated reply was received or fabricated; no real case data was used.
- Uploaded Python script initializes the SDK only; its generation example is commented out. It is not a successful generation test.
- Credential was set in existing development Convex chatty-sandpiper-446 via CLI stdin; captured output was not printed. Readback was compared by digest; matches true. VERTEX_LOCATION=global, VERTEX_MODEL=gemini-3.6-flash and VERTEX_FALLBACK_ENABLED=true set. Backend deployment completed and public chat.capabilities returned vertexFallback:true. This is configuration evidence, not a health claim.
- Full bun run check passed native typechecks, 272 backend + 30 language + 21 React/localization tests (323 total), one opt-in live test skipped, and production build. Adapter tests use generated synthetic RSA keys and mocked network responses; routing tests use actual Convex functions with substituted external provider responses. Covered handoff/replay/ownership/consent/audit, failures, deadlines and summary provenance.
- Independent review found direct Vertex routing when Gemini configuration was absent. Fixed by requiring the primary to configure before either route; missing/invalid-primary regression tests now assert zero outbound calls at chat and summary boundaries. Review was read-only. No second independent review was run after this fix.
- First Convex sync identified Node crypto being bundled into default runtime. Added explicit use-node directives to Node-only adapter/routing modules; subsequent sync succeeded. Default-runtime capability configuration remains pure.
- Collaborative browser loaded the current localhost home without an error overlay. Authenticated browser chat/summary handoff has not been exercised in the preview profile. UI render tests cover visible fallback disclosure in English/Hindi/Punjabi; other interface languages explicitly show this new disclosure in English.

## Remaining dependency

A project owner must link active Google Cloud billing to the service-account project and allow Vertex model inference. Current live blocker is BILLING_DISABLED, not an invalid credential. After billing activation, rerun a synthetic actual-provider generation check and authenticated case chat/summary flows. The application is configured to attempt fallback already; live success is not claimed. Neither provider is guaranteed available and both remain Google services. No production readiness or language-quality claim.

## References

- https://developers.google.com/identity/protocols/oauth2/service-account
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-6-flash
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/reference/rpc/google.cloud.aiplatform.v1

Only task-owned code/docs are committed. Existing unrelated web presentation edits remain unstaged. No credential or uploaded key file is copied into Git. No push authorized or performed.
