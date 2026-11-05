import { normalizeLegalDomainForMatch } from "../utils/legalDomain.js";

/** "hi" | "en" — drives LLM output language (Hindi in Devanagari vs English). */
function inferUserLanguage(userText) {
  const t = String(userText || "").trim();
  if (!t) return "en";
  const devCount = (t.match(/[\u0900-\u097F]/g) || []).length;
  const latinCount = (t.match(/[a-zA-Z]/g) || []).length;
  if (devCount >= 2) return "hi";
  if (latinCount > 0 && devCount === 0) {
    // Detect only strong Roman-Hindi markers; avoid legal English words that caused false positives.
    const romanHiTokens = (t.match(/\b(mera|meri|mere|mujhe|main|mein|hum|tum|aap|hai|hain|tha|thi|kya|kyu|kyun|nahi|ka|ki|ke|se|ko|par)\b/gi) || []).length;
    if (romanHiTokens >= 2) return "hi";
  }
  return "en";
}

function formatHistoryForPrompt(history) {
  if (!Array.isArray(history) || history.length === 0) return "";
  const lines = history
    .slice(-10)
    .map((m) => {
      const role = m?.role === "assistant" ? "Assistant" : "User";
      const content = String(m?.content || m?.text || "").trim();
      return content ? `${role}: ${content}` : null;
    })
    .filter(Boolean);
  if (!lines.length) return "";
  return `Previous conversation (same case — continue context, do not repeat prior summary verbatim):\n${lines.join("\n")}\n\n`;
}

function buildClassificationPrompt(userText, history = []) {
  const lang = inferUserLanguage(userText);
  const languageRules =
    lang === "hi"
      ? `The user wrote in Hindi (Devanagari and/or Roman Hindi). Write ALL user-visible text in Hindi using Devanagari script: domain_label, summary, every section heading and body, and every action. Be clear and legally appropriate. Only the JSON key "domain" must be an English slug (criminal | civil | family | property).`
      : `The user wrote in English. Write ALL user-visible text in English: domain_label, summary, sections, and actions. Only "domain" must be one of the English slugs: criminal | civil | family | property.`;

  const historyBlock = formatHistoryForPrompt(history);
  const userBlock = historyBlock
    ? `${historyBlock}Latest user message:\n${userText}`
    : userText;

  return `You triage legal issues under Indian law (general information only, not a substitute for a licensed advocate).

User message:
${userBlock}

${languageRules}

Output ONE valid JSON object only (no markdown fences, no extra text). Shape:
{
  "domain": "criminal" | "civil" | "family" | "property",
  "domain_label": "short UI label in the response language",
  "urgency": "low" | "medium" | "high" | "emergency",
  "summary": "Concise overview: 2-3 sentences only.",
  "actions": ["concrete step 1", "step 2", "3-5 items"]
}

Do not include "sections", "heading", or any nested analysis fields.
Tailor content tightly to the user's facts. Keep summary short (2-3 sentences).`;
}

const safeParseClassification = (rawContent) => {
  if (!rawContent) {
    return null;
  }

  try {
    return JSON.parse(rawContent);
  } catch (_e) {
    const match = rawContent.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (_nested) {
        return null;
      }
    }
    return null;
  }
};

// Topic-specific guidance used when no model is configured or the model is unavailable.
// `domain` stays within the advocate-matching vocabulary (criminal | civil | family | property).
const FALLBACK_TOPICS = [
  {
    id: "employment",
    domain: "civil",
    pattern: /(employer|employee|salary|wages|job|fired|terminat|workplace|office|company|pf|esi|gratuity|injur|naukri|tankhwah|वेतन|नौकरी|मालिक|कंपनी)/,
    en: {
      label: "Employment & labour",
      summary: "This looks like an employment dispute. Workers in India are protected by labour laws covering unpaid wages, wrongful termination and workplace injury (including ESI and employee-compensation claims).",
      actions: [
        "Collect your appointment letter, salary slips, bank statements and any written communication with the employer.",
        "For a workplace injury, keep the medical records, bills and any accident report or witness names.",
        "Send the employer a written, dated request for payment and keep a copy.",
        "If unresolved, approach the local Labour Commissioner / ESI office or file a claim with the help of a labour advocate.",
        "Do not sign any settlement or resignation letter without legal review."
      ]
    },
    hi: {
      label: "रोज़गार और श्रम कानून",
      summary: "यह रोज़गार से जुड़ा विवाद लगता है। भारत में श्रम कानून बकाया वेतन, गलत तरीके से नौकरी से निकालने और कार्यस्थल पर चोट (ESI और कर्मचारी मुआवज़ा) से सुरक्षा देते हैं।",
      actions: [
        "नियुक्ति पत्र, वेतन पर्ची, बैंक स्टेटमेंट और नियोक्ता से हुई सभी लिखित बातचीत इकट्ठा करें।",
        "कार्यस्थल पर चोट हो तो मेडिकल रिकॉर्ड, बिल और गवाहों के नाम संभालकर रखें।",
        "नियोक्ता को भुगतान के लिए लिखित, तारीख़ सहित अनुरोध भेजें और उसकी कॉपी रखें।",
        "समाधान न होने पर श्रम आयुक्त / ESI कार्यालय से संपर्क करें या श्रम वकील की मदद से दावा करें।",
        "कानूनी सलाह के बिना कोई समझौता या इस्तीफ़ा पत्र साइन न करें।"
      ]
    }
  },
  {
    id: "consumer",
    domain: "civil",
    pattern: /(refund|defective|product|seller|shop|online order|warranty|service provider|consumer|insurance claim|bank charge|उपभोक्ता|रिफंड)/,
    en: {
      label: "Consumer protection",
      summary: "This appears to be a consumer complaint. The Consumer Protection Act, 2019 lets you claim refunds, replacement or compensation for defective goods and deficient services.",
      actions: [
        "Keep the invoice, payment proof, warranty card and photos of the defect.",
        "Write to the seller or service provider with a clear deadline to resolve the issue.",
        "Register a grievance on the National Consumer Helpline (1915 / consumerhelpline.gov.in).",
        "If unresolved, file a complaint before the District Consumer Commission (e-Daakhil allows online filing).",
        "Note the dates: consumer complaints should generally be filed within two years."
      ]
    },
    hi: {
      label: "उपभोक्ता संरक्षण",
      summary: "यह उपभोक्ता शिकायत लगती है। उपभोक्ता संरक्षण अधिनियम, 2019 के तहत खराब सामान या सेवा में कमी के लिए रिफंड, बदलाव या मुआवज़ा माँगा जा सकता है।",
      actions: [
        "बिल, भुगतान का प्रमाण, वारंटी कार्ड और खराबी की फ़ोटो संभालकर रखें।",
        "विक्रेता या सेवा प्रदाता को समय सीमा के साथ लिखित शिकायत भेजें।",
        "राष्ट्रीय उपभोक्ता हेल्पलाइन (1915) पर शिकायत दर्ज करें।",
        "समाधान न हो तो ज़िला उपभोक्ता आयोग में शिकायत करें (e-Daakhil से ऑनलाइन)।",
        "शिकायत सामान्यतः दो साल के भीतर दर्ज करनी चाहिए।"
      ]
    }
  },
  {
    id: "family",
    domain: "family",
    pattern: /(divorce|marriage|custody|alimony|maintenance|dowry|domestic|husband|wife|in-laws|तलाक|परिवार|दहेज|पति|पत्नी|ससुराल)/,
    en: {
      label: "Family law",
      summary: "This is a family-law matter. Indian law provides remedies for divorce, maintenance, child custody and protection from domestic violence.",
      actions: [
        "Keep the marriage certificate, children's documents and proof of income and expenses.",
        "Record dated incidents, messages or medical reports if there is abuse.",
        "If you face violence, contact the police (112) or the women's helpline (181) immediately.",
        "A Protection Officer or the District Legal Services Authority can help with free legal aid.",
        "Consult a family advocate before signing any settlement or mutual-consent papers."
      ]
    },
    hi: {
      label: "पारिवारिक कानून",
      summary: "यह पारिवारिक कानून का मामला है। भारतीय कानून तलाक, भरण-पोषण, बच्चों की कस्टडी और घरेलू हिंसा से सुरक्षा के उपाय देता है।",
      actions: [
        "विवाह प्रमाणपत्र, बच्चों के दस्तावेज़ और आय-व्यय के प्रमाण रखें।",
        "दुर्व्यवहार हो तो घटनाओं की तारीख़, संदेश या मेडिकल रिपोर्ट सहेजें।",
        "हिंसा होने पर तुरंत पुलिस (112) या महिला हेल्पलाइन (181) से संपर्क करें।",
        "संरक्षण अधिकारी या ज़िला विधिक सेवा प्राधिकरण से मुफ़्त कानूनी सहायता मिल सकती है।",
        "कोई भी समझौता साइन करने से पहले पारिवारिक वकील से सलाह लें।"
      ]
    }
  },
  {
    id: "property",
    domain: "property",
    pattern: /(land|property|registry|tenant|landlord|rent|plot|ownership|possession|encroach|flat|builder|संपत्ति|जमीन|ज़मीन|किराया|मकान)/,
    en: {
      label: "Property law",
      summary: "This is a property matter. Ownership, tenancy and possession disputes depend heavily on documents such as the sale deed, mutation records and rent agreement.",
      actions: [
        "Collect the sale deed, mutation/jamabandi records, tax receipts and any rent agreement.",
        "Get a certified copy of the land records from the revenue office if anything is missing.",
        "Send a written notice before taking any action, and keep proof of delivery.",
        "Do not use force to take possession; seek an injunction through the civil court instead.",
        "Consult a property advocate to check limitation periods for your claim."
      ]
    },
    hi: {
      label: "संपत्ति कानून",
      summary: "यह संपत्ति का मामला है। मालिकाना हक़, किरायेदारी और कब्ज़े के विवाद में बैनामा, दाखिल-ख़ारिज और किरायानामा जैसे दस्तावेज़ सबसे अहम होते हैं।",
      actions: [
        "बैनामा, दाखिल-ख़ारिज/जमाबंदी रिकॉर्ड, टैक्स रसीद और किरायानामा इकट्ठा करें।",
        "कोई रिकॉर्ड न हो तो राजस्व कार्यालय से प्रमाणित प्रति लें।",
        "कोई कदम उठाने से पहले लिखित नोटिस भेजें और डिलीवरी का प्रमाण रखें।",
        "कब्ज़े के लिए बल प्रयोग न करें; सिविल कोर्ट से निषेधाज्ञा लें।",
        "दावे की समय सीमा जानने के लिए संपत्ति वकील से सलाह लें।"
      ]
    }
  },
  {
    id: "criminal",
    domain: "criminal",
    pattern: /(police|fir|arrest|bail|theft|stolen|assault|beat|attack|crime|criminal|cheat|fraud|scam|threat|गिरफ्तार|एफआईआर|चोरी|धोखा|मारपीट|पुलिस)/,
    en: {
      label: "Criminal law",
      summary: "This is a criminal matter. You can report offences through an FIR under the Bharatiya Nagarik Suraksha Sanhita (BNSS), and an accused person has a right to legal representation and to apply for bail.",
      actions: [
        "If you are in danger, call 112 immediately.",
        "File an FIR at the nearest police station (or an e-FIR / cybercrime.gov.in for online fraud) and take a free copy.",
        "If the police refuse to register the FIR, write to the Superintendent of Police or approach the Magistrate.",
        "Preserve evidence: photos, messages, medical reports, bank transaction IDs and witness names.",
        "If someone is arrested, contact a criminal advocate about bail; free legal aid is available through DLSA."
      ]
    },
    hi: {
      label: "आपराधिक कानून",
      summary: "यह आपराधिक मामला है। भारतीय नागरिक सुरक्षा संहिता (BNSS) के तहत FIR दर्ज कराई जा सकती है, और आरोपी को वकील रखने व ज़मानत माँगने का अधिकार है।",
      actions: [
        "ख़तरा हो तो तुरंत 112 पर कॉल करें।",
        "नज़दीकी थाने में FIR दर्ज कराएँ (ऑनलाइन धोखाधड़ी के लिए cybercrime.gov.in) और मुफ़्त कॉपी लें।",
        "पुलिस FIR दर्ज न करे तो पुलिस अधीक्षक को लिखें या मजिस्ट्रेट के पास जाएँ।",
        "सबूत संभालें: फ़ोटो, संदेश, मेडिकल रिपोर्ट, बैंक ट्रांज़ैक्शन ID और गवाहों के नाम।",
        "गिरफ़्तारी होने पर ज़मानत के लिए आपराधिक वकील से संपर्क करें; DLSA से मुफ़्त सहायता मिलती है।"
      ]
    }
  }
];

const GENERAL_TOPIC = {
  domain: "civil",
  en: {
    label: "Civil matters",
    summary: "This appears to be a civil dispute. The right remedy depends on your documents and the exact facts, so a short consultation with an advocate is the best next step.",
    actions: [
      "Gather and organize all related documents.",
      "Write a dated timeline of events.",
      "Book a consultation with an advocate in the correct practice area.",
      "Avoid signing new undertakings without legal review.",
      "Free legal aid is available through your District Legal Services Authority (DLSA)."
    ]
  },
  hi: {
    label: "दीवानी मामला",
    summary: "यह दीवानी विवाद लगता है। सही उपाय आपके दस्तावेज़ों और तथ्यों पर निर्भर करता है, इसलिए किसी वकील से संक्षिप्त सलाह लेना सबसे अच्छा अगला कदम है।",
    actions: [
      "सभी संबंधित कागजात एक जगह इकट्ठा करें।",
      "तारीखों और घटनाओं का क्रम लिख लें।",
      "सही क्षेत्र के अनुभवी वकील से अपॉइंटमेंट लें।",
      "बिना समझे कोई नया दस्तावेज़ हस्ताक्षरित न करें।",
      "ज़िला विधिक सेवा प्राधिकरण (DLSA) से मुफ़्त कानूनी सहायता मिल सकती है।"
    ]
  }
};

const localFallbackClassification = (userText) => {
  const text = String(userText || "").toLowerCase();
  const lang = inferUserLanguage(userText);
  const topic = FALLBACK_TOPICS.find((t) => t.pattern.test(text)) || GENERAL_TOPIC;
  const copy = lang === "hi" ? topic.hi : topic.en;

  let urgency = "low";
  if (/(urgent|soon|notice|deadline|court date|hearing|injur|unpaid|medical|जल्दी|सुनवाई|चोट)/.test(text)) urgency = "medium";
  if (/(threat|violence|assault|beat|attack|arrest|illegal detention|harassment|harass|dowry|हिंसा|धमकी|मारपीट|गिरफ्तार|परेशान|दहेज)/.test(text)) urgency = "high";
  if (/(life threatening|emergency|kidnap|immediate danger|suicide|जान का ख़तरा|अपहरण)/.test(text)) urgency = "emergency";

  return {
    domain: topic.domain,
    response_language: lang,
    domain_label: copy.label,
    urgency,
    summary: copy.summary,
    actions: copy.actions
  };
};

const extractClassificationFromRaw = (raw) => {
  const parsed = safeParseClassification(raw);
  const domain = normalizeLegalDomainForMatch(parsed?.domain || "");

  const actions = Array.isArray(parsed?.actions)
    ? parsed.actions.map((a) => String(a || "").trim()).filter(Boolean)
    : [];

  return {
    domain,
    domain_label: String(parsed?.domain_label || "").trim() || domain,
    urgency: String(parsed?.urgency || "medium").toLowerCase(),
    summary: String(parsed?.summary || "").trim() || String(raw || "").slice(0, 800),
    actions
  };
};

export const classifyLegalIssue = async (userText, history = []) => {
  const llmProvider = process.env.LLM_PROVIDER || "gateway";
  const fallbackMode = process.env.LLM_FALLBACK_MODE || "rule_based";
  const apiKey = process.env.LLM_API_KEY;
  const apiUrl = process.env.LLM_API_URL || "https://api.openai.com/v1/chat/completions";
  const gatewayBaseUrl = process.env.GATEWAY_BASE_URL || "";
  const apiKeyHeader = process.env.LLM_API_KEY_HEADER || "Authorization";
  const apiKeyPrefix = process.env.LLM_API_KEY_PREFIX || "Bearer";
  const model = process.env.LLM_MODEL || "gpt-4o-mini";

  const withResponseLanguage = (classification) => ({
    ...classification,
    response_language: classification?.response_language || inferUserLanguage(userText || "")
  });

  if (!apiKey) {
    if (fallbackMode === "rule_based") {
      return withResponseLanguage(localFallbackClassification(userText));
    }
    throw new Error("LLM_API_KEY is missing.");
  }

  const prompt = buildClassificationPrompt(userText || "", history);

  if (llmProvider === "gemini") {
    const geminiBaseUrl =
      process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta";
    const primaryModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const fallbackRaw =
      process.env.GEMINI_FALLBACK_MODELS || "gemini-1.5-flash,gemini-1.5-pro";
    const modelCandidates = [
      primaryModel,
      ...fallbackRaw
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean)
    ].filter((modelName, idx, arr) => arr.indexOf(modelName) === idx);

    let lastError = null;

    for (const modelName of modelCandidates) {
      const geminiUrl = `${geminiBaseUrl}/models/${modelName}:generateContent?key=${apiKey}`;
      const geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.35, maxOutputTokens: 4096 }
        })
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        lastError = `model=${modelName} :: ${errText}`;
        // Continue to next fallback model on not found.
        if (geminiRes.status === 404) {
          continue;
        }
        if (geminiRes.status === 429 && fallbackMode === "rule_based") {
          return withResponseLanguage(localFallbackClassification(userText));
        }
        throw new Error(`Gemini API error: ${lastError}`);
      }

      const data = await geminiRes.json();
      const raw =
        data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n") ||
        data?.text ||
        "";
      return withResponseLanguage(extractClassificationFromRaw(raw));
    }

    if (fallbackMode === "rule_based") {
      return withResponseLanguage(localFallbackClassification(userText));
    }
    throw new Error(`Gemini API error: ${lastError || "No valid Gemini model resolved."}`);
  }

  const resolvedLlmUrl =
    apiUrl.startsWith("/") && gatewayBaseUrl
      ? `${gatewayBaseUrl.replace(/\/$/, "")}${apiUrl}`
      : apiUrl;

  const headers = {
    "Content-Type": "application/json"
  };
  headers[apiKeyHeader] = apiKeyPrefix ? `${apiKeyPrefix} ${apiKey}` : apiKey;

  const response = await fetch(resolvedLlmUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.35,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    if (
      fallbackMode === "rule_based" &&
      (response.status >= 500 || /service unavailable|temporarily unavailable|gateway/i.test(errText))
    ) {
      return withResponseLanguage(localFallbackClassification(userText));
    }
    throw new Error(`LLM API error: ${errText}`);
  }

  const data = await response.json();
  const raw =
    data?.choices?.[0]?.message?.content ||
    data?.message?.content ||
    data?.response ||
    data?.output ||
    "";
  return withResponseLanguage(extractClassificationFromRaw(raw));
};
