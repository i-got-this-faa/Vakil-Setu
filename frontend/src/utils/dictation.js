/** One recognition session; interim hypotheses replace each other instead of accumulating. */
export function createDictation({ Recognition, language, draft, onText, onState, onError, cancelPlayback }) {
  const recognition = new Recognition();
  let active = true;
  let phase = "listening";
  let finalText = "";
  let interimText = "";
  const prefix = draft.trim();
  const publish = () => onText([prefix, finalText, interimText].filter(Boolean).join(" "));
  recognition.lang = language;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    if (!active) return;
    const final = [], interim = [];
    for (const result of Array.from(event.results)) {
      (result.isFinal ? final : interim).push(result[0].transcript.trim());
    }
    finalText = final.join(" "); interimText = interim.join(" ");
    publish();
  };
  recognition.onerror = (event) => {
    if (!active) return;
    const hints = {
      "not-allowed": "Allow microphone access in browser settings, or type your message.",
      "audio-capture": "No working microphone was found. Check your microphone selection.",
      "no-speech": "No speech was detected. Select Hindi or English and try again.",
      network: "The browser speech service could not connect. You can type instead.",
      "language-not-supported": "This speech language is unavailable. Choose another language or type."
    };
    onError(hints[event.error] || "Dictation stopped. Review the transcript before sending.");
    // Keep sending disabled until onend: browsers can still emit a final result.
    phase = "stopping"; onState(phase);
  };
  recognition.onend = () => {
    if (!active) return;
    active = false;
    if (interimText) onError("The browser did not finalize all words. Review and correct the transcript before sending.");
    publish(); onState("idle");
  };
  return {
    start() {
      cancelPlayback?.(); onError(""); onState("listening");
      try { recognition.start(); }
      catch { active = false; onState("idle"); onError("Could not start dictation. Check microphone permissions or type instead."); }
    },
    stop() {
      if (!active || phase === "stopping") return;
      phase = "stopping"; onState(phase);
      try { recognition.stop(); }
      catch { active = false; onState("idle"); onError("Dictation stopped. Review your transcript."); }
    },
    dispose() { active = false; recognition.abort(); }
  };
}
