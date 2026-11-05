# Voice and triage corrections

Updated 5 November 2026.

The website previously returned a civil-dispute template for unrecognized input when no model was configured. Its keyword fallback ignored conversation history. The language selection was not sent to the model, and both dictation interfaces had different handling of draft and interim text.

Triage now requires a configured model for analysis. A missing key, provider failure or invalid model response returns `status: unavailable`, a null domain and no matched advocates. A valid model can request clarification without assigning a legal domain. The client sends earlier turns separately from the latest question and forwards the selected response language. The local model was configured through a private credential prompt; no credentials belong in tracked files.

For Gemini, set `LLM_PROVIDER=gemini`, `LLM_API_KEY` and `GEMINI_MODEL` in ignored `backend/.env`. The local verification used `gemini-3.1-flash-lite` with low thinking. The advertised `gemini-2.5-flash` endpoint rejected generation for this account; `gemini-3.8-flash` timed out in the checks. Model availability can vary.

Both dictation interfaces now use one session controller. It preserves existing draft text, replaces interim hypotheses, cancels app playback before recognition, waits for the recognition end event before enabling Send and ignores late events after disposal. Browser language means the browser locale; select Hindi or English explicitly for speech. Review and correct the transcript before sending.

Verification: 50 automated tests passed and the Vite production build passed. Live HTTP checks against the local API confirmed that unrelated text receives clarification without advocate matches, a landlord lockout is categorized as property, a document follow-up uses prior context, and an explicit Hindi preference produces Hindi clarification. Recognizer tests use simulated events; real human microphone accuracy, device configuration and background-noise performance have not been measured.

Run checks from the repository root:

```powershell
node --test backend/test/*.test.js frontend/test/*.test.js
npm run build --prefix frontend
```

After updating, reload the website and choose New Case to remove old cached template responses. Restart the backend after editing its environment file.
