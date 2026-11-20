// Draft legal notices over WhatsApp: notice types, the facts each needs, and bot messages.
// Drafts are review-marked documents for the user; nothing is ever sent to the other party.
import { v } from "convex/values";
import type { WaLocale, WaOutbound } from "./whatsapp";

export const NOTICE_KINDS = ["deposit", "consumer", "salary", "money"] as const;
export type NoticeKind = (typeof NOTICE_KINDS)[number];
export const noticeKind = v.union(...NOTICE_KINDS.map(kind => v.literal(kind)));
export const isNoticeKind = (value: string): value is NoticeKind => (NOTICE_KINDS as readonly string[]).includes(value);

export const noticeDraft = v.object({
  kind: noticeKind,
  status: v.union(v.literal("collecting"), v.literal("confirming"), v.literal("generating")),
  fields: v.record(v.string(), v.string()),
  revision: v.number(),
  startedAt: v.number(),
});

export const NOTICE_LIMITS = { draftTtlMs: 24 * 3_600_000, fieldChars: 600, aiTimeoutMs: 120_000 } as const;

type Field = { key: string; label: string; optional?: true };
const PARTIES: Field[] = [
  { key: "sender_name", label: "Your full name" },
  { key: "sender_address", label: "Your postal address" },
  { key: "recipient_name", label: "Other party's name" },
  { key: "recipient_address", label: "Other party's postal address" },
];

// basis: the only legal provisions the drafting model may rely on besides retrieved passages.
export const NOTICES: Record<NoticeKind, { title: string; description: string; subjectHint: string; fields: Field[]; search: string; basis: string }> = {
  deposit: {
    title: "Deposit refund", description: "Tenant to landlord: refund deposit / no illegal eviction", subjectHint: "refund of security deposit",
    fields: [...PARTIES,
      { key: "property_address", label: "Rented property address" },
      { key: "tenancy_period", label: "Tenancy start (and end, if you left)" },
      { key: "deposit_amount", label: "Security deposit paid" },
      { key: "monthly_rent", label: "Monthly rent", optional: true },
      { key: "agreement", label: "Written rent agreement (yes/no, date)", optional: true },
      { key: "facts", label: "What happened" },
      { key: "demand", label: "What you demand and by when" }],
    search: "security deposit refund lessee lessor lease tenancy rent agreement breach compensation",
    basis: "The rent agreement between the parties; the Indian Contract Act, 1872, section 73 (compensation for loss caused by breach of contract); the rent/tenancy law of the State (name it only if the State is clear from the facts). Forcible dispossession or threats can be raised generally as unlawful, without section numbers unless they appear in the passages.",
  },
  consumer: {
    title: "Consumer complaint", description: "Defective goods or poor service: refund demand", subjectHint: "defective product / deficiency in service",
    fields: [...PARTIES,
      { key: "product", label: "Product or service" },
      { key: "purchase", label: "Purchase date and order/invoice no." },
      { key: "amount_paid", label: "Amount paid" },
      { key: "defect", label: "Defect or deficiency" },
      { key: "complaints", label: "Complaints already made", optional: true },
      { key: "demand", label: "What you demand and by when" }],
    search: "consumer defect deficiency in service unfair trade practice refund complaint District Commission",
    basis: "The Consumer Protection Act, 2019: section 2(10) (defect), section 2(11) (deficiency), section 2(47) (unfair trade practice), section 35 (complaint before the District Consumer Disputes Redressal Commission).",
  },
  salary: {
    title: "Unpaid salary/dues", description: "Employee to employer: pay pending wages or dues", subjectHint: "payment of unpaid wages and dues",
    fields: [...PARTIES,
      { key: "job", label: "Your designation and employment period" },
      { key: "amount_due", label: "Unpaid amount and months covered" },
      { key: "facts", label: "What happened" },
      { key: "demand", label: "What you demand and by when" }],
    search: "payment of wages time limit employer employee dues resignation termination Code on Wages",
    basis: "The Code on Wages, 2019 (wages must be paid within the time limits it sets, and on resignation, removal or termination the dues are payable within two working days); the Indian Contract Act, 1872, section 73. Cite other section numbers only if they appear in the passages.",
  },
  money: {
    title: "Money / cheque bounce", description: "Repay a loan or dues; dishonoured cheque notice", subjectHint: "repayment of money due",
    fields: [...PARTIES,
      { key: "amount", label: "Amount owed" },
      { key: "transaction", label: "How and when the money became due" },
      { key: "cheque", label: "Bounced cheque: no., date, bank, return memo date, reason", optional: true },
      { key: "demand", label: "What you demand and by when" }],
    search: "dishonour of cheque insufficiency of funds notice payee drawer legally enforceable debt Negotiable Instruments Act section 138",
    basis: "The Indian Contract Act, 1872, section 73. Only if a cheque was dishonoured: the Negotiable Instruments Act, 1881, section 138 (the payee must give written notice demanding payment within 30 days of receiving the bank's return memo, and the drawer has 15 days from receiving the notice to pay).",
  },
};

export const missingFields = (kind: NoticeKind, fields: Record<string, string>) =>
  NOTICES[kind].fields.filter(f => !f.optional && !fields[f.key]?.trim());

export function noticeSummary(kind: NoticeKind, fields: Record<string, string>) {
  const lines = NOTICES[kind].fields.filter(f => fields[f.key]?.trim()).map(f => `*${f.label}:* ${fields[f.key]}`);
  return `📝 *${NOTICES[kind].title}*\n\n${lines.join("\n")}`;
}

const NOTICE_WORDS = /^\W*(?:(?:please\s+|i\s+)?(?:draft|make|create|send|need|want|write)\s+(?:me\s+)?(?:a\s+)?)?(?:legal\s+)?notice\W*$|^\W*(?:नोटिस|নোটিশ|नोटीस|నోటీసు|நோட்டீஸ்|નોટિસ|ನೋಟಿಸ್|നോട്ടീസ്|ਨੋਟਿਸ)\W*$/iu;
export const isNoticeRequest = (text: string) => NOTICE_WORDS.test(text);
const CANCEL_WORDS = /^\W*(?:cancel|stop|exit|quit|रद्द|बंद|বাতিল|रद्द करा|రద్దు|ரத்து|રદ|ರದ್ದು|റദ്ദാക്കുക|ਰੱਦ)\W*$/iu;
export const isCancel = (text: string) => CANCEL_WORDS.test(text);
// Topics where a notice is a natural next step; used to suggest "notice" after an answer.
export const NOTICE_TOPICS = /deposit|landlord|tenan|lessee|lessor|evict|consumer|defect|deficien|refund|salary|wage|employ|cheque|check bounce|dishonou?r|loan|debt|dues|money/iu;

// Section numbers named in a text, e.g. "section 2(10)", "s. 138", "Sec 73" -> 2, 138, 73.
export const citedSections = (text: string) => new Set([...text.matchAll(/\b(?:sections?|secs?\.?|s\.|u\/s\.?)\s*(\d+[A-Z]?)/giu)].map(m => m[1]!.toUpperCase()));

type PerLocale = Record<WaLocale, string>;
export const NOTICE_TEXT = {
  menu: {
    en: "📝 Which notice do you need? I will ask for the details and prepare a DRAFT notice PDF in English for you to review.",
    hi: "📝 आपको कौन-सा नोटिस चाहिए? मैं ज़रूरी जानकारी पूछकर आपके लिए अंग्रेज़ी में एक ड्राफ्ट नोटिस PDF तैयार करूँगा, जिसे आप जाँच सकें।",
    bn: "📝 আপনার কোন নোটিশ দরকার? আমি প্রয়োজনীয় তথ্য জিজ্ঞেস করে ইংরেজিতে একটি খসড়া নোটিশ PDF তৈরি করব, যা আপনি যাচাই করতে পারবেন।",
    mr: "📝 तुम्हाला कोणती नोटीस हवी आहे? मी आवश्यक माहिती विचारून तुमच्यासाठी इंग्रजीत एक मसुदा नोटीस PDF तयार करेन, जी तुम्ही तपासू शकता.",
    te: "📝 మీకు ఏ నోటీసు కావాలి? అవసరమైన వివరాలు అడిగి, మీరు పరిశీలించుకునేలా ఇంగ్లీషులో ఒక డ్రాఫ్ట్ నోటీసు PDF తయారు చేస్తాను.",
    ta: "📝 உங்களுக்கு எந்த நோட்டீஸ் வேண்டும்? தேவையான விவரங்களைக் கேட்டு, நீங்கள் சரிபார்க்க ஆங்கிலத்தில் ஒரு வரைவு நோட்டீஸ் PDF தயாரிப்பேன்.",
    gu: "📝 તમારે કઈ નોટિસ જોઈએ છે? હું જરૂરી વિગતો પૂછીને તમારા માટે અંગ્રેજીમાં એક ડ્રાફ્ટ નોટિસ PDF તૈયાર કરીશ, જે તમે ચકાસી શકો.",
    kn: "📝 ನಿಮಗೆ ಯಾವ ನೋಟಿಸ್ ಬೇಕು? ಅಗತ್ಯ ವಿವರಗಳನ್ನು ಕೇಳಿ, ನೀವು ಪರಿಶೀಲಿಸಲು ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಒಂದು ಕರಡು ನೋಟಿಸ್ PDF ಸಿದ್ಧಪಡಿಸುತ್ತೇನೆ.",
    ml: "📝 നിങ്ങൾക്ക് ഏത് നോട്ടീസാണ് വേണ്ടത്? ആവശ്യമായ വിവരങ്ങൾ ചോദിച്ച്, നിങ്ങൾക്ക് പരിശോധിക്കാൻ ഇംഗ്ലീഷിൽ ഒരു കരട് നോട്ടീസ് PDF തയ്യാറാക്കാം.",
    pa: "📝 ਤੁਹਾਨੂੰ ਕਿਹੜਾ ਨੋਟਿਸ ਚਾਹੀਦਾ ਹੈ? ਮੈਂ ਲੋੜੀਂਦੀ ਜਾਣਕਾਰੀ ਪੁੱਛ ਕੇ ਤੁਹਾਡੇ ਲਈ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਇੱਕ ਡਰਾਫਟ ਨੋਟਿਸ PDF ਤਿਆਰ ਕਰਾਂਗਾ, ਜਿਸਨੂੰ ਤੁਸੀਂ ਜਾਂਚ ਸਕੋ।",
  } satisfies PerLocale,
  start: {
    en: "Please send the details in one or more messages: your name and address, the other party's name and address, what happened (with dates), and the amount or what you want. I'll ask for anything missing. Send \"cancel\" to stop.",
    hi: "कृपया एक या अधिक संदेशों में जानकारी भेजें: आपका नाम और पता, सामने वाले पक्ष का नाम और पता, क्या हुआ (तारीखों के साथ), और राशि या आप क्या चाहते हैं। जो कमी होगी, मैं पूछ लूँगा। रोकने के लिए \"cancel\" भेजें।",
    bn: "অনুগ্রহ করে এক বা একাধিক বার্তায় তথ্য পাঠান: আপনার নাম ও ঠিকানা, অপর পক্ষের নাম ও ঠিকানা, কী হয়েছে (তারিখসহ), এবং টাকার পরিমাণ বা আপনি কী চান। কিছু বাদ থাকলে আমি জিজ্ঞেস করব। বন্ধ করতে \"cancel\" পাঠান।",
    mr: "कृपया एक किंवा अधिक संदेशांत माहिती पाठवा: तुमचे नाव व पत्ता, समोरच्या पक्षाचे नाव व पत्ता, काय घडले (तारखांसह), आणि रक्कम किंवा तुम्हाला काय हवे आहे. काही राहिले तर मी विचारेन. थांबवण्यासाठी \"cancel\" पाठवा.",
    te: "దయచేసి ఒకటి లేదా ఎక్కువ సందేశాల్లో వివరాలు పంపండి: మీ పేరు, చిరునామా, అవతలి పక్షం పేరు, చిరునామా, ఏమి జరిగింది (తేదీలతో), మొత్తం లేదా మీకు ఏమి కావాలి. ఏదైనా లేకపోతే నేను అడుగుతాను. ఆపడానికి \"cancel\" పంపండి.",
    ta: "ஒன்று அல்லது அதற்கு மேற்பட்ட செய்திகளில் விவரங்களை அனுப்புங்கள்: உங்கள் பெயர், முகவரி, எதிர் தரப்பின் பெயர், முகவரி, என்ன நடந்தது (தேதிகளுடன்), தொகை அல்லது நீங்கள் கேட்பது. ஏதாவது விடுபட்டால் நான் கேட்பேன். நிறுத்த \"cancel\" அனுப்புங்கள்.",
    gu: "કૃપા કરીને એક અથવા વધુ સંદેશામાં વિગતો મોકલો: તમારું નામ અને સરનામું, સામેના પક્ષનું નામ અને સરનામું, શું થયું (તારીખો સાથે), અને રકમ અથવા તમે શું ઇચ્છો છો. કંઈ ખૂટતું હશે તો હું પૂછીશ. બંધ કરવા \"cancel\" મોકલો.",
    kn: "ದಯವಿಟ್ಟು ಒಂದು ಅಥವಾ ಹೆಚ್ಚು ಸಂದೇಶಗಳಲ್ಲಿ ವಿವರಗಳನ್ನು ಕಳುಹಿಸಿ: ನಿಮ್ಮ ಹೆಸರು ಮತ್ತು ವಿಳಾಸ, ಎದುರು ಪಕ್ಷದ ಹೆಸರು ಮತ್ತು ವಿಳಾಸ, ಏನಾಯಿತು (ದಿನಾಂಕಗಳೊಂದಿಗೆ), ಮತ್ತು ಮೊತ್ತ ಅಥವಾ ನಿಮಗೆ ಏನು ಬೇಕು. ಏನಾದರೂ ಬಿಟ್ಟುಹೋದರೆ ನಾನು ಕೇಳುತ್ತೇನೆ. ನಿಲ್ಲಿಸಲು \"cancel\" ಕಳುಹಿಸಿ.",
    ml: "ദയവായി ഒന്നോ അതിലധികമോ സന്ദേശങ്ങളിൽ വിവരങ്ങൾ അയയ്ക്കുക: നിങ്ങളുടെ പേരും വിലാസവും, എതിർകക്ഷിയുടെ പേരും വിലാസവും, എന്ത് സംഭവിച്ചു (തീയതികളോടെ), തുക അല്ലെങ്കിൽ നിങ്ങൾ ആവശ്യപ്പെടുന്നത്. എന്തെങ്കിലും വിട്ടുപോയാൽ ഞാൻ ചോദിക്കാം. നിർത്താൻ \"cancel\" അയയ്ക്കുക.",
    pa: "ਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਜਾਂ ਵੱਧ ਸੁਨੇਹਿਆਂ ਵਿੱਚ ਜਾਣਕਾਰੀ ਭੇਜੋ: ਤੁਹਾਡਾ ਨਾਮ ਅਤੇ ਪਤਾ, ਦੂਜੀ ਧਿਰ ਦਾ ਨਾਮ ਅਤੇ ਪਤਾ, ਕੀ ਹੋਇਆ (ਤਾਰੀਖਾਂ ਸਮੇਤ), ਅਤੇ ਰਕਮ ਜਾਂ ਤੁਸੀਂ ਕੀ ਚਾਹੁੰਦੇ ਹੋ। ਕੁਝ ਰਹਿ ਗਿਆ ਤਾਂ ਮੈਂ ਪੁੱਛ ਲਵਾਂਗਾ। ਰੋਕਣ ਲਈ \"cancel\" ਭੇਜੋ।",
  } satisfies PerLocale,
  confirm: {
    en: "Are these details correct? Tap *Create PDF*, or send any corrections.",
    hi: "क्या ये जानकारी सही है? *Create PDF* दबाएँ, या सुधार लिखकर भेजें।",
    bn: "এই তথ্যগুলো কি সঠিক? *Create PDF* চাপুন, অথবা সংশোধন লিখে পাঠান।",
    mr: "ही माहिती बरोबर आहे का? *Create PDF* दाबा, किंवा दुरुस्त्या लिहून पाठवा.",
    te: "ఈ వివరాలు సరైనవేనా? *Create PDF* నొక్కండి, లేదా సవరణలు పంపండి.",
    ta: "இந்த விவரங்கள் சரியா? *Create PDF* ஐ அழுத்தவும், அல்லது திருத்தங்களை அனுப்பவும்.",
    gu: "શું આ વિગતો સાચી છે? *Create PDF* દબાવો, અથવા સુધારા મોકલો.",
    kn: "ಈ ವಿವರಗಳು ಸರಿಯೇ? *Create PDF* ಒತ್ತಿ, ಅಥವಾ ತಿದ್ದುಪಡಿಗಳನ್ನು ಕಳುಹಿಸಿ.",
    ml: "ഈ വിവരങ്ങൾ ശരിയാണോ? *Create PDF* അമർത്തുക, അല്ലെങ്കിൽ തിരുത്തലുകൾ അയയ്ക്കുക.",
    pa: "ਕੀ ਇਹ ਜਾਣਕਾਰੀ ਸਹੀ ਹੈ? *Create PDF* ਦਬਾਓ, ਜਾਂ ਸੋਧਾਂ ਭੇਜੋ।",
  } satisfies PerLocale,
  working: {
    en: "⏳ Preparing your draft notice PDF. This takes about a minute.",
    hi: "⏳ आपका ड्राफ्ट नोटिस PDF तैयार हो रहा है। इसमें लगभग एक मिनट लगेगा।",
    bn: "⏳ আপনার খসড়া নোটিশ PDF তৈরি হচ্ছে। প্রায় এক মিনিট লাগবে।",
    mr: "⏳ तुमची मसुदा नोटीस PDF तयार होत आहे. सुमारे एक मिनिट लागेल.",
    te: "⏳ మీ డ్రాఫ్ట్ నోటీసు PDF తయారవుతోంది. సుమారు ఒక నిమిషం పడుతుంది.",
    ta: "⏳ உங்கள் வரைவு நோட்டீஸ் PDF தயாராகிறது. சுமார் ஒரு நிமிடம் ஆகும்.",
    gu: "⏳ તમારી ડ્રાફ્ટ નોટિસ PDF તૈયાર થઈ રહી છે. લગભગ એક મિનિટ લાગશે.",
    kn: "⏳ ನಿಮ್ಮ ಕರಡು ನೋಟಿಸ್ PDF ಸಿದ್ಧವಾಗುತ್ತಿದೆ. ಸುಮಾರು ಒಂದು ನಿಮಿಷ ಬೇಕಾಗುತ್ತದೆ.",
    ml: "⏳ നിങ്ങളുടെ കരട് നോട്ടീസ് PDF തയ്യാറാകുന്നു. ഏകദേശം ഒരു മിനിറ്റ് എടുക്കും.",
    pa: "⏳ ਤੁਹਾਡਾ ਡਰਾਫਟ ਨੋਟਿਸ PDF ਤਿਆਰ ਹੋ ਰਿਹਾ ਹੈ। ਲਗਭਗ ਇੱਕ ਮਿੰਟ ਲੱਗੇਗਾ।",
  } satisfies PerLocale,
  sent: {
    en: "📄 Your DRAFT legal notice. Check every detail and have an advocate review it before you send it by Registered Post AD (keep the receipt). Free help: DLSA / NALSA 15100.",
    hi: "📄 आपका ड्राफ्ट कानूनी नोटिस। भेजने से पहले हर जानकारी जाँचें और किसी वकील से इसकी समीक्षा कराएँ, फिर रजिस्टर्ड डाक (AD) से भेजें और रसीद रखें। मुफ्त सहायता: DLSA / NALSA 15100।",
    bn: "📄 আপনার খসড়া আইনি নোটিশ। পাঠানোর আগে প্রতিটি তথ্য যাচাই করুন এবং একজন আইনজীবীকে দিয়ে দেখিয়ে নিন, তারপর রেজিস্টার্ড পোস্ট (AD)-এ পাঠান ও রসিদ রাখুন। বিনামূল্যে সহায়তা: DLSA / NALSA 15100।",
    mr: "📄 तुमची मसुदा कायदेशीर नोटीस. पाठवण्यापूर्वी प्रत्येक तपशील तपासा आणि वकिलाकडून तपासून घ्या, मग रजिस्टर्ड पोस्ट (AD) ने पाठवा व पावती ठेवा. मोफत मदत: DLSA / NALSA 15100.",
    te: "📄 మీ డ్రాఫ్ట్ లీగల్ నోటీసు. పంపే ముందు ప్రతి వివరాన్ని తనిఖీ చేసి, న్యాయవాదితో సమీక్షించుకోండి; తర్వాత రిజిస్టర్డ్ పోస్ట్ (AD) ద్వారా పంపి రసీదు ఉంచుకోండి. ఉచిత సహాయం: DLSA / NALSA 15100.",
    ta: "📄 உங்கள் வரைவு சட்ட நோட்டீஸ். அனுப்பும் முன் ஒவ்வொரு விவரத்தையும் சரிபார்த்து, ஒரு வழக்கறிஞரிடம் பரிசீலிக்கச் செய்யுங்கள்; பிறகு பதிவுத் தபால் (AD) மூலம் அனுப்பி ரசீதை வைத்திருங்கள். இலவச உதவி: DLSA / NALSA 15100.",
    gu: "📄 તમારી ડ્રાફ્ટ કાનૂની નોટિસ. મોકલતા પહેલાં દરેક વિગત ચકાસો અને વકીલ પાસે તપાસ કરાવો, પછી રજિસ્ટર્ડ પોસ્ટ (AD) થી મોકલો અને રસીદ સાચવો. મફત સહાય: DLSA / NALSA 15100.",
    kn: "📄 ನಿಮ್ಮ ಕರಡು ಕಾನೂನು ನೋಟಿಸ್. ಕಳುಹಿಸುವ ಮೊದಲು ಪ್ರತಿಯೊಂದು ವಿವರವನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ವಕೀಲರಿಂದ ಪರಿಶೀಲನೆ ಮಾಡಿಸಿ; ನಂತರ ನೋಂದಾಯಿತ ಅಂಚೆ (AD) ಮೂಲಕ ಕಳುಹಿಸಿ ರಸೀದಿ ಇಟ್ಟುಕೊಳ್ಳಿ. ಉಚಿತ ನೆರವು: DLSA / NALSA 15100.",
    ml: "📄 നിങ്ങളുടെ കരട് നിയമ നോട്ടീസ്. അയയ്ക്കുന്നതിന് മുമ്പ് എല്ലാ വിവരങ്ങളും പരിശോധിച്ച് ഒരു അഭിഭാഷകനെക്കൊണ്ട് പരിശോധിപ്പിക്കുക; തുടർന്ന് രജിസ്റ്റേർഡ് പോസ്റ്റ് (AD) വഴി അയച്ച് രസീത് സൂക്ഷിക്കുക. സൗജന്യ സഹായം: DLSA / NALSA 15100.",
    pa: "📄 ਤੁਹਾਡਾ ਡਰਾਫਟ ਕਾਨੂੰਨੀ ਨੋਟਿਸ। ਭੇਜਣ ਤੋਂ ਪਹਿਲਾਂ ਹਰ ਵੇਰਵਾ ਜਾਂਚੋ ਅਤੇ ਕਿਸੇ ਵਕੀਲ ਤੋਂ ਜਾਂਚ ਕਰਵਾਓ, ਫਿਰ ਰਜਿਸਟਰਡ ਡਾਕ (AD) ਰਾਹੀਂ ਭੇਜੋ ਅਤੇ ਰਸੀਦ ਸੰਭਾਲੋ। ਮੁਫ਼ਤ ਸਹਾਇਤਾ: DLSA / NALSA 15100।",
  } satisfies PerLocale,
  cancelled: {
    en: "Notice drafting cancelled.", hi: "नोटिस बनाना रद्द किया गया।", bn: "নোটিশ তৈরি বাতিল করা হয়েছে।", mr: "नोटीस तयार करणे रद्द केले.",
    te: "నోటీసు తయారీ రద్దు చేయబడింది.", ta: "நோட்டீஸ் தயாரிப்பு ரத்து செய்யப்பட்டது.", gu: "નોટિસ બનાવવાનું રદ કર્યું.",
    kn: "ನೋಟಿಸ್ ತಯಾರಿಕೆ ರದ್ದುಗೊಂಡಿದೆ.", ml: "നോട്ടീസ് തയ്യാറാക്കൽ റദ്ദാക്കി.", pa: "ਨੋਟਿਸ ਬਣਾਉਣਾ ਰੱਦ ਕੀਤਾ ਗਿਆ।",
  } satisfies PerLocale,
  hint: {
    en: "📝 Need a legal notice? Send *notice* to get a draft PDF.",
    hi: "📝 कानूनी नोटिस चाहिए? ड्राफ्ट PDF के लिए *notice* भेजें।",
    bn: "📝 আইনি নোটিশ দরকার? খসড়া PDF পেতে *notice* পাঠান।",
    mr: "📝 कायदेशीर नोटीस हवी आहे? मसुदा PDF साठी *notice* पाठवा.",
    te: "📝 లీగల్ నోటీసు కావాలా? డ్రాఫ్ట్ PDF కోసం *notice* పంపండి.",
    ta: "📝 சட்ட நோட்டீஸ் வேண்டுமா? வரைவு PDF பெற *notice* அனுப்புங்கள்.",
    gu: "📝 કાનૂની નોટિસ જોઈએ છે? ડ્રાફ્ટ PDF માટે *notice* મોકલો.",
    kn: "📝 ಕಾನೂನು ನೋಟಿಸ್ ಬೇಕೇ? ಕರಡು PDF ಗಾಗಿ *notice* ಕಳುಹಿಸಿ.",
    ml: "📝 നിയമ നോട്ടീസ് വേണോ? കരട് PDF ലഭിക്കാൻ *notice* അയയ്ക്കുക.",
    pa: "📝 ਕਾਨੂੰਨੀ ਨੋਟਿਸ ਚਾਹੀਦਾ ਹੈ? ਡਰਾਫਟ PDF ਲਈ *notice* ਭੇਜੋ।",
  } satisfies PerLocale,
};

export const confirmMessage = (locale: WaLocale): WaOutbound => ({
  kind: "buttons", text: NOTICE_TEXT.confirm[locale], buttons: [{ id: "notice_create", title: "✅ Create PDF" }, { id: "notice_cancel", title: "✖ Cancel" }],
});
