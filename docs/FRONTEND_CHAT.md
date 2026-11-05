# Legal-Setu chat interface

The landing page links to the dedicated `/chat` route. The conversation itself
contains the existing animated avatar, a language selector, message history, source
citations and a messaging-style input bar. The waveform button uses browser speech
recognition to produce editable text; it does not send recorded audio notes.
The ElevenLabs identifier shared during development has not been integrated.

The microphone sidebar has been removed. Voice input can be stopped and reviewed
or cancelled without losing a preceding typed draft. Text uses Enter to send and
Shift+Enter for a newline. Browser/device speech availability still applies.

The summary and advocate list remain explicit navigation. New Case clears the
active session, draft and playback and ignores stale responses/errors from the
previous case. Chat data stays in the current tab's session storage; multiple
saved chat histories are not provided.

Styling uses the existing indigo brand with Figtree body text, Fraunces headings,
white surfaces and subtle borders, inspired by legaldeskai.in. All existing case,
profile, consultation and payment behavior remains in place.

Validation performed before publishing:

- 62 automated tests across backend and frontend pass.
- Vite production compilation passes.
- Browser checks using simulated recognition and API responses covered text
  sending, line breaks, language forwarding, voice stop/cancel/final results,
  preservation of typed drafts, permission recovery, citations and general-AI labels.
- Landing/continue chat, explicit results navigation, profile and booking entry,
  and New Case reset with pending-response isolation were verified.
- Desktop and 390/768/1024px layouts showed no horizontal overflow; the chat input
  stayed in the viewport. No browser page errors occurred in these checks.
- Earlier live English/Hindi backend checks returned cited hybrid-retrieval answers.

Simulated speech checks do not establish real microphone recognition accuracy.
API secrets, corpus downloads, vectors, model caches and databases are ignored local
files. Setup instructions are in README.md and BACKEND_RAG.md.
