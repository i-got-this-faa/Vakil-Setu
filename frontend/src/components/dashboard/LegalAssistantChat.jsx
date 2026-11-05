import LegalEvidence from "../LegalEvidence";
import { useEffect, useRef, useState } from "react";
import ChatTypingIndicator from "../ChatTypingIndicator";
import { useAppState } from "../../state/AppContext";
import { useDictation } from "../../hooks/useDictation";

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
        <span>{isUser ? "You" : domain ? `Legal-Setu AI · ${domain}` : "Legal-Setu AI"}</span>
        <time dateTime={new Date(message.createdAt).toISOString()}>{formatTime(message.createdAt)}</time>
      </div>
      <p className={`legal-msg-bubble ${isLatest && !isUser ? "is-latest" : ""}`}>{message.content}</p>
      <LegalEvidence message={message} />
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
  const { isRecording, phase, error: micError, start, stop } = useDictation({ text, setText, language: preferredLanguage });
  const listRef = useRef(null);
  const fileRef = useRef(null);

  const hi = lang === "hi";
  const L = hi
    ? {
        title: "कानूनी सहायक",
        sub: "अपने मामले पर और सवाल पूछें",
        placeholder: "अपना सवाल लिखें…",
        attach: "फ़ाइल संलग्न करें",
        mic: "बोलकर पूछें",
        send: "भेजें",
        online: "भेजने से पहले जाँचें"
      }
    : {
        title: "Legal assistant",
        sub: "Ask follow-up questions about your case",
        placeholder: "Ask anything about your case…",
        attach: "Attach file",
        mic: "Voice input",
        send: "Send",
        online: "Review before sending"
      };

  const suggestions = hi ? SUGGESTIONS_HI : SUGGESTIONS_EN;
  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;
  const hasHistory = messages.length > 0;

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isSubmitting, text]);

  const toggleMic = () => isRecording ? stop() : start();

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSubmitting || isRecording) return;
    onSubmit?.(trimmed, preferredLanguage);
    setText("");
  };

  const handleChip = (chip) => {
    if (isSubmitting || isRecording) return;
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
                    disabled={isSubmitting || isRecording}
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
          <label>Speech and response language
            <select value={preferredLanguage} disabled={isRecording || isSubmitting} onChange={e => setPreferredLanguage(e.target.value)}>
              <option value="auto">Browser language</option><option value="hindi">Hindi</option><option value="english">English</option>
            </select>
          </label>
          {isRecording ? <p role="status">{phase === "stopping" ? "Finishing transcript..." : "Listening - stop to review the transcript."}</p> : null}
          <div className="legal-chat-input-wrap">
            <textarea
              className="legal-chat-input"
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={L.placeholder}
              disabled={isSubmitting || isRecording}
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
                disabled={isSubmitting || isRecording}
                title={L.attach}
                aria-label={L.attach}
              >
                📎
              </button>
              <button
                type="button"
                className={`legal-chat-icon-btn ${isRecording ? "recording" : ""}`}
                onClick={toggleMic}
                disabled={isSubmitting || phase === "stopping"}
                title={L.mic}
                aria-label={L.mic}
              >
                🎤
              </button>
              <button
                type="submit"
                className="legal-chat-send"
                disabled={!text.trim() || isSubmitting || isRecording}
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
