/** BCP-47 tag for Web Speech API (STT recognition.lang / TTS utterance.lang). */
export function bcp47FromUiLanguage(pref) {
  if (pref === "english") return "en-IN";
  if (pref === "hindi") return "hi-IN";
  if (pref === "punjabi") return "pa-IN";
  if (typeof navigator !== "undefined" && navigator.language) return navigator.language;
  return "hi-IN";
}

function chunkSpeechText(rawText, maxLen = 220) {
  const text = String(rawText || "").replace(/\s+/g, " ").trim();
  if (!text) return [];

  const sentences = text.split(/(?<=[.!?।])\s+/).filter(Boolean);
  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    if (!current) {
      current = sentence;
      continue;
    }
    if ((current + " " + sentence).length <= maxLen) {
      current += ` ${sentence}`;
      continue;
    }
    chunks.push(current);
    current = sentence;
  }
  if (current) chunks.push(current);

  // Hard split ultra-long single sentences.
  const normalized = [];
  for (const c of chunks) {
    if (c.length <= maxLen) {
      normalized.push(c);
      continue;
    }
    for (let i = 0; i < c.length; i += maxLen) {
      normalized.push(c.slice(i, i + maxLen));
    }
  }
  return normalized.slice(0, 30);
}

// Device (browser) voice. Sends text to no server. Returns { cancel } or null when unsupported.
// handlers.onStart/onEnd fire once for the whole reply; cancellation is never reported as an error.
export function speakWithWebSpeech(text, lang, handlers = {}) {
  if (!text || typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    return null;
  }
  const synth = window.speechSynthesis;
  const chunks = chunkSpeechText(text);
  if (!chunks.length) return null;

  const requestedLang = lang || "en-IN";
  const voices = synth.getVoices();
  const matchedVoice =
    voices.find((v) => v.lang === requestedLang) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(requestedLang.toLowerCase().split("-")[0])) ||
    null;

  synth.cancel();
  synth.resume();

  let remaining = chunks.length;
  let started = false;
  for (const chunk of chunks) {
    const utter = new SpeechSynthesisUtterance(chunk);
    utter.lang = requestedLang;
    if (matchedVoice) utter.voice = matchedVoice;
    utter.onstart = () => {
      if (started) return;
      started = true;
      handlers.onStart?.();
    };
    utter.onend = () => {
      remaining -= 1;
      if (remaining === 0) handlers.onEnd?.();
    };
    utter.onerror = (event) => {
      if (event?.error === "canceled" || event?.error === "interrupted") return;
      handlers.onError?.("The device voice could not read this reply.");
    };
    synth.speak(utter);
  }
  return {
    cancel: () => {
      synth.cancel();
    },
    matchedVoice: Boolean(matchedVoice),
  };
}
