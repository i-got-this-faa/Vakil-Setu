# Reply audio: device voice and ElevenLabs natural voice

## What is implemented

- **Device voice** (default): the browser's own speech synthesis reads a reply. No text is sent to a server. The control is labelled "Device voice" and availability depends on the browser and device.
- **Natural voice (ElevenLabs)**: an explicit, separate opt-in per session. The server sends only the text of the persisted assistant reply, resolved from the owner's chat turn, to `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` with model `eleven_multilingual_v2`. It is never used as a separate reasoning agent: the reply text is the one produced by the existing grounded legal chat, with its citations.
- Audio is played only after an explicit press. Nothing autoplays. Playback is reported as "playing" only when the audio element reports it. Stop, replay, and cleanup on user, case or route change are supported. Cached audio is revoked from memory when scope changes.

Backend: `convex/speech.ts` (public `capabilities` query and `synthesize` action), `convex/speechState.ts` (ownership, consent audit, rate and in-flight limits), `convex/lib/speech.ts` (policy and provider call). Frontend: `src/services/speechPlayback.js` (pure controller), `src/state/SpeechContext.jsx`, `src/components/ReplySpeech.jsx`, `src/components/SpeechConsent.jsx`.

## Safety rules enforced on the server

- Caller must own the chat turn; other accounts get `NOT_FOUND` and nothing is dispatched.
- `consent` must be the literal `true`; the consent audit row (`speechConsents`) is written before the outbound request.
- Text is read from the stored reply and capped at 8,000 characters. The client never supplies text.
- Limits: 2 MiB audio, 20 s deadline, 30 requests per account per hour, one in-flight request per reply per 60 s.
- Fixed HTTPS endpoint, `redirect: "error"`, API key only in the `xi-api-key` header, provider bodies never returned.
- Only MP3 responses are accepted (ID3 or MPEG frame sync).

## Languages

| Language | Device voice | Natural voice (ElevenLabs) |
|---|---|---|
| English | yes (device-dependent) | yes |
| Hindi | yes (device-dependent) | yes (listed for `eleven_multilingual_v2`) |
| Punjabi | depends on installed voices | **no**: `eleven_multilingual_v2` does not list Punjabi. The server blocks it and the UI says so. |

Source: ElevenLabs model documentation (`eleven_multilingual_v2` lists 29 languages including English and Hindi, not Punjabi). The Punjabi entry was checked against that list on the date of implementation; re-check before enabling it.

## Setup

1. In the hosted Convex deployment (not in the frontend), set:
   - `ELEVENLABS_API_KEY`: a private key from the ElevenLabs dashboard.
   - `ELEVENLABS_VOICE_ID`: a voice ID from your ElevenLabs voice library. No default voice is shipped.
2. Redeploy functions with your usual process. This change was **not deployed** by the implementer.
3. Without both variables, `speech.capabilities` reports `configured: false` and the chat keeps working with the device voice.

No secret reaches the frontend. `speech.capabilities` returns only the model, languages and limits.

## Avatar artwork

The website's current avatar is "Meera", a single front-facing smiling portrait (`frontend/public/avatar/meera-portrait-front-smiling.png`), cropped with Pillow from the character sheet `frontend/public/avatar/meera-character-sheet.webp` (bottom-middle cell). The configuration is in `frontend/src/config/avatarAssets.js` (`kind: "static"`).

- A single still image cannot show lip movement or blinking. In static mode `VakilAvatar` runs no mouth or blink timers. The speaking state is only the existing CSS indicator (`.vakil-3d-avatar.is-talking`), which is driven by real audio playback in `SpeechContext`.
- The earlier Blender stills (`frontend/public/avatar/vakil-idle|talk|blink.png`, plus `vakil.glb` and `avatar/build_avatar.py`) are kept as an optional fallback: `VAKIL_AVATAR_BLENDER_STILLS` in `avatarAssets.js`, with `kind: "frames"`. Those stills get a cosmetic mouth and blink frame swap while audio plays, which is not phoneme-level lip sync.
- To replace the artwork, export a PNG or JPG still, place it in `frontend/public/avatar/`, and update `VAKIL_AVATAR` in `avatarAssets.js`. Do not use screenshots of a tool's UI as artwork.
- ElevenLabs Avatars (Image & Video) creates generated talking-head videos in the web app ("Create Lip Sync"). The docs state that API access is "Not available at launch; planned for future release", so this site cannot generate them programmatically.
- A pre-rendered talking-head clip cannot be synchronised to this site's generated replies. Use it only as an explicitly non-lip-synced decoration, never described as lip sync.
- The ElevenLabs LiveAvatar integration is a realtime session that runs an ElevenLabs Agent. It would bypass the legal retrieval and citation pipeline and bills per session minute. It is not used here.
- Natural-voice replies still need the server setup in "Setup" above (`ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in the hosted Convex deployment). The static portrait does not change that: audio playback is the only thing that drives the speaking indicator.

## Unverified and not run

- No live ElevenLabs request was made. Every provider interaction in the tests is mocked.
- The MP3 sanity check and the 2 MiB cap were chosen from the documented output format, not from measured reply lengths.
- No hosted deployment, hosted mutation or paid TTS call was run. Live checks remain: configure keys in a dev deployment, play one Hindi and one English reply, confirm the consent row appears and the reply audio is audible.
- Browser autoplay and device-voice behaviour were tested only through the controller with injected fakes, not in a real browser.
