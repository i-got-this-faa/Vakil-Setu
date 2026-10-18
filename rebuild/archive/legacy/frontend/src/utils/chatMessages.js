const STORAGE_KEY = "vakil-setu-chat-v1";
const SESSION_KEY = "vakil-setu-session-v1";

export function createMessage(role, content, extra = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content: String(content || "").trim(),
    createdAt: Date.now(),
    ...extra
  };
}

export function assistantFromClassification(classification) {
  if (!classification) return "";
  return classification.summary || "";
}

export function loadChatFromStorage() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveChatToStorage(messages) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    /* quota or private mode */
  }
}

export function clearChatStorage() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function loadSessionFromStorage() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSessionToStorage({ classification, advocates, ttsLang, voiceText }) {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ classification, advocates, ttsLang, voiceText })
    );
  } catch {
    /* ignore */
  }
}

/** Shape sent to API: { role, content } */
export function historyForApi(messages) {
  return messages
    .filter((m) => m.content && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({ role: m.role, content: m.content }));
}
