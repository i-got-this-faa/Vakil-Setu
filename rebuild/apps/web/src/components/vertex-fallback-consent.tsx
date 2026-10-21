"use client";
import type { PilotLocale } from "@vakil/domain";

const notices = {
  en: "I also allow this case information, conversation and selected files to be sent to Google Cloud Vertex AI if the primary Google Gemini service has exhausted its quota. Either service may process the request; AI replies are preliminary legal information, not professional advice.",
  hi: "मुख्य Google Gemini सेवा का कोटा समाप्त होने पर मैं इस मामले की जानकारी, बातचीत और चुनी गई फ़ाइलें Google Cloud Vertex AI को भेजने की भी अनुमति देता/देती हूँ। अनुरोध को इनमें से कोई भी सेवा संसाधित कर सकती है। AI का उत्तर प्रारंभिक कानूनी जानकारी है, पेशेवर सलाह नहीं।",
  pa: "ਮੁੱਖ Google Gemini ਸੇਵਾ ਦਾ ਕੋਟਾ ਖ਼ਤਮ ਹੋਣ 'ਤੇ ਮੈਂ ਇਸ ਮਾਮਲੇ ਦੀ ਜਾਣਕਾਰੀ, ਗੱਲਬਾਤ ਅਤੇ ਚੁਣੀਆਂ ਫ਼ਾਈਲਾਂ Google Cloud Vertex AI ਨੂੰ ਭੇਜਣ ਦੀ ਵੀ ਇਜਾਜ਼ਤ ਦਿੰਦਾ/ਦਿੰਦੀ ਹਾਂ। ਦੋਵਾਂ ਵਿੱਚੋਂ ਕੋਈ ਵੀ ਸੇਵਾ ਬੇਨਤੀ ਨੂੰ ਸੰਭਾਲ ਸਕਦੀ ਹੈ। AI ਦਾ ਜਵਾਬ ਮੁੱਢਲੀ ਕਾਨੂੰਨੀ ਜਾਣਕਾਰੀ ਹੈ, ਪੇਸ਼ੇਵਰ ਸਲਾਹ ਨਹੀਂ।",
};
export function VertexFallbackConsentText({ enabled, locale }: { enabled: boolean; locale: PilotLocale }) {
  if (!enabled) return null;
  const language = locale === "hi" || locale === "pa" ? locale : "en";
  return <span lang={language === "en" ? "en-IN" : `${language}-IN`} dir="ltr" className="small-text" style={{ display: "block", marginBlockStart: 8 }}>{notices[language]}</span>;
}
