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

const localFallbackClassification = (userText) => {
  const text = String(userText || "").toLowerCase();
  const lang = inferUserLanguage(userText);

  let domain = "civil";
  if (/(divorce|marriage|custody|alimony|domestic|तलाक|परिवार)/.test(text)) domain = "family";
  else if (/(land|property|registry|tenant|rent|plot|ownership|संपत्ति|जमीन)/.test(text))
    domain = "property";
  else if (/(police|fir|arrest|bail|theft|assault|crime|criminal|गिरफ्तार|एफआईआर)/.test(text))
    domain = "criminal";

  let urgency = "low";
  if (/(urgent|soon|notice|deadline|court date|hearing|जल्दी|सुनवाई)/.test(text)) urgency = "medium";
  if (/(threat|violence|assault|illegal detention|harassment|हिंसा|धमकी)/.test(text)) urgency = "high";
  if (/(life threatening|emergency|kidnap|immediate danger)/.test(text)) urgency = "emergency";

  if (lang === "hi") {
    return {
      domain,
      response_language: "hi",
      domain_label:
        domain === "criminal"
          ? "आपराधिक कानून"
          : domain === "family"
            ? "पारिवारिक कानून"
            : domain === "property"
              ? "संपत्ति कानून"
              : "दीवानी मामला",
      urgency,
      summary:
        "एआई सेवा सीमित होने पर यह संक्षिप्त विश्लेषण स्थानीय नियमों पर आधारित है। कृपया पूरी जानकारी के साथ योग्य वकील से सलाह लें।",
      actions: [
        "सभी संबंधित कागजात एक जगह इकट्ठा करें।",
        "तारीखों और घटनाओं का क्रम लिख लें।",
        "क्षेत्र के अनुभवी वकील से अपॉइंटमेंट लें।",
        "बिना समझे कोई नया दस्तावेज़ हस्ताक्षरित न करें।",
        "आपात स्थिति में स्थानीय पुलिस या हेल्पलाइन से संपर्क करें।"
      ]
    };
  }

  return {
    domain,
    response_language: "en",
    domain_label:
      domain === "criminal"
        ? "Criminal law"
        : domain === "family"
          ? "Family law"
          : domain === "property"
            ? "Property law"
            : "Civil matters",
    urgency,
    summary:
      "This is a concise fallback analysis because the AI service is unavailable. Share full facts with a qualified advocate.",
    actions: [
      "Gather and organize all related documents.",
      "Write a dated timeline of events.",
      "Book a consultation with an advocate in the correct practice area.",
      "Avoid signing new undertakings without legal review.",
      "Use emergency channels if there is immediate danger."
    ]
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

  if (!apiKey) {
    throw new Error("LLM_API_KEY is missing.");
  }

  const withResponseLanguage = (classification) => ({
    ...classification,
    response_language: classification?.response_language || inferUserLanguage(userText || "")
  });

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
