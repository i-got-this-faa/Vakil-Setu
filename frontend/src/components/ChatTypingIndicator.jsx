export default function ChatTypingIndicator({ label = "Analyzing your case…" }) {
  return (
    <div className="message-item typing-indicator" aria-live="polite" aria-busy="true">
      <div className="message-avatar legal" aria-hidden="true">
        ⚖
      </div>
      <div className="message-bubble legal typing-bubble">
        <span className="typing-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="typing-label">{label}</span>
      </div>
    </div>
  );
}
