/** BCP-47 tag for Web Speech API (STT recognition.lang / TTS utterance.lang). */
export function bcp47FromUiLanguage(pref) {
  if (pref === "english") return "en-IN";
  if (pref === "hindi") return "hi-IN";
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

export function speakWithWebSpeech(text, lang) {
  if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }
  const synth = window.speechSynthesis;
  const chunks = chunkSpeechText(text);
  if (!chunks.length) return;

  const requestedLang = lang || "en-IN";
  const voices = synth.getVoices();
  const matchedVoice =
    voices.find((v) => v.lang === requestedLang) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(requestedLang.toLowerCase().split("-")[0])) ||
    null;

  synth.cancel();
  synth.resume();

  for (const chunk of chunks) {
    const utter = new SpeechSynthesisUtterance(chunk);
    utter.lang = requestedLang;
    if (matchedVoice) utter.voice = matchedVoice;
    synth.speak(utter);
  }
}
