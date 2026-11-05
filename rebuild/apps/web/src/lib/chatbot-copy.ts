import type { PilotLocale } from "@legal-setu/domain";

const en = {
  title: "Chat with Legal-Setu", intro: "Ask your legal question to start a private conversation.",
  question: "What would you like help with?", language: "Conversation language", send: "Send question", waiting: "Waiting for an AI reply…",
  consent: "I allow my current question to be sent to Google Gemini for preliminary legal information, not professional legal advice.",
  documents: "You can upload documents after creating the conversation.", manual: "Use manual intake", open: "Open saved conversation", newChat: "New chat", summary: "Review case summary",
  unavailable: "AI chat is currently unavailable for this language. You can still use manual intake.", loading: "Loading your conversation…", missing: "Conversation unavailable. Only its owner can open it.",
  failed: "Your question is saved. The reply could not be confirmed. Retry or open the saved conversation.", error: "The request could not be completed. Your question remains here; please retry.",
  fallback: "This interface uses English for your selected language. AI and speech support are separate capabilities; selecting a language does not guarantee support.",
};
type ChatbotCopy = typeof en;
const hi: ChatbotCopy = {
  title: "Legal-Setu से चैट करें", intro: "निजी बातचीत शुरू करने के लिए अपना कानूनी प्रश्न पूछें।", question: "आपको किस बारे में मदद चाहिए?", language: "बातचीत की भाषा", send: "प्रश्न भेजें", waiting: "AI के उत्तर की प्रतीक्षा है…",
  consent: "मैं अपने वर्तमान प्रश्न को प्रारंभिक कानूनी जानकारी के लिए Google Gemini को भेजने की अनुमति देता/देती हूँ। यह पेशेवर कानूनी सलाह नहीं है।",
  documents: "बातचीत बनाने के बाद आप दस्तावेज़ अपलोड कर सकते हैं।", manual: "स्वयं विवरण भरें", open: "सहेजी बातचीत खोलें", newChat: "नई चैट", summary: "मामले के सारांश की समीक्षा करें",
  unavailable: "इस भाषा में AI चैट अभी उपलब्ध नहीं है। आप स्वयं विवरण भर सकते हैं।", loading: "आपकी बातचीत लोड हो रही है…", missing: "बातचीत उपलब्ध नहीं है। केवल उसका स्वामी इसे खोल सकता है।",
  failed: "आपका प्रश्न सहेजा गया है। उत्तर की पुष्टि नहीं हो सकी। दोबारा प्रयास करें या सहेजी बातचीत खोलें।", error: "अनुरोध पूरा नहीं हुआ। आपका प्रश्न यहाँ मौजूद है; दोबारा प्रयास करें।", fallback: en.fallback,
};
const pa: ChatbotCopy = {
  title: "Legal-Setu ਨਾਲ ਚੈਟ ਕਰੋ", intro: "ਨਿੱਜੀ ਗੱਲਬਾਤ ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਆਪਣਾ ਕਾਨੂੰਨੀ ਸਵਾਲ ਪੁੱਛੋ।", question: "ਤੁਹਾਨੂੰ ਕਿਸ ਬਾਰੇ ਮਦਦ ਚਾਹੀਦੀ ਹੈ?", language: "ਗੱਲਬਾਤ ਦੀ ਭਾਸ਼ਾ", send: "ਸਵਾਲ ਭੇਜੋ", waiting: "AI ਦੇ ਜਵਾਬ ਦੀ ਉਡੀਕ ਹੈ…",
  consent: "ਮੈਂ ਆਪਣੇ ਮੌਜੂਦਾ ਸਵਾਲ ਨੂੰ ਮੁੱਢਲੀ ਕਾਨੂੰਨੀ ਜਾਣਕਾਰੀ ਲਈ Google Gemini ਨੂੰ ਭੇਜਣ ਦੀ ਇਜਾਜ਼ਤ ਦਿੰਦਾ/ਦਿੰਦੀ ਹਾਂ। ਇਹ ਪੇਸ਼ੇਵਰ ਕਾਨੂੰਨੀ ਸਲਾਹ ਨਹੀਂ ਹੈ।",
  documents: "ਗੱਲਬਾਤ ਬਣਾਉਣ ਤੋਂ ਬਾਅਦ ਤੁਸੀਂ ਦਸਤਾਵੇਜ਼ ਅੱਪਲੋਡ ਕਰ ਸਕਦੇ ਹੋ।", manual: "ਵੇਰਵੇ ਆਪ ਭਰੋ", open: "ਸੰਭਾਲੀ ਗੱਲਬਾਤ ਖੋਲ੍ਹੋ", newChat: "ਨਵੀਂ ਚੈਟ", summary: "ਮਾਮਲੇ ਦੇ ਸਾਰ ਦੀ ਸਮੀਖਿਆ ਕਰੋ",
  unavailable: "ਇਸ ਭਾਸ਼ਾ ਵਿੱਚ AI ਚੈਟ ਇਸ ਵੇਲੇ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਤੁਸੀਂ ਵੇਰਵੇ ਆਪ ਭਰ ਸਕਦੇ ਹੋ।", loading: "ਤੁਹਾਡੀ ਗੱਲਬਾਤ ਲੋਡ ਹੋ ਰਹੀ ਹੈ…", missing: "ਗੱਲਬਾਤ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਸਿਰਫ਼ ਇਸ ਦਾ ਮਾਲਕ ਇਸ ਨੂੰ ਖੋਲ੍ਹ ਸਕਦਾ ਹੈ।",
  failed: "ਤੁਹਾਡਾ ਸਵਾਲ ਸੰਭਾਲਿਆ ਗਿਆ ਹੈ। ਜਵਾਬ ਦੀ ਪੁਸ਼ਟੀ ਨਹੀਂ ਹੋ ਸਕੀ। ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ ਜਾਂ ਸੰਭਾਲੀ ਗੱਲਬਾਤ ਖੋਲ੍ਹੋ।", error: "ਬੇਨਤੀ ਪੂਰੀ ਨਹੀਂ ਹੋਈ। ਤੁਹਾਡਾ ਸਵਾਲ ਇੱਥੇ ਮੌਜੂਦ ਹੈ; ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।", fallback: en.fallback,
};
export function getChatbotCopy(locale: string): ChatbotCopy {
  return locale === "hi" ? hi : locale === "pa" ? pa : en;
}

export interface ChatStarterAttempt<CaseId extends string> {
  fingerprint: string;
  message: string;
  locale: PilotLocale;
  allowVertexFallback: boolean;
  creationRequestId: string;
  sendRequestId: string;
  caseId: CaseId | null;
}
export function createChatStarterAttempt<CaseId extends string>(question: string, locale: PilotLocale, allowVertexFallback: boolean): ChatStarterAttempt<CaseId> {
  const message = question.trim();
  const caseId: CaseId | null = null;
  return { fingerprint: JSON.stringify([message, locale]), message, locale, allowVertexFallback,
    creationRequestId: crypto.randomUUID(), sendRequestId: crypto.randomUUID(), caseId };
}

// Retain the case ID before dispatch so a lost acknowledgement never creates a second case.
export async function runChatStarter<CaseId extends string, Result>(attempt: ChatStarterAttempt<CaseId>, boundary: {
  create: (args: { title: string; text: string; locale: PilotLocale; context: []; requestId: string }) => Promise<CaseId>;
  send: (args: { caseId: CaseId; message: string; documentIds: []; requestId: string; contextKey: string; consent: true; allowVertexFallback?: true }) => Promise<Result>;
}) {
  const caseId = attempt.caseId ?? await boundary.create({ title: attempt.message.slice(0, 100), text: attempt.message, locale: attempt.locale, context: [], requestId: attempt.creationRequestId });
  attempt.caseId = caseId;
  const result = await boundary.send({ caseId, message: attempt.message, documentIds: [], requestId: attempt.sendRequestId, contextKey: "0:0:", consent: true, ...(attempt.allowVertexFallback ? { allowVertexFallback: true } : {}) });
  return { caseId, result };
}
