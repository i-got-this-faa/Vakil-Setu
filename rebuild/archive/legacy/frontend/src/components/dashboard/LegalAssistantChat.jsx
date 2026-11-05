import { useEffect, useRef, useState } from "react";
import ChatTypingIndicator from "../ChatTypingIndicator";
import { useAppState } from "../../state/AppContext";
import { bcp47FromUiLanguage } from "../../utils/webSpeech";

function formatTime(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function ChatMessage({ message, isLatest }) {
  const isUser = message.role === "user";
  const domain = message.classification?.domain_label;

  return (
    <div className={`legal-msg legal-msg--${isUser ? "user" : "assistant"}`}>
      <div className="legal-msg-meta">
        <span>{isUser ? "You" : domain ? `Vakil AI · ${domain}` : "Vakil AI"}</span>
        <time dateTime={new Date(message.createdAt).toISOString()}>{formatTime(message.createdAt)}</time>
      </div>
      <p className={`legal-msg-bubble ${isLatest && !isUser ? "is-latest" : ""}`}>{message.content}</p>
    </div>
  );
}

const SUGGESTIONS_EN = [
  "What documents do I need?",
  "What are my next legal steps?",
  "How urgent is my case?",
  "Can I get a fee estimate?"
];

const SUGGESTIONS_HI = [
  "मुझे कौन से दस्तावेज़ चाहिए?",
  "अगले कानूनी कदम क्या हैं?",
  "मेरा मामला कितना जरूरी है?",
  "फीस का अनुमान मिल सकता है?"
];

export default function LegalAssistantChat({
  messages = [],
  onSubmit,
  isSubmitting = false,
  loadingLabel = "Thinking…",
  lang = "en"
}) {
  const { preferredLanguage, setPreferredLanguage } = useAppState();
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState("");
  const listRef = useRef(null);
  const fileRef = useRef(null);
  const recognitionRef = useRef(null);

  const hi = lang === "hi";
  const L = hi
    ? {
        title: "कानूनी सहायक",
        sub: "अपने मामले पर और सवाल पूछें",
        placeholder: "अपना सवाल लिखें…",
        attach: "फ़ाइल संलग्न करें",
        mic: "बोलकर पूछें",
        send: "भेजें",
        online: "ऑनलाइन"
      }
    : {
        title: "Legal assistant",
        sub: "Ask follow-up questions about your case",
        placeholder: "Ask anything about your case…",
        attach: "Attach file",
        mic: "Voice input",
        send: "Send",
        online: "Online"
      };

  const suggestions = hi ? SUGGESTIONS_HI : SUGGESTIONS_EN;
  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;
  const hasHistory = messages.length > 0;

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isSubmitting, text]);

  const toggleMic = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError(hi ? "वॉइस के लिए Chrome या Edge आज़माएं" : "Try Chrome or Edge for voice input");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = bcp47FromUiLanguage(preferredLanguage);
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      let chunk = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        chunk += event.results[i][0].transcript;
      }
      setText((prev) => `${prev} ${chunk}`.trim());
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    setMicError("");
    setIsRecording(true);
    recognition.start();
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSubmitting) return;
    onSubmit?.(trimmed, preferredLanguage);
    setText("");
  };

  const handleChip = (chip) => {
    if (isSubmitting) return;
    onSubmit?.(chip, preferredLanguage);
  };

  const handleAttach = () => {
    fileRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setText((prev) =>
      `${prev} ${hi ? `[संलग्न: ${file.name}]` : `[Attached: ${file.name}]`}`.trim()
    );
    e.target.value = "";
  };

  return (
    <section className="legal-chat dash-fade-in" aria-labelledby="legal-chat-title">
      <div className="legal-chat-shell">
        <header className="legal-chat-header">
          <div>
            <h2 id="legal-chat-title">{L.title}</h2>
            <p>{L.sub}</p>
          </div>
          <span className="legal-chat-status">{L.online}</span>
        </header>

        <div className="legal-chat-thread" ref={listRef}>
          {!hasHistory ? (
            <div className="legal-chat-empty">
              <p>
                {hi
                  ? "नीचे सुझाए गए प्रश्न चुनें या अपना सवाल लिखें।"
                  : "Pick a suggested question or type your own below."}
              </p>
              <div className="legal-chat-suggestions">
                {suggestions.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="legal-chat-chip"
                    onClick={() => handleChip(chip)}
                    disabled={isSubmitting}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isLatest={msg.id === lastAssistantId}
              />
            ))
          )}
          {isSubmitting ? <ChatTypingIndicator label={loadingLabel} /> : null}
        </div>

        <form className="legal-chat-compose" onSubmit={handleSubmit}>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            hidden
            onChange={handleFileChange}
          />
          <div className="legal-chat-input-wrap">
            <textarea
              className="legal-chat-input"
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={L.placeholder}
              disabled={isSubmitting}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <div className="legal-chat-input-actions">
              <button
                type="button"
                className="legal-chat-icon-btn"
                onClick={handleAttach}
                disabled={isSubmitting}
                title={L.attach}
                aria-label={L.attach}
              >
                📎
              </button>
              <button
                type="button"
                className={`legal-chat-icon-btn ${isRecording ? "recording" : ""}`}
                onClick={toggleMic}
                disabled={isSubmitting}
                title={L.mic}
                aria-label={L.mic}
              >
                🎤
              </button>
              <button
                type="submit"
                className="legal-chat-send"
                disabled={!text.trim() || isSubmitting}
                title={L.send}
                aria-label={L.send}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
          {micError ? <p className="legal-chat-mic-error">{micError}</p> : null}
        </form>
      </div>
    </section>
  );
}
