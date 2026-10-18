import { useEffect, useRef, useState } from "react";
import ChatTypingIndicator from "./ChatTypingIndicator";
import { useAppState } from "../state/AppContext";
import { bcp47FromUiLanguage } from "../utils/webSpeech";

function CompactMessage({ message, isLatestAnalysis }) {
  if (message.role === "user") {
    return (
      <div className="followup-msg followup-msg--user">
        <span className="followup-msg-label">You</span>
        <p>{message.content}</p>
      </div>
    );
  }

  const domain = message.classification?.domain_label;
  return (
    <div className={`followup-msg followup-msg--ai ${isLatestAnalysis ? "is-latest" : ""}`}>
      <span className="followup-msg-label">{domain ? `Vakil AI · ${domain}` : "Vakil AI"}</span>
      <p>{message.content}</p>
    </div>
  );
}

export default function FollowUpChat({
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
  const [expanded, setExpanded] = useState(true);
  const listRef = useRef(null);
  const recognitionRef = useRef(null);

  const hi = lang === "hi";
  const L = hi
    ? {
        title: "और सवाल पूछें",
        placeholder: "जैसे — कौन से दस्तावेज़ चाहिए?",
        send: "भेजें",
        sending: "भेज रहे हैं…",
        mic: "बोलें",
        collapse: "छुपाएं",
        expand: "चैट दिखाएं"
      }
    : {
        title: "Ask a follow-up",
        placeholder: "e.g. What documents do I need for court?",
        send: "Send",
        sending: "Sending…",
        mic: "Voice",
        collapse: "Hide",
        expand: "Show chat"
      };

  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  useEffect(() => {
    if (expanded && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isSubmitting, expanded, text]);

  const toggleMic = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError(hi ? "क्रोम या एज आज़माएं" : "Try Chrome or Edge for voice");
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

  const hasHistory = messages.length > 0;

  return (
    <section className="followup-chat">
      <button
        type="button"
        className="followup-chat-toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="followup-chat-toggle-title">{L.title}</span>
        <span className="followup-chat-toggle-hint">
          {expanded ? L.collapse : L.expand}
          {hasHistory ? ` · ${messages.length} messages` : ""}
        </span>
      </button>

      {expanded ? (
        <div className="followup-chat-body">
          {hasHistory ? (
            <div className="followup-thread" ref={listRef}>
              {messages.map((msg) => (
                <CompactMessage
                  key={msg.id}
                  message={msg}
                  isLatestAnalysis={msg.id === lastAssistantId}
                />
              ))}
              {isSubmitting ? <ChatTypingIndicator label={loadingLabel} /> : null}
            </div>
          ) : (
            <p className="followup-hint muted">
              {hi
                ? "नीचे लिखें या माइक से पूछें — पूरा इतिहास सुरक्षित रहेगा।"
                : "Type below or use the mic — we keep your full conversation."}
            </p>
          )}

          <form className="followup-compose" onSubmit={handleSubmit}>
            <div className="followup-lang">
              {["auto", "hindi", "english"].map((code) => (
                <button
                  key={code}
                  type="button"
                  className={`followup-lang-btn ${preferredLanguage === code ? "active" : ""}`}
                  onClick={() => setPreferredLanguage(code)}
                  disabled={isSubmitting}
                >
                  {code === "auto" ? "Auto" : code === "hindi" ? "हिं" : "EN"}
                </button>
              ))}
            </div>
            <div className="followup-input-row">
              <textarea
                className="followup-input"
                rows={2}
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
              <div className="followup-actions">
                <button
                  type="button"
                  className={`followup-mic ${isRecording ? "recording" : ""}`}
                  onClick={toggleMic}
                  disabled={isSubmitting}
                  title={L.mic}
                  aria-label={L.mic}
                >
                  🎤
                </button>
                <button
                  type="submit"
                  className={`followup-send ${isSubmitting ? "is-loading" : ""}`}
                  disabled={!text.trim() || isSubmitting}
                >
                  {isSubmitting ? L.sending : L.send}
                </button>
              </div>
            </div>
            {micError ? <p className="followup-mic-error">{micError}</p> : null}
          </form>
        </div>
      ) : null}
    </section>
  );
}
