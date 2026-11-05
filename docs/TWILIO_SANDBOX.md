# Twilio WhatsApp Sandbox — presentation setup

This is the immediate live messaging integration. Meta Cloud API credentials are
not required when using Twilio. No website or MongoDB is required.

## Quick start (2 commands)

```bash
npm run setup:twilio      # asks for Account SID, Auth Token (hidden), sandbox sender; saves backend/.env
npm run twilio:live       # opens a Cloudflare tunnel, saves PUBLIC_BASE_URL, starts the live bot
```

`twilio:live` prints a webhook such as `https://<random>.trycloudflare.com/webhooks/twilio`.
Paste it into **Twilio Console → Messaging → Try it out → Send a WhatsApp message →
Sandbox settings → "When a message comes in"** (POST) and save. The URL changes every
run. On the website, set `VITE_WHATSAPP_JOIN_CODE` in `frontend/.env` to your sandbox
join code so the "Chat on WhatsApp" button prefills `join <code>`.

The detailed manual steps follow.

## 1. Join the sandbox from your phone

1. Sign in at <https://console.twilio.com/>.
2. Open **Messaging → Try it out → Send a WhatsApp message**, or the WhatsApp
   Sandbox page available in your console layout.
3. The console displays a sandbox WhatsApp number and a `join ...` phrase.
4. Send that exact phrase to that number from your phone's WhatsApp. Wait for the
   confirmation. Each test recipient must join the sandbox separately.

Use the number and phrase shown in your own console. Do not send an example phrase
from this document. If the embedded browser fails, use your normal browser.

## 2. Save your credentials locally

In `backend/.env`, fill the existing fields:

```dotenv
TWILIO_ACCOUNT_SID=AC...your_account_sid...
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+your_sandbox_number
SPEECH_PROVIDER=local
LEGAL_REPLY_MODE=extractive
```

Account SID and Auth Token are available in the Twilio Console account dashboard.
`TWILIO_WHATSAPP_FROM` is the sandbox sender, not your own mobile number. These
values are secrets/configuration, not code to commit or include in screenshots.
The ignored local `.env` has placeholder fields prepared; existing secrets are
preserved by setup.

`WHATSAPP_DEMO_ADVOCATES=true` enables explicitly fictional profiles for a Twilio
presentation. This setting is allowed only by the Twilio branch. The assistant
announces the fiction and saves local requests; no real advocate is contacted.
Set it to `false` and supply a reviewed `WHATSAPP_ADVOCATE_MANIFEST` before testing
actual advocate requests.

## 3. Set up local English speech once

Requirements: Python 3 with venv support and system FFmpeg.

```bash
npm install --prefix backend
npm run setup:speech:local --prefix backend
```

The setup downloads faster-whisper and its English `tiny.en` model. Subsequent
recognition uses the local model, and recordings are not sent to a speech API.
Offline eSpeak/meSpeak produces audio, which FFmpeg converts to MP3 for WhatsApp.
No extra speech/model API key is needed in this mode. This setup supports English,
not validated multilingual speech. Voice notes must be no longer than 120 seconds.
Transcription can be inaccurate; details are read back before a consultation
request is saved. This is not a speech-accuracy benchmark.

Alternatively set `SPEECH_PROVIDER=api` and configure the documented audio API
fields in `.env.example` for a separately evaluated provider.

## 4. Expose the webhook over HTTPS

For example, on the chosen local port:

```bash
cloudflared tunnel --url http://127.0.0.1:5002 --no-autoupdate
```

Keep that terminal running. Copy its public HTTPS origin into `.env`:

```dotenv
WHATSAPP_PORT=5002
PUBLIC_BASE_URL=https://your-tunnel.trycloudflare.com
```

Do not append a path or query to `PUBLIC_BASE_URL`. A temporary tunnel address can
change after restart. Update both this environment value and the Twilio callback
whenever it changes. A previously printed address is not guaranteed to remain live.

The public origin is also used when validating Twilio signatures and constructing
expiring audio links. Setting only the browser URL or forwarding a port is not
enough. This application does not trust arbitrary forwarded-host headers.

## 5. Check configuration and start

From the repository root:

```bash
npm run doctor:whatsapp
npm run start:twilio
```

The doctor reports missing field names without printing credentials. Optional
`npm run doctor:whatsapp -- --verify-account` performs read-only Twilio account
authentication. It does not send a message.

`start:twilio` explicitly selects the live Twilio adapter; it does not silently run
the local fixture simulation. Keep it running. Missing credentials or the speech
model cause startup to fail instead of pretending the service is connected.

## 6. Set the sandbox callback

In the sandbox settings, set **When a message comes in** to:

```text
https://your-tunnel.trycloudflare.com/webhooks/twilio
```

Choose **POST** and save. Use the exact current origin from your `.env`/doctor,
not this example. The backend returns empty TwiML quickly, then the worker sends
the response asynchronously. Signature checks remain enabled behind the tunnel.

## 7. Test through real WhatsApp

Send short English voice notes:

1. “Hello.” The first response explains consent; this first audio is not downloaded
   or transcribed before the consent prompt.
2. “Yes, English.”
3. “What does the law say about theft of movable property without consent?”
4. “I would like to speak to an advocate.”
5. “I am in Jammu.”
6. “The first one.”
7. Give your preferred day/time and consultation mode.
8. Listen to the readback. Confirm only if the details and sharing scope are right.

With fictional profiles enabled, the final result is a **sample consultation
request**, not a real accepted appointment. With no verified profiles configured
and sample profiles disabled, the assistant reports that no matching advocate is
configured. It never promotes the browser prototype's seeded advocates to verified
profiles automatically.

Replies are MP3 audio. Statute/judgment references arrive as separate text messages.
The current no-key response reads an actual retrieved excerpt; it is not an
LLM-generated legal opinion. BNS amendment/commencement coverage through December
2025 remains unverified, and the assistant discloses that limitation.

## How the Twilio adapter differs from Meta

- Twilio delivers form-encoded message fields and an `X-Twilio-Signature`. The
  backend validates them with the official Twilio SDK against the configured public
  callback URL, account and sandbox recipient.
- It downloads the protected incoming audio from the correct account's Twilio
  media endpoint. Redirected CDN requests do not receive the account credentials.
- It generates a reply and gives Twilio a signed media URL valid for 15 minutes.
  There is no public directory listing. Invalid/expired signatures cannot retrieve
  audio; expired files are cleaned while the backend runs.
- Message IDs feed the existing deduplication/worker pipeline. Uncertain sends
  require review rather than blind retries. `queued` from the API is not proof of
  delivery or listening. Outbound requests set a signed status-callback URL;
  queued/sent/delivered/read/failed events are saved separately from request status.
  Duplicate and delayed callbacks cannot undo a delivered/read status.

## Voice request management and local adapter demo

Say **repeat** to replay the last spoken reply, **repeat the last answer** to replay
the legal excerpt, **help** for the current stage, **request status** for the saved
request, or **start a new case** to clear case context while retaining existing
requests. **Cancel my request** reads back the pending request and requires a
separate yes before changing it to cancelled. This does not cancel a confirmed
appointment, notify an advocate or initiate a refund.

The Twilio adapter can be demonstrated without credentials or external messages:

```bash
npm run demo:twilio
npm run demo:twilio -- --real-speech
```

Both modes use a fake Twilio account and in-process client. The first uses fixture
transcripts and real MP3 synthesis. The second transcribes synthetic input voice
notes with local Whisper. The 13-turn scenario additionally fetches each signed
audio URL, submits signed delivery callbacks, repeats/queries/cancels the request
and replays confirmation events to test deduplication. It checks that a repeat did
not replace the case summary or change the reply. No real messages are sent.

Artifacts are under `backend/data/whatsapp-twilio-demo/`, with `latest-demo.json`
and `legal-reply.mp3` available after a successful run. Provider contracts tested
this way do not establish successful real Twilio delivery.

## Troubleshooting

- **Console does not open:** use <https://console.twilio.com/> in your normal
  browser. This does not depend on the project backend or model setup.
- **No reply:** check sandbox membership, available Twilio account/trial access,
  the saved callback method, and that the backend and tunnel terminals are running.
- **401 callback:** compare `PUBLIC_BASE_URL` with the exact callback origin and
  verify the Auth Token belongs to the configured Account SID. Do not disable
  signature checks as a workaround.
- **502 from the tunnel:** its target backend is not reachable on the configured
  local port. Start the backend and align `WHATSAPP_PORT` with the tunnel command.
- **Audio URL rejected:** inspect Twilio's delivery diagnostics without publishing
  credentials or signed URLs. Ensure the current public origin serves the signed
  MP3 with the correct `audio/mpeg` content type.
- **ASR cannot understand:** send a shorter, clearer English voice note. The system
  retains the current stage and asks for a repeat when processing fails. Verify
  proper names in the readback; model transcription is not guaranteed accurate.

Official references: [sandbox setup](https://www.twilio.com/docs/whatsapp/sandbox),
[request validation](https://www.twilio.com/docs/usage/webhooks/webhooks-security),
[media support](https://www.twilio.com/docs/whatsapp/guidance-whatsapp-media-messages).
