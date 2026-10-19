import type { PilotLocale } from "@vakil/domain";

export const intakeChatCopy: Record<PilotLocale, { consent: string; send: string; pending: string; saveOnly: string; documents: string; failed: string; initialMessage: string }> = {
  en: {
    consent: "Send my reviewed intake to Google Gemini to start a private chat. Replies may be wrong and require professional review.",
    send: "Save and start AI chat", pending: "Saving and asking Gemini…", saveOnly: "Save privately without AI",
    documents: "You can upload PDF, JPG, PNG or TXT documents in your case chat after saving.",
    failed: "Your intake is saved, but the chat request could not be confirmed. Open your case to check or retry.",
    initialMessage: "Help me understand my saved concern and ask about any missing facts before suggesting next steps.",
  },
  hi: {
    consent: "निजी चैट शुरू करने के लिए मेरा जाँचा विवरण Google Gemini को भेजें। उत्तर गलत हो सकते हैं और पेशेवर समीक्षा आवश्यक है।",
    send: "सहेजें और AI चैट शुरू करें", pending: "सहेज रहे हैं और Gemini से पूछ रहे हैं…", saveOnly: "AI के बिना निजी रूप से सहेजें",
    documents: "सहेजने के बाद केस चैट में PDF, JPG, PNG या TXT दस्तावेज़ अपलोड कर सकते हैं।",
    failed: "आपका विवरण सहेजा गया है, लेकिन चैट अनुरोध की पुष्टि नहीं हो सकी। जाँचने या फिर कोशिश करने के लिए अपना केस खोलें।",
    initialMessage: "मेरे सहेजे विवरण को समझने में मदद करें और अगले कदम सुझाने से पहले छूटी जानकारी पूछें।",
  },
  pa: {
    consent: "ਨਿੱਜੀ ਚੈਟ ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਮੇਰਾ ਜਾਂਚਿਆ ਵੇਰਵਾ Google Gemini ਨੂੰ ਭੇਜੋ। ਜਵਾਬ ਗਲਤ ਹੋ ਸਕਦੇ ਹਨ ਅਤੇ ਪੇਸ਼ੇਵਰ ਸਮੀਖਿਆ ਲੋੜੀਂਦੀ ਹੈ।",
    send: "ਸੰਭਾਲੋ ਅਤੇ AI ਚੈਟ ਸ਼ੁਰੂ ਕਰੋ", pending: "ਸੰਭਾਲ ਰਹੇ ਹਾਂ ਅਤੇ Gemini ਨੂੰ ਪੁੱਛ ਰਹੇ ਹਾਂ…", saveOnly: "AI ਤੋਂ ਬਿਨਾਂ ਨਿੱਜੀ ਤੌਰ ਤੇ ਸੰਭਾਲੋ",
    documents: "ਸੰਭਾਲਣ ਤੋਂ ਬਾਅਦ ਕੇਸ ਚੈਟ ਵਿੱਚ PDF, JPG, PNG ਜਾਂ TXT ਦਸਤਾਵੇਜ਼ ਅੱਪਲੋਡ ਕਰ ਸਕਦੇ ਹੋ।",
    failed: "ਤੁਹਾਡਾ ਵੇਰਵਾ ਸੰਭਾਲਿਆ ਗਿਆ ਹੈ, ਪਰ ਚੈਟ ਬੇਨਤੀ ਦੀ ਪੁਸ਼ਟੀ ਨਹੀਂ ਹੋ ਸਕੀ। ਜਾਂਚਣ ਜਾਂ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਲਈ ਆਪਣਾ ਕੇਸ ਖੋਲ੍ਹੋ।",
    initialMessage: "ਮੇਰੇ ਸੰਭਾਲੇ ਵੇਰਵੇ ਨੂੰ ਸਮਝਣ ਵਿੱਚ ਮਦਦ ਕਰੋ ਅਤੇ ਅਗਲੇ ਕਦਮ ਦੱਸਣ ਤੋਂ ਪਹਿਲਾਂ ਗੁੰਮ ਜਾਣਕਾਰੀ ਪੁੱਛੋ।",
  },
};
