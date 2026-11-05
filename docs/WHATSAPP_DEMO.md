# WhatsApp backend presentation — no website required

## Run the presentation

From the project root:

```bash
npm install --prefix backend
npm run demo:whatsapp --prefix backend
```

The previously imported legal corpus must exist locally. If it is absent:

```bash
npm run legal:ingest --prefix backend
npm run legal:ingest:bns --prefix backend
```

BNS ingestion reuses the saved Firecrawl response when present. Fetching it on a
new machine needs a Firecrawl key in `backend/.env`. Local corpora and demo output
are gitignored; copying the repository does not copy those files.

The demo starts a temporary local webhook server, sends nine signed Meta-shaped
events, waits for the worker after each turn, and closes the server. It uses the
real local BNS/judgment corpus. It requires neither MongoDB nor a website, and
does not contact an advocate or take payment.

Output:

- `backend/data/whatsapp-demo/legal-reply.wav`: playable legal-source reply.
- `backend/data/whatsapp-demo/latest-demo.json`: complete presentation transcript,
  generated-audio paths, evidence and one pending consultation request.
- `backend/data/whatsapp-demo/runs/<timestamp>/state.json`: persistent conversation,
  message processing and request records for that run.

The console must end with `PASS`. Replaying the confirmation event proves that a
duplicate message does not create another request. Every run uses fresh demo data.

### Exercise real local speech recognition

```bash
npm run setup:speech:local --prefix backend
npm run demo:whatsapp -- --real-speech
```

This version transcribes generated English input voice notes with local Whisper;
it does not look up their transcripts. Input speech is synthetic and WhatsApp
delivery remains simulated. Reply audio is real MP3, saved as
`backend/data/whatsapp-demo/legal-reply.mp3`. The complete nine-turn flow has passed
locally, including an actual recognized question, BNS retrieval and a consultation
request. This is not a human-speech accuracy benchmark.

The immediate live integration uses [Twilio Sandbox](TWILIO_SANDBOX.md). The
configuration and live instructions later in this document describe the alternative
Meta adapter; Meta keys are not needed for Twilio. `SPEECH_PROVIDER=local` uses
Whisper/meSpeak/FFmpeg without speech-provider credentials. `SPEECH_PROVIDER=api`
uses the separate audio API adapter.

To demonstrate that retrieval is not a hardcoded answer, replace the question:

```bash
npm run demo:whatsapp -- --question "Why was surrender of possession required for a migrant property appeal?"
```

This changes the simulated input transcript; it does not turn the offline demo
into real speech recognition. Unknown questions can produce an abstention.

## What to say during the presentation

“We have built a voice-first conversation backend with a WhatsApp webhook adapter.
This local demonstration simulates WhatsApp events and uses fixed transcription
fixtures because live messaging and speech credentials are not yet configured.
Legal retrieval, the consent/consultation state machine, generated audio, source
references and persistent request records are running code. The legal response in
this mode is a source excerpt, not an AI-generated legal opinion.”

The scenario is: hello → consent → theft question → BNS section 303 and audio reply
→ request a lawyer → city → sample advocate selection → preferred time → spoken
readback/sharing consent → saved request → pending-status response.

The advocates in `backend/demo/advocates.json` are explicitly fictional. The final
state is **requested**, not confirmed. No real person is contacted. The preferred
time is retained verbatim; it is not interpreted as a reserved calendar slot.

## How the implementation works

1. **Webhook (`src/whatsapp/app.js`):** verifies Meta challenge tokens and HMAC
   signatures over the exact request bytes, validates message envelopes and routes
   only messages for the configured phone-number ID. Signed Meta delivery statuses
   are recorded separately from consultation requests.
2. **Store and worker (`store.js`, `service.js`):** durably save messages before
   acknowledgement, deduplicate message IDs, then process one job at a time. The
   JSON store uses atomic file replacement. It is a single-process pilot store,
   not a horizontally scalable queue.
3. **Speech (`speech.js`):** demo transcription looks up an explicitly labelled
   fixture. Demo speech output is an actual WAV generated offline using meSpeak.
   Real local recognition can be enabled with `--real-speech`. A separate adapter
   can call a configured audio API. Live mode never silently falls back to fixtures.
   Local speech supports English only; live Hindi speech is not provider-tested.
4. **Conversation (`conversation.js`):** asks for consent before collecting case
   facts, handles questions and consultation stages, reads back the selected
   profile/time, and requires explicit permission before saving a sharing request.
5. **Legal response (`legalReply.js`):** searches the shared corpus using BM25,
   reads an excerpt and sends the exact source location separately. Source version
   and authority limitations are spoken. `LEGAL_REPLY_MODE=llm` enables the existing
   grounded-answer adapter when model credentials are configured; it is not used
   by the offline demonstration.
6. **Transport (`transport.js`):** demo writes generated audio and message receipts
   locally. The live adapter downloads Meta audio, uploads reply audio and sends
   messages through the configured Graph API version. Access tokens are sent only
   to approved Meta hosts. Provider errors are not replaced by fake success.

The first voice note triggers consent without downloading/transcribing it. The
second note must be transcribed to understand consent. A declined interaction does
not retain a case summary. The demonstration is not a complete retention/deletion
implementation and must use synthetic scenarios only.

## Run a persistent local backend

```bash
npm run start:whatsapp --prefix backend
```

Demo mode binds to `127.0.0.1:5001`. `GET /health` discloses the mode. The webhook is
`/webhooks/whatsapp`; it accepts signed requests only. There is deliberately no
citizen web UI or unauthenticated API listing private conversations.

If the process stops during a send, the message is marked `needs_review` on restart
rather than automatically repeating an uncertain external delivery. Failed jobs
also require operator review; a production retry/reconciliation console is not
implemented. Outbound success from Meta is API acceptance, not proof of delivery
or that the recipient listened to the audio.

## Enable a real WhatsApp test conversation

Put credentials in ignored `backend/.env` and set:

- `WHATSAPP_MODE=live`.
- `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET` and a
  supported `WHATSAPP_GRAPH_VERSION` from the Meta developer app.
- `WHATSAPP_VERIFY_TOKEN`, a long random value also entered in Meta webhook setup.
- `SPEECH_API_BASE_URL`, `SPEECH_API_KEY`, `STT_MODEL`, `TTS_MODEL` and `TTS_VOICE`
  for an API implementing the multipart `/audio/transcriptions` and binary
  `/audio/speech` protocol. Other speech protocols need an additional adapter.

Expose port 5001 over HTTPS using an appropriate deployment or tunnel, configure
the callback as `https://<host>/webhooks/whatsapp`, subscribe to message events and
authorize the test recipient in Meta's setup. Configure supported incoming audio
formats and voice languages with the selected speech provider.

Live mode refuses incomplete configuration instead of silently starting a demo.
The above configuration also requires `WHATSAPP_PROVIDER=meta`. For Twilio use the
separate sandbox guide. It has no real advocates by default. To enable requests, configure
`WHATSAPP_ADVOCATE_MANIFEST` with reviewed profiles containing `id`, `name`, `city`,
`expertise`, `languages`, `verified: true` and `demo: false`. Existing seeded
prototype profiles are not promoted to verified advocates.

These requests are stored for staff handling; no advocate notification or acceptance
service is implemented yet. Payments, real calendar reservations, cancellation,
reminders, document drafting and validated historical statutory applicability are
not included in this milestone. Current access control, retention, worker recovery,
provider spend control and monitoring must be hardened before accepting real cases.

## Verification

```bash
npm run test:legal --prefix backend
npm run test:whatsapp --prefix backend
npm run demo:whatsapp --prefix backend
```

The WhatsApp suite covers Meta and Twilio webhook signatures, duplicate events, consent,
explicit sharing confirmation, exclusion of fictional advocates in live matching,
restart behavior, repeat prompts after unusable audio, statutory-version warnings,
expiring media URLs and media-host credential protection.
The scripted demonstration additionally exercises real corpus retrieval and WAV
synthesis. No live Meta, speech-provider or LLM success is implied by these checks.

Offline speech generation uses the `mespeak` package and its bundled eSpeak assets;
their GPL notices are retained in the installed package. This is the synthetic
presentation voice, not the intended production speech provider.
