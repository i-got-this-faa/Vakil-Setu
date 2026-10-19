# Case chat and documents — 19 October 2026

## User flow

Intake offers **Save and start AI chat**, enabled after text review and explicit consent to send the intake to Google Gemini. **Save privately without AI** still stores the intake without a model call. A stable intake request ID prevents duplicate case creation when a save acknowledgement is lost. Inputs lock while submission runs and after a case has been saved. If chat dispatch fails unexpectedly after saving, the user can open the saved case without resubmitting the intake.

Each case has a private conversational chat. Sending a message requests a Gemini reply using the original intake, saved reviewed factual corrections, the latest ten successful conversation turns, and only documents selected for that send. Replies do not overwrite the intake or create an approved summary. Consultation sharing still uses a separately reviewed summary version; advocates cannot access case chat or raw uploaded documents.

Users can upload PDF, PNG, JPEG and UTF-8 TXT files to their case. Uploading stores a private file and never calls Gemini. Uploaded files can be selected for the next message or removed. Previously sent file contents are not automatically re-sent on later turns. The conversation may contain earlier model text that discussed a file. Removing a file does not erase already-saved messages or undo a previous provider dispatch.

## Limits and transport

- Up to 100 turns per case, 4,000 characters per user message and 8,000 per reply.
- Up to 20 chat send attempts per account per rolling hour, separate from the five summary-draft attempts.
- Five files per case, at most 3 MiB per file. Select at most three files per send, totalling no more than 6 MiB.
- Backend validates sizes, allowed MIME types, PDF/image signatures, and UTF-8 text. Signature validation is not malware scanning or full document parsing.
- Only the owner can upload, list, read or remove files. The backend rechecks access after storage/reading and cleans up a blob if attachment registration fails. No public file URL is exposed.
- Native Gemini `generateContent` sends PDF/images as `inlineData` and TXT as decoded text, using a server-only key. Files are not uploaded to Google's Files API. Input/document instructions remain untrusted data.
- The default chat model is `gemini-3.8-flash`. Gemini 3/4 chat requests explicitly use `thinkingLevel: LOW` with 4,096 output tokens for interactive latency. Other model overrides retain their default thinking configuration.
- External calls have a 30-second timeout and 64 KiB response cap. Only a completed `STOP` candidate with bounded visible text is saved. No tool execution, retrieval or verified legal citations are provided.

## State and consent

`chat.listMine({caseId})` returns `{turns,limitReached,contextKey}`. `chat.send({caseId,message,documentIds,requestId,contextKey,consent:true})` returns `{kind:"available"}` or `{kind:"unavailable",reason}`. The context key binds consent to current case revisions and visible conversation state. A stale new send is rejected before reservation, audit, quota consumption or fetch. The initial untouched case key is `0:0:`.

The backend reserves one in-flight send per case, stores the user message and terminal result, and schedules lease expiry. Repeating the same request ID/payload returns its existing status without another provider call. An acknowledged unavailable result needs a fresh consented attempt with a new ID; an uncertain network acknowledgement reuses the original ID. Permission or context errors clear the client's held retry. Disabled accounts or changed/deleted cases cannot persist a late successful model response.

Metadata-only `chatConsents` records the recipient origin, case/owner/turn IDs, selected document IDs, history turn IDs, timestamp, model and case revisions before dispatch. Draft deletion removes its stored files, turns and chat consent records, and is blocked during an active send. It does not make a claim about Google's processing/retention after a prior request.

Document operations: `caseDocuments.upload({caseId,content,contentType,fileName})`, `listMine({caseId})`, `read({documentId})`, and `remove({documentId})`. Read returns authorized bytes, MIME and name, with a second access check before returning.

## Verification boundary

The supplied key was accepted by Google's model-list endpoint and stored only in ignored backend environment/runtime files. A native structured draft request succeeded. A local Convex integration harness then used actual Gemini to read a synthetic TXT marker, persist a first reply, recall the marker on the second turn without re-sending the file, and clean up the synthetic case. This proves real model exchange plus local harness persistence, not hosted Convex deployment.

Early follow-up attempts failed or timed out under default model thinking; after selecting low thinking, the two-turn acceptance passed in approximately eight seconds total. This is an observation, not a latency guarantee. Offline tests cover failures and timeout recovery.

Browser checks render the real intake/chat components with substituted identity/data/model boundaries. They cover consent/review reset after edits, private save without an AI call, a lost save acknowledgement followed by retry, pending feedback, preservation of a failed message and successful re-send after renewed consent. The chat component fit its 328px content area under a 360px device override; browser extension/zoom affected page-wide viewport measurements, so no complete page overflow certification is claimed. Browser file selection reached the picker but `setFiles` was blocked by the extension's missing file-URL permission. No browser permission was changed. Backend uploads/storage and real Gemini TXT processing were tested separately.

Hosted activation is still incomplete: the old Convex deployment credential is invalid. The existing browser sign-in reached a Convex Terms of Service acceptance screen, which was left unaccepted. No new deployment or hosted environment key write is claimed. Deploy the backend/schema and configure the key in the hosted deployment before starting this new frontend against it.

Sources: [Convex argument limits](https://docs.convex.dev/production/state/limits), [Gemini document processing](https://ai.google.dev/gemini-api/docs/document-processing), [Gemini thinking configuration](https://ai.google.dev/gemini-api/docs/generate-content/thinking).

## Hosted activation follow-up

On 19 October, CLI authentication was repaired, the schema/functions were deployed to chatty-sandpiper-446 and GEMINI_API_KEY was set on that existing development deployment. Website intake-to-chat, a context-dependent follow-up and reload persistence passed with actual Clerk and Gemini. A separate synthetic operator-identity test passed hosted TXT upload/private read, Gemini marker extraction and second-turn recall, then cleaned up its case. Browser file chooser automation remains unverified due to extension permission/T3 timeout. Earlier hosted-blocker statements describe the pre-activation snapshot; detailed evidence is in verification.md.
