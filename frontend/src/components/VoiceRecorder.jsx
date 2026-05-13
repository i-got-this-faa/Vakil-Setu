import { useRef, useState } from "react";
import { bcp47FromUiLanguage } from "../utils/webSpeech";

export default function VoiceRecorder({ onSubmit }) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("auto");
  const transcriptRef = useRef("");
  const recognitionRef = useRef(null);

  const vakilMessage = isRecording
    ? "I'm listening... tell me everything."
    : transcript
      ? "Got it! Tap Submit when you're ready."
      : "Welcome! Tell me your case.";

  const canSubmit = Boolean(transcript.trim()) && !isRecording;

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
          "network": "Speech recognition network error."
        };
        setError(hints[code] || `Speech recognition error: ${code}`);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      transcriptRef.current = "";
      setTranscript("");
      setError("");
      setIsRecording(true);
      recognition.start();
    } catch (_err) {
      setError("Could not start speech recognition.");
    }
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const submitTranscript = () => {
    const text = transcript.trim();
    if (!text || isRecording) return;
    onSubmit?.(text, preferredLanguage);
  };

  return (
    <section className="vakeel-ui animate-in">
      <div className="vakeel-main">
        <div className="vakeel-left">
          <svg className="vakeel-avatar-svg" viewBox="0 0 280 400" xmlns="http://www.w3.org/2000/svg">
            <circle cx="140" cy="100" r="45" fill="#F5DEB3" />
            <path d="M95 100 Q95 60 140 55 Q185 60 185 100" fill="#2C2C2A" />
            <path
              d="M125 115 Q140 125 155 115"
              stroke="#2C2C2A"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="125" cy="95" r="4" fill="#2C2C2A" />
            <circle cx="155" cy="95" r="4" fill="#2C2C2A" />
            <rect x="90" y="150" width="100" height="80" rx="8" fill="#1a3a52" />
            <rect x="100" y="155" width="80" height="40" fill="#FFFFFF" />
            <polygon points="135,165 145,165 140,185" fill="#DC143C" />
            <line x1="90" y1="170" x2="60" y2="200" stroke="#F5DEB3" strokeWidth="12" strokeLinecap="round" />
            <circle cx="55" cy="205" r="10" fill="#F5DEB3" />
            <g className={isRecording ? "vakil-wave-arm" : ""}>
              <line
                x1="190"
                y1="170"
                x2="220"
                y2="140"
                stroke="#F5DEB3"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <circle cx="225" cy="135" r="10" fill="#F5DEB3" />
            </g>
            <circle cx="140" cy="240" r="20" fill="#0C447C" stroke="#E6F1FB" strokeWidth="2" />
            <text x="140" y="247" fontSize="12" fontWeight="700" fill="white" textAnchor="middle">
              ⚖
            </text>
          </svg>
          <div className="vakil-bubble-card">
            <p>{vakilMessage}</p>
          </div>
        </div>

        <div className="vakeel-right">
          <div className="messages-box">
            <div className="message-item">
              <div className="message-avatar vakil">⚖</div>
              <div className="message-bubble vakil">
                Welcome to Vakeel AI! I'm here to help you understand your legal issue quickly.
              </div>
            </div>
            <div className="message-item">
              <div className="message-avatar vakil">⚖</div>
              <div className="message-bubble vakil">
                <strong>Example:</strong> Employer refusing medical bill payment after workplace injury.
              </div>
            </div>
            {transcript ? (
              <div className="message-item user">
                <div className="message-bubble user">{transcript}</div>
                <div className="message-avatar user">👤</div>
              </div>
            ) : null}
          </div>

          <div className="controls-box">
            <div className="language-label">Select language</div>
            <div className="language-row">
              <button
                className={`lang-btn ${preferredLanguage === "auto" ? "active" : ""}`}
                onClick={() => setPreferredLanguage("auto")}
                disabled={isRecording}
                type="button"
              >
                Auto
              </button>
              <button
                className={`lang-btn ${preferredLanguage === "hindi" ? "active" : ""}`}
                onClick={() => setPreferredLanguage("hindi")}
                disabled={isRecording}
                type="button"
              >
                Hindi
              </button>
              <button
                className={`lang-btn ${preferredLanguage === "english" ? "active" : ""}`}
                onClick={() => setPreferredLanguage("english")}
                disabled={isRecording}
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
                >
                  🎤
                </button>
              </div>
            </div>
            <p className={`recording-status ${isRecording ? "recording" : ""}`}>
              {isRecording ? "Listening… speak now (browser speech)" : "Tap mic to dictate"}
            </p>
            <p className="recording-info">Uses your browser • Chrome / Edge recommended</p>
            <button className="submit-btn" type="button" disabled={!canSubmit} onClick={submitTranscript}>
              Submit
            </button>
          </div>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
