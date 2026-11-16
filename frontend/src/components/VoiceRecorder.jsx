import { useEffect, useLayoutEffect, useRef, useState } from "react";
import LegalEvidence from "./LegalEvidence";
import ChatTypingIndicator from "./ChatTypingIndicator";
import { useAppState } from "../state/AppContext";
import { useDictation } from "../hooks/useDictation";
import { useSpeech } from "../state/SpeechContext";

function WaveIcon() {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 10v4M8 6v12M12 3v18M16 6v12M20 10v4" /></svg>;
}
function SendIcon() {
  return <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="m3 3 19 9-19 9 4-9-4-9Z"/><path d="M7 12h15"/></svg>;
}
function ChatBubble({ message }) {
  const user = message.role === "user";
  const domain = message.classification?.domain_label || message.classification?.domain;
  return <div className={`messenger-message ${user ? "from-user" : "from-guide"}`}>
    <div className="messenger-bubble">
      {!user && domain && <span className="messenger-category">{domain}</span>}
      <p>{message.content}</p>
      {!user && <LegalEvidence message={message}/>}
      <div className="messenger-message-meta">{user ? "You" : "Legal-Setu AI"}{message.createdAt && <time dateTime={new Date(message.createdAt).toISOString()}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>}</div>
    </div>
  </div>;
}
export default function VoiceRecorder({ messages = [], onSubmit, isSubmitting = false, loadingLabel = "Thinking…", languageLocked = false, canSubmit = true, onDraftChange, onSavePrivate }) {
  const { preferredLanguage, setPreferredLanguage } = useAppState();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const speech = useSpeech();
  // Talking state comes from real audio playback (see SpeechContext), not from polling the browser voice.
  const speaking = speech.playback.status === "playing";
  // Dictation stops any reply audio first, so the microphone never records the assistant.
  const voice = useDictation({ text, setText, language: preferredLanguage, stopPlayback: speech.stop });
  const thread = useRef(null);
  const input = useRef(null);
  const canSend = !saving && canSubmit && Boolean(text.trim()) && !voice.isRecording && !isSubmitting;
  useEffect(() => { if (thread.current) thread.current.scrollTop = thread.current.scrollHeight; }, [messages, isSubmitting]);
  useLayoutEffect(() => {
    if (input.current) { input.current.style.height = "auto"; input.current.style.height = `${Math.min(input.current.scrollHeight, 116)}px`; }
  }, [text]);
  useEffect(() => { onDraftChange?.(); }, [text]);
  async function send(event) {
    event?.preventDefault();
    if (!canSend) return;
    const accepted = await onSubmit?.(text.trim(), preferredLanguage); if (accepted !== false) setText("");
    input.current?.focus();
  }
  const status = isSubmitting ? loadingLabel : voice.phase === "stopping" ? "Finishing voice input…" : voice.isRecording ? "Listening to you…" : speaking ? "Speaking…" : "Your legal assistant";
  return <section className="conversation-chat" aria-label="Chat with your legal assistant">
    <header className="messenger-header">
      <div className="messenger-contact">
        <div><h2>Legal-Setu AI</h2><p role="status">{status}</p></div>
      </div>
      <label className="messenger-language"><span>Language</span><select aria-label="Conversation language" value={preferredLanguage} onChange={event => setPreferredLanguage(event.target.value)} disabled={languageLocked || saving || voice.isRecording || isSubmitting}><option value="auto">Browser language</option><option value="english">English</option><option value="hindi">हिन्दी / Hindi</option><option value="punjabi">ਪੰਜਾਬੀ / Punjabi (device support)</option></select></label>
    </header>
    <div ref={thread} className={`messenger-thread ${messages.length ? "has-messages" : ""}`} role="log" aria-label="Conversation messages" aria-live="polite">
      {!messages.length && <div className="messenger-welcome">
        <h3>Let’s talk about it.</h3>
        <p>Tell me what happened, in your own words.<br/>Type a message or use voice input below.</p>
        <span className="messenger-example">For example: Employer refusing medical bill payment after a workplace injury.</span>
      </div>}
      {messages.map(message => <ChatBubble key={message.id} message={message}/>)}
      {isSubmitting && <ChatTypingIndicator label={loadingLabel}/>}
    </div>
    <div className="messenger-composer-area">
      {voice.isRecording && <div className="messenger-recording" role="status">
        <span className="messenger-recording-dot"/>
        <div className="messenger-waveform" aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i} style={{'--wave-height':`${8+(i*13%20)}px`,'--wave-delay':`${i*.06}s`}}/>)}</div>
        <span>{voice.phase === "stopping" ? "Finishing…" : "Listening…"}</span>
        <button type="button" onClick={voice.cancel}>Cancel</button>
      </div>}
      {voice.error && <p className="messenger-error" role="alert">{voice.error}</p>}
      <form className={`messenger-composer ${voice.isRecording ? "is-recording" : ""}`} onSubmit={send}>
        <button className={`messenger-voice-button ${voice.isRecording ? "is-recording" : ""}`} type="button" aria-label={voice.isRecording ? "Stop voice input" : "Start voice input"} title={voice.isRecording ? "Stop and review your words" : "Use voice input"} onClick={voice.isRecording ? voice.stop : voice.start} disabled={saving || isSubmitting || voice.phase === "stopping"}>{voice.isRecording ? <span className="messenger-stop-icon"/> : <WaveIcon/>}</button>
        <label className="messenger-sr-only" htmlFor="case-message">Message</label>
        <textarea ref={input} id="case-message" rows={1} maxLength={4000} value={text} onChange={event => { setText(event.target.value); onDraftChange?.(); }} placeholder={voice.isRecording ? "Your words appear here…" : "Type a message…"} disabled={saving || voice.isRecording || isSubmitting} onKeyDown={event => { if(event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) send(event); }}/>
        {onSavePrivate && <button type="button" className="secondary-btn" disabled={saving || !text.trim() || voice.isRecording || isSubmitting} onClick={async () => { setSaving(true); try { if (await onSavePrivate(text.trim(), preferredLanguage)) setText(""); } finally { setSaving(false); } }}>{saving ? "Saving…" : "Save privately"}</button>}
        <button className="messenger-send-button" type="submit" aria-label="Send message" title="Send message" disabled={!canSend}><SendIcon/></button>
      </form>
      <p className="messenger-composer-hint">{voice.isRecording ? "Stop voice input, review your words, then send." : "Enter to send · Shift + Enter for a new line · Voice uses your browser"}</p>
    </div>
  </section>;
}
