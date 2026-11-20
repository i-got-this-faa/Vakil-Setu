// WhatsApp Cloud API helpers shared by the default and Node runtimes.
// Secrets come from deployment env vars and never leave the server.
import { v } from "convex/values";

// Languages offered in the WhatsApp language list (Meta allows at most 10 list rows).
export const WA_LOCALES = ["hi", "en", "bn", "mr", "te", "ta", "gu", "kn", "ml", "pa"] as const;
export type WaLocale = (typeof WA_LOCALES)[number];
export const waLocale = v.union(...WA_LOCALES.map(code => v.literal(code)));
export const isWaLocale = (value: string): value is WaLocale => (WA_LOCALES as readonly string[]).includes(value);

// title: native name shown in the list (max 24 chars); name: used to instruct the AI.
export const WA_LANGUAGES: Record<WaLocale, { title: string; english: string; name: string }> = {
  hi: { title: "हिंदी", english: "Hindi", name: "simple Hindi (Devanagari script)" },
  en: { title: "English", english: "English", name: "simple English" },
  bn: { title: "বাংলা", english: "Bengali", name: "simple Bengali (Bengali script)" },
  mr: { title: "मराठी", english: "Marathi", name: "simple Marathi (Devanagari script)" },
  te: { title: "తెలుగు", english: "Telugu", name: "simple Telugu (Telugu script)" },
  ta: { title: "தமிழ்", english: "Tamil", name: "simple Tamil (Tamil script)" },
  gu: { title: "ગુજરાતી", english: "Gujarati", name: "simple Gujarati (Gujarati script)" },
  kn: { title: "ಕನ್ನಡ", english: "Kannada", name: "simple Kannada (Kannada script)" },
  ml: { title: "മലയാളം", english: "Malayalam", name: "simple Malayalam (Malayalam script)" },
  pa: { title: "ਪੰਜਾਬੀ", english: "Punjabi", name: "simple Punjabi (Gurmukhi script)" },
};

export type WaOutbound =
  | { kind: "text"; text: string }
  | { kind: "list"; text: string; button: string; rows: { id: string; title: string; description?: string }[] }
  | { kind: "buttons"; text: string; buttons: { id: string; title: string }[] };

export const WA_LIMITS = { inboundChars: 4000, replyChars: 3800, recentMessages: 6, messagesPerHour: 20, aiTimeoutMs: 90_000 } as const;

export function whatsappConfig(env: Record<string, string | undefined>) {
  const token = env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const version = env.WHATSAPP_GRAPH_VERSION?.trim() || "v23.0";
  if (!token || !phoneNumberId || !/^\d+$/u.test(phoneNumberId) || !/^v\d+\.\d+$/u.test(version)) return null;
  return { token, base: `https://graph.facebook.com/${version}/${phoneNumberId}` };
}

function interactive(message: Exclude<WaOutbound, { kind: "text" }>) {
  if (message.kind === "buttons") return { type: "button", body: { text: message.text.slice(0, 1024) }, action: { buttons: message.buttons.slice(0, 3).map(b => ({ type: "reply", reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) } })) } };
  return { type: "list", body: { text: message.text.slice(0, 4096) }, action: { button: message.button.slice(0, 20), sections: [{ title: message.button.slice(0, 24), rows: message.rows.slice(0, 10).map(r => ({ id: r.id.slice(0, 200), title: r.title.slice(0, 24), ...(r.description ? { description: r.description.slice(0, 72) } : {}) })) }] } };
}

async function graphPost(env: Record<string, string | undefined>, path: "messages" | "media", body: BodyInit, json: boolean): Promise<Response | null> {
  const config = whatsappConfig(env);
  if (!config) { console.warn("whatsapp_send", { reason: "not_configured" }); return null; }
  const response = await fetch(`${config.base}/${path}`, { method: "POST", headers: { Authorization: `Bearer ${config.token}`, ...(json ? { "Content-Type": "application/json" } : {}) }, body });
  // Status and Meta error code only: never log message content, phone numbers or tokens.
  if (!response.ok) {
    const code = await response.clone().json().then((j: { error?: { code?: unknown } }) => j?.error?.code, () => undefined);
    console.warn("whatsapp_send", { reason: "http_error", path, status: response.status, code: typeof code === "number" ? code : undefined });
  }
  return response;
}

export async function sendWhatsApp(env: Record<string, string | undefined>, to: string, message: WaOutbound): Promise<boolean> {
  const body = message.kind === "text"
    ? { messaging_product: "whatsapp", to, type: "text", text: { body: message.text.slice(0, 4096), preview_url: false } }
    : { messaging_product: "whatsapp", to, type: "interactive", interactive: interactive(message) };
  return (await graphPost(env, "messages", JSON.stringify(body), true))?.ok ?? false;
}

// Uploads the file to WhatsApp's media store (no public URL) and sends it as a document.
export async function sendWhatsAppDocument(env: Record<string, string | undefined>, to: string, file: { bytes: Uint8Array; filename: string; mimeType: string; caption: string }): Promise<boolean> {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", file.mimeType);
  form.append("file", new Blob([new Uint8Array(file.bytes)], { type: file.mimeType }), file.filename);
  const upload = await graphPost(env, "media", form, false);
  if (!upload?.ok) return false;
  const id: unknown = await upload.json().then((j: { id?: unknown }) => j?.id, () => undefined);
  if (typeof id !== "string") return false;
  const body = { messaging_product: "whatsapp", to, type: "document", document: { id, filename: file.filename, caption: file.caption.slice(0, 1024) } };
  return (await graphPost(env, "messages", JSON.stringify(body), true))?.ok ?? false;
}

// Meta signs each webhook POST with HMAC-SHA256(app secret, raw body).
export async function verifyMetaSignature(appSecret: string, rawBody: string, header: string | null): Promise<boolean> {
  if (!header?.startsWith("sha256=")) return false;
  const hex = header.slice(7);
  if (!/^[0-9a-f]{64}$/u.test(hex)) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const signature = new Uint8Array(hex.match(/../gu)!.map(byte => parseInt(byte, 16)));
  return await crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(rawBody));
}

export type WaInbound = { messageId: string; waId: string; kind: "text"; text: string } | { messageId: string; waId: string; kind: "button"; buttonId: string } | { messageId: string; waId: string; kind: "unsupported" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Extracts user messages from a webhook payload; delivery statuses are ignored.
export function parseWebhook(payload: unknown): WaInbound[] | null {
  if (!isRecord(payload) || payload.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) return null;
  const result: WaInbound[] = [];
  for (const entry of payload.entry) {
    if (!isRecord(entry) || !Array.isArray(entry.changes)) continue;
    for (const change of entry.changes) {
      if (!isRecord(change) || !isRecord(change.value) || !Array.isArray(change.value.messages)) continue;
      for (const m of change.value.messages) {
        if (!isRecord(m) || typeof m.id !== "string" || typeof m.from !== "string" || !/^\d{6,20}$/u.test(m.from) || m.id.length > 200) continue;
        const base = { messageId: m.id, waId: m.from };
        // Button and list taps both carry the chosen option's id.
        const choice = m.type === "interactive" && isRecord(m.interactive) ? (isRecord(m.interactive.button_reply) ? m.interactive.button_reply : isRecord(m.interactive.list_reply) ? m.interactive.list_reply : null) : null;
        if (m.type === "text" && isRecord(m.text) && typeof m.text.body === "string" && m.text.body.trim()) result.push({ ...base, kind: "text", text: m.text.body.trim().slice(0, WA_LIMITS.inboundChars) });
        else if (choice && typeof choice.id === "string") result.push({ ...base, kind: "button", buttonId: choice.id.slice(0, 100) });
        else result.push({ ...base, kind: "unsupported" });
      }
    }
  }
  return result;
}

const EMERGENCY = /\b(suicide|kill (me|myself)|beat(ing)? me|beaten|rape[d]?|assault(ed)?|kidnap(ped)?|illegal(ly)? detain(ed)?|detention|domestic violence|acid attack|threat(en(ed|ing)?)? to kill)\b|मार (रहा|रही|रहे|डालेगा|डालेंगे)|बलात्कार|अपहरण|घरेलू हिंसा|आत्महत्या|हिरासत|जान से मार/iu;
export const isEmergency = (text: string) => EMERGENCY.test(text);
const GREETING = /^(hi+|hello|hey|start|menu|help|language|namaste|नमस्ते|हेलो|शुरू|मेनू|भाषा)[\s!.]*$/iu;
export const isGreeting = (text: string) => GREETING.test(text);

type PerLocale = Record<WaLocale, string>;

export const WA_TEXT = {
  welcome: "नमस्ते! Legal-Setu में आपका स्वागत है ⚖️\nWelcome to Legal-Setu.\n\nI give general information about Indian law, not legal advice.\nमैं भारतीय कानून की सामान्य जानकारी देता हूँ, कानूनी सलाह नहीं।\n\nTap the button below to choose your language.\nनीचे दिए बटन से अपनी भाषा चुनें। 👇",
  welcomeButton: "Choose language",
  emergency: "🚨 Emergency help / आपातकालीन सहायता\n\nIf you or someone is in danger right now, call:\n📞 112 – Police / National emergency\n📞 181 – Women helpline\n📞 1098 – Childline\n📞 15100 – NALSA free legal aid (Legal Services Authority)\n\nयदि आप या कोई और अभी खतरे में है, तुरंत ऊपर दिए नंबर पर कॉल करें।",
  ready: {
    en: "Thank you. Please describe your legal problem in your own words (who, what happened, when, where). Send \"menu\" anytime to change language.",
    hi: "धन्यवाद। कृपया अपनी कानूनी समस्या अपने शब्दों में लिखें (किसके साथ, क्या हुआ, कब, कहाँ)। भाषा बदलने के लिए कभी भी \"menu\" भेजें।",
    bn: "ধন্যবাদ। আপনার আইনি সমস্যাটি নিজের ভাষায় লিখুন (কার সঙ্গে, কী হয়েছে, কবে, কোথায়)। ভাষা বদলাতে যেকোনো সময় \"menu\" পাঠান।",
    mr: "धन्यवाद. तुमची कायदेशीर समस्या तुमच्या शब्दांत लिहा (कोणासोबत, काय घडले, कधी, कुठे). भाषा बदलण्यासाठी कधीही \"menu\" पाठवा.",
    te: "ధన్యవాదాలు. మీ చట్టపరమైన సమస్యను మీ మాటల్లో రాయండి (ఎవరితో, ఏమి జరిగింది, ఎప్పుడు, ఎక్కడ). భాష మార్చడానికి ఎప్పుడైనా \"menu\" పంపండి.",
    ta: "நன்றி. உங்கள் சட்டப் பிரச்சினையை உங்கள் சொந்த வார்த்தைகளில் எழுதுங்கள் (யாருடன், என்ன நடந்தது, எப்போது, எங்கே). மொழியை மாற்ற எப்போது வேண்டுமானாலும் \"menu\" அனுப்புங்கள்.",
    gu: "આભાર. તમારી કાનૂની સમસ્યા તમારા શબ્દોમાં લખો (કોની સાથે, શું થયું, ક્યારે, ક્યાં). ભાષા બદલવા માટે ગમે ત્યારે \"menu\" મોકલો.",
    kn: "ಧನ್ಯವಾದಗಳು. ನಿಮ್ಮ ಕಾನೂನು ಸಮಸ್ಯೆಯನ್ನು ನಿಮ್ಮದೇ ಮಾತುಗಳಲ್ಲಿ ಬರೆಯಿರಿ (ಯಾರೊಂದಿಗೆ, ಏನಾಯಿತು, ಯಾವಾಗ, ಎಲ್ಲಿ). ಭಾಷೆ ಬದಲಾಯಿಸಲು ಯಾವಾಗ ಬೇಕಾದರೂ \"menu\" ಕಳುಹಿಸಿ.",
    ml: "നന്ദി. നിങ്ങളുടെ നിയമപ്രശ്നം നിങ്ങളുടെ സ്വന്തം വാക്കുകളിൽ എഴുതുക (ആരുമായി, എന്ത് സംഭവിച്ചു, എപ്പോൾ, എവിടെ). ഭാഷ മാറ്റാൻ എപ്പോൾ വേണമെങ്കിലും \"menu\" അയയ്ക്കുക.",
    pa: "ਧੰਨਵਾਦ। ਆਪਣੀ ਕਾਨੂੰਨੀ ਸਮੱਸਿਆ ਆਪਣੇ ਸ਼ਬਦਾਂ ਵਿੱਚ ਲਿਖੋ (ਕਿਸ ਨਾਲ, ਕੀ ਹੋਇਆ, ਕਦੋਂ, ਕਿੱਥੇ)। ਭਾਸ਼ਾ ਬਦਲਣ ਲਈ ਕਦੇ ਵੀ \"menu\" ਭੇਜੋ।",
  } satisfies PerLocale,
  unsupported: {
    en: "For now I can only read text messages. Please type your question.",
    hi: "अभी मैं केवल लिखित संदेश पढ़ सकता हूँ। कृपया अपना सवाल लिखें।",
    bn: "এখন আমি শুধু লেখা বার্তা পড়তে পারি। অনুগ্রহ করে আপনার প্রশ্ন লিখুন।",
    mr: "सध्या मी फक्त लिखित संदेश वाचू शकतो. कृपया तुमचा प्रश्न लिहा.",
    te: "ప్రస్తుతం నేను టెక్స్ట్ సందేశాలను మాత్రమే చదవగలను. దయచేసి మీ ప్రశ్నను టైప్ చేయండి.",
    ta: "இப்போது என்னால் எழுத்து செய்திகளை மட்டுமே படிக்க முடியும். உங்கள் கேள்வியைத் தட்டச்சு செய்யுங்கள்.",
    gu: "હાલમાં હું ફક્ત લખેલા સંદેશા વાંચી શકું છું. કૃપા કરીને તમારો પ્રશ્ન લખો.",
    kn: "ಸದ್ಯಕ್ಕೆ ನಾನು ಬರಹದ ಸಂದೇಶಗಳನ್ನು ಮಾತ್ರ ಓದಬಲ್ಲೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ.",
    ml: "ഇപ്പോൾ എനിക്ക് എഴുത്തുസന്ദേശങ്ങൾ മാത്രമേ വായിക്കാനാകൂ. ദയവായി നിങ്ങളുടെ ചോദ്യം ടൈപ്പ് ചെയ്യുക.",
    pa: "ਹਾਲੇ ਮੈਂ ਸਿਰਫ਼ ਲਿਖਤੀ ਸੁਨੇਹੇ ਪੜ੍ਹ ਸਕਦਾ ਹਾਂ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਸਵਾਲ ਲਿਖੋ।",
  } satisfies PerLocale,
  rateLimited: {
    en: "You have reached the hourly message limit. Please try again in an hour. For urgent free legal aid call 15100.",
    hi: "आप इस घंटे की संदेश सीमा तक पहुँच गए हैं। कृपया एक घंटे बाद प्रयास करें। तुरंत मुफ्त कानूनी सहायता के लिए 15100 पर कॉल करें।",
    bn: "আপনি এই ঘণ্টার বার্তার সীমায় পৌঁছে গেছেন। এক ঘণ্টা পরে আবার চেষ্টা করুন। জরুরি বিনামূল্যে আইনি সহায়তার জন্য 15100-এ ফোন করুন।",
    mr: "तुम्ही या तासाची संदेश मर्यादा गाठली आहे. एका तासानंतर पुन्हा प्रयत्न करा. तातडीच्या मोफत कायदेशीर मदतीसाठी 15100 वर कॉल करा.",
    te: "మీరు ఈ గంట సందేశ పరిమితిని చేరుకున్నారు. ఒక గంట తర్వాత మళ్లీ ప్రయత్నించండి. అత్యవసర ఉచిత న్యాయ సహాయం కోసం 15100 కు కాల్ చేయండి.",
    ta: "இந்த மணிநேரத்திற்கான செய்தி வரம்பை அடைந்துவிட்டீர்கள். ஒரு மணி நேரம் கழித்து மீண்டும் முயற்சிக்கவும். அவசர இலவச சட்ட உதவிக்கு 15100 ஐ அழைக்கவும்.",
    gu: "તમે આ કલાકની સંદેશ મર્યાદા સુધી પહોંચી ગયા છો. એક કલાક પછી ફરી પ્રયાસ કરો. તાત્કાલિક મફત કાનૂની સહાય માટે 15100 પર કૉલ કરો.",
    kn: "ಈ ಗಂಟೆಯ ಸಂದೇಶ ಮಿತಿಯನ್ನು ನೀವು ತಲುಪಿದ್ದೀರಿ. ಒಂದು ಗಂಟೆಯ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ. ತುರ್ತು ಉಚಿತ ಕಾನೂನು ನೆರವಿಗೆ 15100 ಗೆ ಕರೆ ಮಾಡಿ.",
    ml: "ഈ മണിക്കൂറിലെ സന്ദേശ പരിധി നിങ്ങൾ എത്തി. ഒരു മണിക്കൂർ കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക. അടിയന്തര സൗജന്യ നിയമസഹായത്തിന് 15100 ൽ വിളിക്കുക.",
    pa: "ਤੁਸੀਂ ਇਸ ਘੰਟੇ ਦੀ ਸੁਨੇਹਾ ਸੀਮਾ ਤੱਕ ਪਹੁੰਚ ਗਏ ਹੋ। ਇੱਕ ਘੰਟੇ ਬਾਅਦ ਫਿਰ ਕੋਸ਼ਿਸ਼ ਕਰੋ। ਤੁਰੰਤ ਮੁਫ਼ਤ ਕਾਨੂੰਨੀ ਸਹਾਇਤਾ ਲਈ 15100 'ਤੇ ਕਾਲ ਕਰੋ।",
  } satisfies PerLocale,
  failed: {
    en: "Sorry, I could not prepare an answer right now. Please try again shortly, or call NALSA free legal aid at 15100.",
    hi: "क्षमा करें, अभी उत्तर तैयार नहीं हो सका। कृपया थोड़ी देर बाद प्रयास करें, या NALSA मुफ्त कानूनी सहायता 15100 पर कॉल करें।",
    bn: "দুঃখিত, এখন উত্তর তৈরি করা গেল না। একটু পরে আবার চেষ্টা করুন, অথবা NALSA বিনামূল্যে আইনি সহায়তা 15100-এ ফোন করুন।",
    mr: "क्षमस्व, आत्ता उत्तर तयार करता आले नाही. थोड्या वेळाने पुन्हा प्रयत्न करा, किंवा NALSA मोफत कायदेशीर मदत 15100 वर कॉल करा.",
    te: "క్షమించండి, ఇప్పుడు సమాధానం సిద్ధం చేయలేకపోయాను. కొద్దిసేపటి తర్వాత మళ్లీ ప్రయత్నించండి, లేదా NALSA ఉచిత న్యాయ సహాయం 15100 కు కాల్ చేయండి.",
    ta: "மன்னிக்கவும், இப்போது பதிலைத் தயாரிக்க முடியவில்லை. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும், அல்லது NALSA இலவச சட்ட உதவி 15100 ஐ அழைக்கவும்.",
    gu: "માફ કરશો, અત્યારે જવાબ તૈયાર થઈ શક્યો નથી. થોડી વાર પછી ફરી પ્રયાસ કરો, અથવા NALSA મફત કાનૂની સહાય 15100 પર કૉલ કરો.",
    kn: "ಕ್ಷಮಿಸಿ, ಈಗ ಉತ್ತರ ಸಿದ್ಧಪಡಿಸಲು ಆಗಲಿಲ್ಲ. ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ, ಅಥವಾ NALSA ಉಚಿತ ಕಾನೂನು ನೆರವು 15100 ಗೆ ಕರೆ ಮಾಡಿ.",
    ml: "ക്ഷമിക്കണം, ഇപ്പോൾ മറുപടി തയ്യാറാക്കാനായില്ല. കുറച്ചുകഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക, അല്ലെങ്കിൽ NALSA സൗജന്യ നിയമസഹായം 15100 ൽ വിളിക്കുക.",
    pa: "ਮਾਫ਼ ਕਰਨਾ, ਹੁਣੇ ਜਵਾਬ ਤਿਆਰ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਥੋੜ੍ਹੀ ਦੇਰ ਬਾਅਦ ਫਿਰ ਕੋਸ਼ਿਸ਼ ਕਰੋ, ਜਾਂ NALSA ਮੁਫ਼ਤ ਕਾਨੂੰਨੀ ਸਹਾਇਤਾ 15100 'ਤੇ ਕਾਲ ਕਰੋ।",
  } satisfies PerLocale,
  disclaimer: {
    en: "⚠️ General information only, not legal advice. Consult a qualified advocate.",
    hi: "⚠️ यह केवल सामान्य जानकारी है, कानूनी सलाह नहीं। किसी योग्य वकील से परामर्श करें।",
    bn: "⚠️ এটি শুধু সাধারণ তথ্য, আইনি পরামর্শ নয়। একজন যোগ্য আইনজীবীর পরামর্শ নিন।",
    mr: "⚠️ ही केवळ सामान्य माहिती आहे, कायदेशीर सल्ला नाही. पात्र वकिलाचा सल्ला घ्या.",
    te: "⚠️ ఇది సాధారణ సమాచారం మాత్రమే, న్యాయ సలహా కాదు. అర్హత గల న్యాయవాదిని సంప్రదించండి.",
    ta: "⚠️ இது பொதுவான தகவல் மட்டுமே, சட்ட ஆலோசனை அல்ல. தகுதியான வழக்கறிஞரை அணுகவும்.",
    gu: "⚠️ આ ફક્ત સામાન્ય માહિતી છે, કાનૂની સલાહ નથી. લાયક વકીલની સલાહ લો.",
    kn: "⚠️ ಇದು ಸಾಮಾನ್ಯ ಮಾಹಿತಿ ಮಾತ್ರ, ಕಾನೂನು ಸಲಹೆಯಲ್ಲ. ಅರ್ಹ ವಕೀಲರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
    ml: "⚠️ ഇത് പൊതുവായ വിവരം മാത്രമാണ്, നിയമോപദേശമല്ല. യോഗ്യതയുള്ള ഒരു അഭിഭാഷകനെ സമീപിക്കുക.",
    pa: "⚠️ ਇਹ ਸਿਰਫ਼ ਆਮ ਜਾਣਕਾਰੀ ਹੈ, ਕਾਨੂੰਨੀ ਸਲਾਹ ਨਹੀਂ। ਕਿਸੇ ਯੋਗ ਵਕੀਲ ਨਾਲ ਸਲਾਹ ਕਰੋ।",
  } satisfies PerLocale,
  sources: { en: "Sources:", hi: "स्रोत:", bn: "সূত্র:", mr: "स्रोत:", te: "మూలాలు:", ta: "ஆதாரங்கள்:", gu: "સ્રોત:", kn: "ಮೂಲಗಳು:", ml: "ഉറവിടങ്ങൾ:", pa: "ਸਰੋਤ:" } satisfies PerLocale,
};

export const welcomeMessage = (): WaOutbound => ({
  kind: "list", text: WA_TEXT.welcome, button: WA_TEXT.welcomeButton,
  rows: WA_LOCALES.map(code => ({ id: `lang_${code}`, title: WA_LANGUAGES[code].title, ...(code === "en" ? {} : { description: WA_LANGUAGES[code].english }) })),
});
