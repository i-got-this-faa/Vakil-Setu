import { useEffect, useRef, useState } from "react";
import ChatTypingIndicator from "./ChatTypingIndicator";
import VakilAvatar from "./VakilAvatar";
import { useAppState } from "../state/AppContext";
import { bcp47FromUiLanguage } from "../utils/webSpeech";

function ChatBubble({ message }) {
  if (message.role === "user") {
    return (
      <div className="message-item user">
        <div className="message-bubble user">{message.content}</div>
        <div className="message-avatar user" aria-hidden="true">
          👤
        </div>
      </div>
    );
  }

  const c = message.classification;
  const domainLabel = c?.domain_label || c?.domain;

  return (
    <div className="message-item analysis-ready">
      <div className="message-avatar vakil" aria-hidden="true">
        ⚖
      </div>
      <div className="message-bubble vakil analysis-preview">
        {domainLabel ? <span className="analysis-preview-badge">{domainLabel}</span> : null}
        <p>{message.content}</p>
      </div>
    </div>
  );
}

export default function VoiceRecorder({
  messages = [],
  onSubmit,
  isSubmitting = false,
  loadingLabel = "Analyzing your case…",
  compact = false
}) {
  const { preferredLanguage, setPreferredLanguage } = useAppState();
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const transcriptRef = useRef("");
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  const hasUserMessages = messages.some((m) => m.role === "user");
  const showWelcome = !hasUserMessages;

  const vakilMessage = isSubmitting
    ? "Working on your case — almost there."
    : isRecording
      ? "I'm listening... tell me everything."
      : transcript
        ? "Got it! Tap Submit when you're ready."
        : hasUserMessages
          ? "Ask a follow-up — I'll use our chat history."
          : "Welcome! Tell me your case.";

  const canSubmit = Boolean(transcript.trim()) && !isRecording && !isSubmitting;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, transcript, isSubmitting, loadingLabel]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const startRecording = async () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error("Web Speech API is not supported in this browser. Try Chrome or Edge.");
      }

      const recognition = new SpeechRecognition();
      recognition.lang = bcp47FromUiLanguage(preferredLanguage);
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onresult = (event) => {
        let text = "";
        for (let i = 0; i < event.results.length; i += 1) {
          text += event.results[i][0].transcript;
        }
        const cleanText = text.trim();
        transcriptRef.current = cleanText;
        setTranscript(cleanText);
      };

      recognition.onerror = (ev) => {
        const code = ev?.error || "unknown";
        const hints = {
          "not-allowed": "Microphone permission denied.",
          "no-speech": "No speech detected. Try again.",
          network: "Speech recognition network error."
        };
        setError(hints[code] || `Speech recognition error: ${code}`);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      setError("");
      setIsRecording(true);
      recognition.start();
    } catch (err) {
      setIsRecording(false);
      setError(err.message || "Could not start speech recognition. You can type your issue below.");
    }
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const submitTranscript = () => {
    const text = transcript.trim();
    if (!text || isRecording || isSubmitting) return;
    onSubmit?.(text, preferredLanguage);
    setTranscript("");
    transcriptRef.current = "";
  };

  return (
    <section
      className={`vakeel-ui animate-in ${isSubmitting ? "is-processing" : ""} ${compact ? "vakeel-ui--compact" : ""}`}
    >
      <div className="vakeel-main">
        {!compact ? (
          <div className="vakeel-left">
            <VakilAvatar talking={isRecording || isSubmitting} />
            <div className="vakil-bubble-card">
              <p>{vakilMessage}</p>
            </div>
          </div>
        ) : null}

        <div className="vakeel-right">
          <div className={`messages-box ${isSubmitting ? "is-loading" : ""} ${compact ? "messages-box--tall" : ""}`}>
            {showWelcome ? (
              <>
                <div className="message-item">
                  <div className="message-avatar vakil">⚖</div>
                  <div className="message-bubble vakil">
                    Welcome to Vakil AI! I'm here to help you understand your legal issue quickly.
                  </div>
                </div>
                <div className="message-item">
                  <div className="message-avatar vakil">⚖</div>
                  <div className="message-bubble vakil">
                    <strong>Example:</strong> Employer refusing medical bill payment after workplace
                    injury.
                  </div>
                </div>
              </>
            ) : null}

            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}

            {transcript ? (
              <div className="message-item user message-draft">
                <div className="message-bubble user">{transcript}</div>
                <div className="message-avatar user">👤</div>
              </div>
            ) : null}

            {isSubmitting ? <ChatTypingIndicator label={loadingLabel} /> : null}
            <div ref={messagesEndRef} className="messages-anchor" aria-hidden="true" />
          </div>

          <div className={`controls-box ${isSubmitting ? "is-disabled" : ""}`}>
            <div className="language-label">Select language</div>
            <div className="language-row">
              <button
                className={`lang-btn ${preferredLanguage === "auto" ? "active" : ""}`}
                onClick={() => setPreferredLanguage("auto")}
                disabled={isRecording || isSubmitting}
                type="button"
              >
                Auto
              </button>
              <button
                className={`lang-btn ${preferredLanguage === "hindi" ? "active" : ""}`}
                onClick={() => setPreferredLanguage("hindi")}
                disabled={isRecording || isSubmitting}
                type="button"
              >
                Hindi
              </button>
              <button
                className={`lang-btn ${preferredLanguage === "english" ? "active" : ""}`}
                onClick={() => setPreferredLanguage("english")}
                disabled={isRecording || isSubmitting}
                type="button"
              >
                English
              </button>
            </div>

            <div className="recording-controls">
              <div className="mic-container">
                <div className={`recording-ring ${isRecording ? "" : "inactive"}`} />
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`mic-btn ${isRecording ? "recording" : ""}`}
                  type="button"
                  disabled={isSubmitting}
                  aria-label={isRecording ? "Stop dictation" : "Start dictation"}
                  aria-busy={isRecording}
                >
                  🎤
                </button>
              </div>
            </div>
            <p className={`recording-status ${isRecording ? "recording" : ""}`}>
              {isRecording ? "Listening… speak now" : "Tap mic to dictate"}
            </p>
            <p className="recording-info">Uses your browser • Chrome / Edge recommended</p>
            <label className="label" htmlFor="case-draft">Your issue — type or edit your dictation</label>
            <textarea
              id="case-draft"
              rows={4}
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              disabled={isRecording || isSubmitting}
              placeholder="Describe what happened…"
            />
            <button
              className={`submit-btn ${isSubmitting ? "is-loading" : ""}`}
              type="button"
              disabled={!canSubmit}
              onClick={submitTranscript}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? "Analyzing…" : hasUserMessages ? "Send follow-up" : "Submit"}
            </button>
          </div>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
