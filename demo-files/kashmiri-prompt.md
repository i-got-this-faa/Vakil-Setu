Add Kashmiri (ks) language support to this app: the user speaks Kashmiri, the app understands it, answers, and speaks the answer back in Kashmiri. First read the codebase to find how languages, speech-to-text, AI replies and text-to-speech are currently done, and follow the existing patterns. Keep all API keys on the server, never in the client.

## The pipeline to build

1. Speech -> text: Bhashini (Dhruva) ASR
2. Answer: the app's existing LLM, but have it write the reply in simple English
3. English -> Kashmiri: Bhashini IndicTrans2 translation
4. Kashmiri text -> speech: Google Gemini TTS (Bhashini has NO Kashmiri voice)

Reason for steps 2-3: LLMs write Kashmiri (a low-resource language) poorly; IndicTrans2 is trained on Kashmiri. If translation fails, show the English reply rather than nothing.

## Verified API details (tested November 2026)

All Bhashini calls: POST https://dhruva-api.bhashini.gov.in/services/inference/pipeline
Header: `Authorization: <BHASHINI_API_KEY>` (raw key, no "Bearer"), `Content-Type: application/json`.

### 1. Speech-to-text (Kashmiri works on the multilingual Indo-Aryan model; there is no Kashmiri-only model)
```json
{ "pipelineTasks": [{ "taskType": "asr", "config": {
    "language": { "sourceLanguage": "ks" },
    "serviceId": "ai4bharat/conformer-multilingual-indo_aryan-gpu--t4",
    "audioFormat": "wav", "samplingRate": 16000 } }],
  "inputData": { "audio": [{ "audioContent": "<base64 audio>" }] } }
```
Text is at `pipelineResponse[0].output[0].source` (Perso-Arabic script). Send 16 kHz mono audio. Supported audioFormat values: wav, m4a, mp3, ogg, webm (raw AAC/ADTS is rejected).

### 3. Translation English -> Kashmiri
```json
{ "pipelineTasks": [{ "taskType": "translation", "config": {
    "language": { "sourceLanguage": "en", "targetLanguage": "ks" },
    "serviceId": "ai4bharat/indictrans-v2-all-gpu--t4" } }],
  "inputData": { "input": [{ "source": "When did this happen?" }] } }
```
Result at `pipelineResponse[0].output[i].target`. Output is always Perso-Arabic script, even if you ask for Devanagari. You can send several sentences in one request (one per `input` item).

### 4. Text-to-speech: Gemini (Bhashini TTS returns HTTP 500 for "ks")
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-lite-tts:generateContent
Header: `x-goog-api-key: <GEMINI_API_KEY>`
```json
{ "contents": [{ "parts": [{ "text": "<Kashmiri text>" }] }],
  "generationConfig": { "responseModalities": ["AUDIO"],
    "speechConfig": { "voiceConfig": { "prebuiltVoiceConfig": { "voiceName": "Charon" } } } } }
```
Audio is at `candidates[0].content.parts[*].inlineData` with `{ mimeType, data(base64) }`.
- If mimeType starts with `audio/wav`, it is already a WAV (24 kHz, mono, 16-bit).
- If it is `audio/L16;codec=pcm;rate=24000`, it is raw PCM: wrap it in a 44-byte WAV header yourself using the rate from the mimeType.
- Takes about 5-12 s per sentence. `gemini-3.8-flash-tts` also works. Voices: Charon/Orus/Fenrir are male, Kore/Aoede are female.
- Google's docs list Kashmiri (Arab and Deva script) as supported by both gemini-3.8-flash-tts and gemini-3.8-flash-lite-tts.

## Implementation requirements

- Server side: one function per step; time out each external call (about 15-20 s) and fail gracefully.
- Split replies into sentences and speak them one at a time: start generating sentence 2 while sentence 1 plays.
- Cache each generated audio clip by hash(voice + language + text) so replays are instant and do not use quota again.
- Rate-limit new TTS clips per hour: Gemini TTS uses the same Google account quota as the LLM.
- On a 429 (quota) response, try the next API key if several are configured.
- UI: add Kashmiri to the language picker with its own name "کٲشُر", and use right-to-left layout (like Urdu) when it is selected.
- Translate the app's UI strings into Kashmiri with the IndicTrans2 call above, then check by hand: in our run "Press and speak" came out as "Press and listen" (بوزن means listen; use "دبٲیو تہٕ ونِو"), and "What should we call you?" was translated as a phone call (use "تُہُنٛد ناو کیا چھُ؟"). Mark the strings as a draft needing review by a native Kashmiri speaker.

## Tests to write (mock all network calls)

- A Kashmiri request asks the LLM for an English reply, then calls Bhashini translation with sourceLanguage "en", targetLanguage "ks", and stores the Kashmiri text.
- Kashmiri TTS calls Gemini (not Bhashini), wraps raw PCM into a valid WAV header (check "RIFF" and the 24000 sample rate), and a second identical request is served from cache with no new network call.
- If the first Gemini key returns 429, the next key is used; if none work, the result is a clear "unavailable" instead of a crash.
- Other languages are unchanged.

## How to verify for real (uses a little quota)

1. Generate Kashmiri speech with Gemini TTS for: "ہیلو، بہٕ کتھ کٔنۍ ہؠکہٕ تۄہہ مدد کٔرتھ؟"
2. Convert it to 16 kHz mono WAV and send it to the Bhashini ASR call. The transcript should closely match the original sentence (this is a round-trip check).
3. Send one Kashmiri question end to end and play the spoken reply.

Report what you changed, the test results, and anything you could not verify.
