import type { PilotLocale } from "@vakil/domain";

export interface ChatCopy {
  title: string;
  description: string;
  intakeDisclosure: string;
  disclaimer: string;
  turnsLimitReached: string;
  loadingTurns: string;
  loadingDocuments: string;
  noTurns: string;
  youLabel: string;
  assistantLabel: string;
  pendingStatus: string;
  readAloudLabel: string;
  removedAttachment: string;
  historyTitle: string;

  // Documents
  documentsTitle: string;
  documentsGuidance: string;
  uploadButton: string;
  uploading: string;
  removeButton: string;
  removing: string;
  noDocuments: string;
  selectCheckboxLabel: (fileName: string) => string;
  documentCount: (current: number, max: number) => string;
  selectedAttachmentsCount: (
    current: number,
    max: number,
    currentBytes: string,
    maxBytes: string,
  ) => string;

  // Form / Send
  messageLabel: string;
  messagePlaceholder: string;
  charCount: (current: number, max: number) => string;
  consentLabel: string;
  sendButton: string;
  sending: string;
  retryButton: string;
  restoreMessage: string;

  // Errors / validation
  errors: {
    emptyMessage: string;
    consentRequired: string;
    sendBusy: string;
    doubleSubmitPrevented: string;
    maxFilesReached: string;
    fileTooLarge: string;
    invalidFileType: string;
    uploadFailed: string;
    removeFailed: string;
    maxAttachmentsSelected: string;
    attachmentsTooLarge: string;
    timeout: string;
    in_progress: string;
    rate_limited: string;
    limit_exceeded: string;
    provider_failed: string;
    response_too_large: string;
    truncated: string;
    blocked: string;
    malformed: string;
    state_changed: string;
    generic: string;
  };
}

export const chatCopy: Record<PilotLocale, ChatCopy> = {
  en: {
    title: "Case discussion & preparation",
    description:
      "Clarify your situation and prepare for consultation. Your original intake, recent conversation turns, and explicitly selected attachments are sent to Google Gemini for contextual assistance.",
    intakeDisclosure:
      "Original intake, recent conversation, and selected files will be sent to Google Gemini. Uploaded files are stored privately in your case until explicitly selected for a message.",
    disclaimer:
      "Preliminary informational help only. Does not constitute formal legal advice or guarantees. Please verify all guidance with an enrolled advocate.",
    turnsLimitReached:
      "This case chat has reached the maximum of 100 turns. No more messages can be sent.",
    loadingTurns: "Loading conversation history…",
    loadingDocuments: "Loading documents…",
    noTurns:
      "No messages yet. Ask a question or share details about your case below.",
    youLabel: "You",
    assistantLabel: "Vakil Setu Assistant (Google Gemini)",
    pendingStatus: "Waiting for response from Gemini…",
    readAloudLabel: "Read response aloud",
    removedAttachment: "Removed attachment",
    historyTitle: "Conversation history",

    documentsTitle: "Case documents & attachments",
    documentsGuidance:
      "Upload PDF, PNG, JPEG, or plain text (.txt) up to 3 MiB each (max 5 per case). Uploading stores files privately in your case. Files are never auto-sent: select the checkbox on any file to include it in your next message (max 3 files, combined up to 6 MiB).",
    uploadButton: "Upload file",
    uploading: "Uploading…",
    removeButton: "Remove",
    removing: "Removing…",
    noDocuments: "No private documents uploaded for this case.",
    selectCheckboxLabel: (fileName: string) => `Include "${fileName}" in next send`,
    documentCount: (current: number, max: number) =>
      `${current} of ${max} case documents stored`,
    selectedAttachmentsCount: (
      current: number,
      max: number,
      currentBytes: string,
      maxBytes: string,
    ) => `${current}/${max} attached (${currentBytes} / ${maxBytes})`,

    messageLabel: "Message",
    messagePlaceholder:
      "Ask a specific question or describe changes in your legal situation…",
    charCount: (current: number, max: number) =>
      `${current.toLocaleString()} / ${max.toLocaleString()} characters`,
    consentLabel:
      "I understand that my original intake, recent conversation, and selected documents will be sent to Google Gemini for assistance.",
    sendButton: "Send message",
    sending: "Sending message…",
    retryButton: "Retry message",
    restoreMessage: "Review and try again",

    errors: {
      emptyMessage: "Please enter a message before sending.",
      consentRequired:
        "Consent is required before sending your message and attachments to Google Gemini.",
      sendBusy: "A message is currently being sent. Please wait.",
      doubleSubmitPrevented:
        "Submission in progress. Multiple clicks have been blocked.",
      maxFilesReached:
        "Limit reached: You can upload at most 5 documents per case. Remove a document first to add another.",
      fileTooLarge:
        "The selected file exceeds the 3 MiB limit. Please select a smaller file.",
      invalidFileType:
        "Unsupported file type. Only PDF, PNG, JPEG, and plain text (.txt) files are supported.",
      uploadFailed: "Document upload failed. Please try again.",
      removeFailed: "Could not remove document. Please try again.",
      maxAttachmentsSelected:
        "You can select at most 3 attachments per message.",
      attachmentsTooLarge:
        "The combined size of selected attachments exceeds 6 MiB. Deselect a file to continue.",
      timeout: "The AI reply took too long. Your case is saved. Review this message and send it again.",
      in_progress: "A message is currently being processed for this case.",
      rate_limited:
        "The service message limit was reached. Please wait before sending again.",
      limit_exceeded:
        "Chat or document limit reached. Please check document limits.",
      provider_failed:
        "The AI service is temporarily unavailable. Review your message and send again.",
      response_too_large:
        "The model response exceeded the maximum size limit.",
      truncated: "The model response was truncated.",
      blocked: "The response was blocked by content safety filters.",
      malformed: "Received an invalid response from the AI provider.",
      state_changed:
        "Case state changed during processing. Please review and retry.",
      generic:
        "This request could not be completed. Your message has been preserved; you may retry.",
    },
  },
  hi: {
    title: "मामले पर चर्चा और तैयारी",
    description:
      "अपनी स्थिति को स्पष्ट करें और परामर्श के लिए तैयारी करें। आपकी सहायता के लिए आपका मूल विवरण, हालिया संदेश और चयनित दस्तावेज़ Google Gemini को भेजे जाते हैं।",
    intakeDisclosure:
      "मूल विवरण, हालिया बातचीत और चयनित फ़ाइलें Google Gemini को भेजी जाएंगी। अपलोड की गई फ़ाइलें आपके मामले में निजी तौर पर सुरक्षित रहती हैं, जब तक कि आप उन्हें संदेश में शामिल करने के लिए न चुनें।",
    disclaimer:
      "केवल प्रारंभिक सूचनात्मक सहायता। यह औपचारिक कानूनी सलाह या आश्वासन नहीं है। कृपया किसी पंजीकृत अधिवक्ता से सभी जानकारी सत्यापित करें।",
    turnsLimitReached:
      "इस मामले की चैट 100 संदेशों की अधिकतम सीमा तक पहुँच चुकी है। अब और संदेश नहीं भेजे जा सकते।",
    loadingTurns: "बातचीत का इतिहास लोड हो रहा है…",
    loadingDocuments: "दस्तावेज़ लोड हो रहे हैं…",
    noTurns:
      "अभी तक कोई संदेश नहीं है। नीचे अपने मामले के बारे में प्रश्न पूछें या विवरण साझा करें।",
    youLabel: "आप",
    assistantLabel: "वकील सेतु सहायक (Google Gemini)",
    pendingStatus: "Gemini से उत्तर की प्रतीक्षा की जा रही है…",
    readAloudLabel: "उत्तर बोलकर सुनें",
    removedAttachment: "हटाया गया दस्तावेज़",
    historyTitle: "बातचीत का इतिहास",

    documentsTitle: "मामले के दस्तावेज़ और संलग्नक",
    documentsGuidance:
      "PDF, PNG, JPEG, या साधारण टेक्स्ट (.txt) अपलोड करें, प्रत्येक अधिकतम 3 MiB (प्रति मामला अधिकतम 5)। अपलोड करने से फ़ाइलें केवल आपके मामले में सुरक्षित रहती हैं। फ़ाइलें कभी अपने आप नहीं भेजी जातीं: संदेश में शामिल करने के लिए चेकबॉक्स चुनें (अधिकतम 3 फ़ाइलें, कुल 6 MiB तक)।",
    uploadButton: "फ़ाइल अपलोड करें",
    uploading: "अपलोड हो रहा है…",
    removeButton: "हटाएं",
    removing: "हटाया जा रहा है…",
    noDocuments: "इस मामले के लिए कोई निजी दस्तावेज़ अपलोड नहीं किया गया है।",
    selectCheckboxLabel: (fileName: string) =>
      `अगले संदेश में "${fileName}" शामिल करें`,
    documentCount: (current: number, max: number) =>
      `${max} में से ${current} दस्तावेज़ सहेजे गए`,
    selectedAttachmentsCount: (
      current: number,
      max: number,
      currentBytes: string,
      maxBytes: string,
    ) => `${current}/${max} संलग्न (${currentBytes} / ${maxBytes})`,

    messageLabel: "संदेश",
    messagePlaceholder:
      "कोई विशिष्ट प्रश्न पूछें या अपनी कानूनी स्थिति में आए बदलाव बताएं…",
    charCount: (current: number, max: number) =>
      `${current.toLocaleString()} / ${max.toLocaleString()} अक्षर`,
    consentLabel:
      "मैं समझता/समझती हूँ कि मेरा मूल विवरण, हालिया बातचीत और चयनित दस्तावेज़ सहायता के लिए Google Gemini को भेजे जाएंगे।",
    sendButton: "संदेश भेजें",
    sending: "संदेश भेजा जा रहा है…",
    retryButton: "पुनः प्रयास करें",
    restoreMessage: "जाँचें और फिर कोशिश करें",

    errors: {
      emptyMessage: "कृपया भेजने से पहले एक संदेश लिखें।",
      consentRequired:
        "संदेश और संलग्नक Google Gemini को भेजने से पहले सहमति आवश्यक है।",
      sendBusy: "संदेश अभी भेजा जा रहा है। कृपया प्रतीक्षा करें।",
      doubleSubmitPrevented:
        "प्रक्रिया जारी है। एकाधिक क्लिक अवरुद्ध कर दिए गए हैं।",
      maxFilesReached:
        "सीमा समाप्त: आप प्रति मामला अधिकतम 5 दस्तावेज़ अपलोड कर सकते हैं। नया जोड़ने के लिए पहले किसी दस्तावेज़ को हटाएं।",
      fileTooLarge:
        "चयनित फ़ाइल 3 MiB की सीमा से बड़ी है। कृपया छोटी फ़ाइल चुनें।",
      invalidFileType:
        "असमर्थित फ़ाइल प्रकार। केवल PDF, PNG, JPEG और सादा टेक्स्ट (.txt) स्वीकार्य हैं।",
      uploadFailed: "दस्तावेज़ अपलोड विफल रहा। कृपया पुनः प्रयास करें।",
      removeFailed: "दस्तावेज़ नहीं हटाया जा सका। कृपया पुनः प्रयास करें।",
      maxAttachmentsSelected:
        "आप प्रति संदेश अधिकतम 3 संलग्नक चुन सकते हैं।",
      attachmentsTooLarge:
        "चयनित संलग्नकों का कुल आकार 6 MiB से अधिक है। जारी रखने के लिए किसी फ़ाइल का चयन हटाएं।",
      timeout: "अनुरोध का समय समाप्त हो गया। आप पुनः प्रयास कर सकते हैं।",
      in_progress: "इस मामले के लिए वर्तमान में एक संदेश प्रक्रिया में है।",
      rate_limited:
        "दर सीमा समाप्त (प्रति घंटे 20 संदेश)। कृपया पुनः भेजने से पहले प्रतीक्षा करें।",
      limit_exceeded:
        "चैट या दस्तावेज़ की सीमा समाप्त हो गई है। कृपया दस्तावेज़ सीमाओं की जांच करें।",
      provider_failed:
        "AI सेवा अस्थायी रूप से अनुपलब्ध है। अपना संदेश जाँचकर फिर भेजें।",
      response_too_large: "उत्तर आकार सीमा से अधिक लंबा था।",
      truncated: "उत्तर अधूरा रह गया।",
      blocked: "सुरक्षा कारणों से सामग्री रोक दी गई।",
      malformed: "AI सेवा से अमान्य उत्तर प्राप्त हुआ।",
      state_changed:
        "प्रक्रिया के दौरान मामले की स्थिति बदल गई। कृपया समीक्षा करें और पुनः प्रयास करें।",
      generic:
        "यह अनुरोध पूरा नहीं हो सका। आपका संदेश सुरक्षित है; आप पुनः प्रयास कर सकते हैं।",
    },
  },
  pa: {
    title: "ਕੇਸ ਬਾਰੇ ਚਰਚਾ ਅਤੇ ਤਿਆਰੀ",
    description:
      "ਆਪਣੀ ਸਥਿਤੀ ਨੂੰ ਸਪੱਸ਼ਟ ਕਰੋ ਅਤੇ ਸਲਾਹ ਲਈ ਤਿਆਰੀ ਕਰੋ। ਤੁਹਾਡੀ ਮਦਦ ਲਈ ਤੁਹਾਡਾ ਮੂਲ ਵੇਰਵਾ, ਤਾਜ਼ਾ ਗੱਲਬਾਤ ਅਤੇ ਚੁਣੀਆਂ ਗਈਆਂ ਫਾਈਲਾਂ Google Gemini ਨੂੰ ਭੇਜੀਆਂ ਜਾਂਦੀਆਂ ਹਨ।",
    intakeDisclosure:
      "ਮੂਲ ਵੇਰਵਾ, ਤਾਜ਼ਾ ਗੱਲਬਾਤ ਅਤੇ ਚੁਣੀਆਂ ਗਈਆਂ ਫਾਈਲਾਂ Google Gemini ਨੂੰ ਭੇਜੀਆਂ ਜਾਣਗੀਆਂ। ਅਪਲੋਡ ਕੀਤੀਆਂ ਫਾਈਲਾਂ ਤੁਹਾਡੇ ਕੇਸ ਵਿੱਚ ਨਿੱਜੀ ਤੌਰ 'ਤੇ ਸੁਰੱਖਿਅਤ ਰਹਿੰਦੀਆਂ ਹਨ, ਜਦੋਂ ਤੱਕ ਤੁਸੀਂ ਸੁਨੇਹੇ ਲਈ ਚੁਣ ਨਹੀਂ ਲੈਂਦੇ।",
    disclaimer:
      "ਸਿਰਫ਼ ਮੁੱਢਲੀ ਜਾਣਕਾਰੀ ਵਾਲੀ ਸਹਾਇਤਾ। ਇਹ ਕੋਈ ਰਸਮੀ ਕਾਨੂੰਨੀ ਸਲਾਹ ਜਾਂ ਗਰੰਟੀ ਨਹੀਂ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਕਿਸੇ ਰਜਿਸਟਰਡ ਵਕੀਲ ਨਾਲ ਸਾਰੀ ਜਾਣਕਾਰੀ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ।",
    turnsLimitReached:
      "ਇਸ ਕੇਸ ਦੀ ਚੈਟ 100 ਸੁਨੇਹਿਆਂ ਦੀ ਅਧਿਕਤਮ ਸੀਮਾ ਤੱਕ ਪਹੁੰਚ ਚੁੱਕੀ ਹੈ। ਹੋਰ ਸੁਨੇਹੇ ਨਹੀਂ ਭੇਜੇ ਜਾ ਸਕਦੇ।",
    loadingTurns: "ਗੱਲਬਾਤ ਦਾ ਇਤਿਹਾਸ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…",
    loadingDocuments: "ਦਸਤਾਵੇਜ਼ ਲੋਡ ਹੋ ਰਹੇ ਹਨ…",
    noTurns:
      "ਅਜੇ ਤੱਕ ਕੋਈ ਸੁਨੇਹਾ ਨਹੀਂ ਹੈ। ਹੇਠਾਂ ਆਪਣੇ ਕੇਸ ਬਾਰੇ ਸਵਾਲ ਪੁੱਛੋ ਜਾਂ ਵੇਰਵੇ ਸਾਂਝੇ ਕਰੋ।",
    youLabel: "ਤੁਸੀਂ",
    assistantLabel: "ਵਕੀਲ ਸੇਤੂ ਸਹਾਇਕ (Google Gemini)",
    pendingStatus: "Gemini ਤੋਂ ਜਵਾਬ ਦੀ ਉਡੀਕ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ…",
    readAloudLabel: "ਜਵਾਬ ਬੋਲ ਕੇ ਸੁਣੋ",
    removedAttachment: "ਹਟਾਇਆ ਗਿਆ ਦਸਤਾਵੇਜ਼",
    historyTitle: "ਗੱਲਬਾਤ ਦਾ ਇਤਿਹਾਸ",

    documentsTitle: "ਕੇਸ ਦੇ ਦਸਤਾਵੇਜ਼ ਅਤੇ ਅਟੈਚਮੈਂਟ",
    documentsGuidance:
      "PDF, PNG, JPEG, ਜਾਂ ਸਾਦਾ ਟੈਕਸਟ (.txt) ਅਪਲੋਡ ਕਰੋ, ਹਰੇਕ ਵੱਧ ਤੋਂ ਵੱਧ 3 MiB (ਪ੍ਰਤੀ ਕੇਸ ਵੱਧ ਤੋਂ ਵੱਧ 5)। ਅਪਲੋਡ ਕਰਨ ਨਾਲ ਫਾਈਲਾਂ ਸਿਰਫ਼ ਤੁਹਾਡੇ ਕੇਸ ਵਿੱਚ ਨਿੱਜੀ ਤੌਰ 'ਤੇ ਰਹਿੰਦੀਆਂ ਹਨ। ਫਾਈਲਾਂ ਕਦੇ ਆਪਣੇ-ਆਪ ਨਹੀਂ ਭੇਜੀਆਂ ਜਾਂਦੀਆਂ: ਸੁਨੇਹੇ ਵਿੱਚ ਸ਼ਾਮਲ ਕਰਨ ਲਈ ਚੈੱਕਬਾਕਸ ਚੁਣੋ (ਵੱਧ ਤੋਂ ਵੱਧ 3 ਫਾਈਲਾਂ, ਕੁੱਲ 6 MiB ਤੱਕ)।",
    uploadButton: "ਫਾਈਲ ਅਪਲੋਡ ਕਰੋ",
    uploading: "ਅਪਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…",
    removeButton: "ਹਟਾਓ",
    removing: "ਹਟਾਇਆ ਜਾ ਰਿਹਾ ਹੈ…",
    noDocuments: "ਇਸ ਕੇਸ ਲਈ ਕੋਈ ਨਿੱਜੀ ਦਸਤਾਵੇਜ਼ ਅਪਲੋਡ ਨਹੀਂ ਕੀਤਾ ਗਿਆ।",
    selectCheckboxLabel: (fileName: string) =>
      `ਅਗਲੇ ਸੁਨੇਹੇ ਵਿੱਚ "${fileName}" ਸ਼ਾਮਲ ਕਰੋ`,
    documentCount: (current: number, max: number) =>
      `${max} ਵਿੱਚੋਂ ${current} ਦਸਤਾਵੇਜ਼ ਸਾਂਭੇ ਗਏ`,
    selectedAttachmentsCount: (
      current: number,
      max: number,
      currentBytes: string,
      maxBytes: string,
    ) => `${current}/${max} ਨੱਥੀ (${currentBytes} / ${maxBytes})`,

    messageLabel: "ਸੁਨੇਹਾ",
    messagePlaceholder:
      "ਕੋਈ ਖਾਸ ਸਵਾਲ ਪੁੱਛੋ ਜਾਂ ਆਪਣੀ ਕਾਨੂੰਨੀ ਸਥਿਤੀ ਵਿੱਚ ਆਏ ਬਦਲਾਅ ਦੱਸੋ…",
    charCount: (current: number, max: number) =>
      `${current.toLocaleString()} / ${max.toLocaleString()} ਅੱਖਰ`,
    consentLabel:
      "ਮੈਂ ਸਮਝਦਾ/ਸਮਝਦੀ ਹਾਂ ਕਿ ਮੇਰਾ ਮੂਲ ਵੇਰਵਾ, ਤਾਜ਼ਾ ਗੱਲਬਾਤ ਅਤੇ ਚੁਣੇ ਗਏ ਦਸਤਾਵੇਜ਼ ਮਦਦ ਲਈ Google Gemini ਨੂੰ ਭੇਜੇ ਜਾਣਗੇ।",
    sendButton: "ਸੁਨੇਹਾ ਭੇਜੋ",
    sending: "ਸੁਨੇਹਾ ਭੇਜਿਆ ਜਾ ਰਿਹਾ ਹੈ…",
    retryButton: "ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ",
    restoreMessage: "ਜਾਂਚੋ ਅਤੇ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ",

    errors: {
      emptyMessage: "ਕਿਰਪਾ ਕਰਕੇ ਭੇਜਣ ਤੋਂ ਪਹਿਲਾਂ ਸੁਨੇਹਾ ਲਿਖੋ।",
      consentRequired:
        "ਸੁਨੇਹਾ ਅਤੇ ਅਟੈਚਮੈਂਟ Google Gemini ਨੂੰ ਭੇਜਣ ਤੋਂ ਪਹਿਲਾਂ ਸਹਿਮਤੀ ਲਾਜ਼ਮੀ ਹੈ।",
      sendBusy: "ਸੁਨੇਹਾ ਇਸ ਵੇਲੇ ਭੇਜਿਆ ਜਾ ਰਿਹਾ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਉਡੀਕ ਕਰੋ।",
      doubleSubmitPrevented:
        "ਕਾਰਵਾਈ ਜਾਰੀ ਹੈ। ਵਾਰ-ਵਾਰ ਕਲਿੱਕ ਰੋਕ ਦਿੱਤੇ ਗਏ ਹਨ।",
      maxFilesReached:
        "ਸੀਮਾ ਸਮਾਪਤ: ਤੁਸੀਂ ਪ੍ਰਤੀ ਕੇਸ ਵੱਧ ਤੋਂ ਵੱਧ 5 ਦਸਤਾਵੇਜ਼ ਅਪਲੋਡ ਕਰ ਸਕਦੇ ਹੋ। ਨਵਾਂ ਜੋੜਨ ਲਈ ਪਹਿਲਾਂ ਕੋਈ ਦਸਤਾਵੇਜ਼ ਹਟਾਓ।",
      fileTooLarge:
        "ਚੁਣੀ ਗਈ ਫਾਈਲ 3 MiB ਦੀ ਸੀਮਾ ਤੋਂ ਵੱਡੀ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਛੋਟੀ ਫਾਈਲ ਚੁਣੋ।",
      invalidFileType:
        "ਅਸਮਰਥਿਤ ਫਾਈਲ ਕਿਸਮ। ਸਿਰਫ਼ PDF, PNG, JPEG ਅਤੇ ਸਾਦਾ ਟੈਕਸਟ (.txt) ਸਵੀਕਾਰ ਕੀਤੇ ਜਾਂਦੇ ਹਨ।",
      uploadFailed: "ਦਸਤਾਵੇਜ਼ ਅਪਲੋਡ ਅਸਫਲ ਰਿਹਾ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
      removeFailed: "ਦਸਤਾਵੇਜ਼ ਹਟਾਇਆ ਨਹੀਂ ਜਾ ਸਕਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
      maxAttachmentsSelected:
        "ਤੁਸੀਂ ਪ੍ਰਤੀ ਸੁਨੇਹਾ ਵੱਧ ਤੋਂ ਵੱਧ 3 ਅਟੈਚਮੈਂਟ ਚੁਣ ਸਕਦੇ ਹੋ।",
      attachmentsTooLarge:
        "ਚੁਣੀਆਂ ਗਈਆਂ ਅਟੈਚਮੈਂਟਾਂ ਦਾ ਕੁੱਲ ਆਕਾਰ 6 MiB ਤੋਂ ਵੱਧ ਹੈ। ਜਾਰੀ ਰੱਖਣ ਲਈ ਕਿਸੇ ਫਾਈਲ ਦੀ ਚੋਣ ਹਟਾਓ।",
      timeout: "ਬੇਨਤੀ ਦਾ ਸਮਾਂ ਸਮਾਪਤ ਹੋ ਗਿਆ। ਤੁਸੀਂ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰ ਸਕਦੇ ਹੋ।",
      in_progress: "ਇਸ ਕੇਸ ਲਈ ਇਸ ਵੇਲੇ ਇੱਕ ਸੁਨੇਹਾ ਪ੍ਰਕਿਰਿਆ ਵਿੱਚ ਹੈ।",
      rate_limited:
        "ਦਰ ਸੀਮਾ ਸਮਾਪਤ (ਪ੍ਰਤੀ ਘੰਟਾ 20 ਸੁਨੇਹੇ)। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਭੇਜਣ ਤੋਂ ਪਹਿਲਾਂ ਉਡੀਕ ਕਰੋ।",
      limit_exceeded:
        "ਚੈਟ ਜਾਂ ਦਸਤਾਵੇਜ਼ ਦੀ ਸੀਮਾ ਸਮਾਪਤ ਹੋ ਗਈ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਸੀਮਾਵਾਂ ਦੀ ਜਾਂਚ ਕਰੋ।",
      provider_failed:
        "AI ਸੇਵਾ ਆਰਜ਼ੀ ਤੌਰ 'ਤੇ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
      response_too_large: "ਜਵਾਬ ਆਕਾਰ ਸੀਮਾ ਤੋਂ ਵੱਡਾ ਸੀ।",
      truncated: "ਜਵਾਬ ਅਧੂਰਾ ਰਹਿ ਗਿਆ।",
      blocked: "ਸੁਰੱਖਿਆ ਕਾਰਨਾਂ ਕਰਕੇ ਸਮੱਗਰੀ ਰੋਕ ਦਿੱਤੀ ਗਈ।",
      malformed: "AI ਸੇਵਾ ਤੋਂ ਅਵੈਧ ਜਵਾਬ ਮਿਲਿਆ।",
      state_changed:
        "ਪ੍ਰਕਿਰਿਆ ਦੌਰਾਨ ਕੇਸ ਦੀ ਸਥਿਤੀ ਬਦਲ ਗਈ। ਕਿਰਪਾ ਕਰਕੇ ਸਮੀਖਿਆ ਕਰੋ ਅਤੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
      generic:
        "ਇਹ ਬੇਨਤੀ ਪੂਰੀ ਨਹੀਂ ਹੋ ਸਕੀ। ਤੁਹਾਡਾ ਸੁਨੇਹਾ ਸੁਰੱਖਿਅਤ ਹੈ; ਤੁਸੀਂ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰ ਸਕਦੇ ਹੋ।",
    },
  },
};
