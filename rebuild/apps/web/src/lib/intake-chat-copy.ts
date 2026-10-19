import type { PilotLocale } from "@vakil/domain";

export const intakeChatCopy: Record<
  PilotLocale,
  {
    saveAndContinue: string;
    pending: string;
    documents: string;
  }
> = {
  en: {
    saveAndContinue: "Save and continue",
    pending: "Saving…",
    documents:
      "You can upload PDF, JPG, PNG or TXT documents in your case chat after saving.",
  },
  hi: {
    saveAndContinue: "सहेजें और आगे बढ़ें",
    pending: "सहेज रहे हैं…",
    documents:
      "सहेजने के बाद केस चैट में PDF, JPG, PNG या TXT दस्तावेज़ अपलोड कर सकते हैं।",
  },
  pa: {
    saveAndContinue: "ਸੰਭਾਲੋ ਅਤੇ ਅੱਗੇ ਵਧੋ",
    pending: "ਸੰਭਾਲ ਰਹੇ ਹਾਂ…",
    documents:
      "ਸੰਭਾਲਣ ਤੋਂ ਬਾਅਦ ਕੇਸ ਚੈਟ ਵਿੱਚ PDF, JPG, PNG ਜਾਂ TXT ਦਸਤਾਵੇਜ਼ ਅੱਪਲੋਡ ਕਰ ਸਕਦੇ ਹੋ।",
  },
};
