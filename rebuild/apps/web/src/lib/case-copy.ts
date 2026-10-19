import type { PilotLocale } from "@vakil/domain";

export type CaseNoSummaryCopy = {
  savedTitle: string;
  savedBody: string;
  noAnalysis: string;
  nextOptions: string;
  openSummary: string;
  findAdvocate: string;
  yourWordsNote: string;
  shortenSummary: string;
};

export const caseNoSummaryCopy: Record<PilotLocale, CaseNoSummaryCopy> = {
  en: {
    savedTitle: "Your concern is saved.",
    savedBody: "Below is exactly what you wrote. Nothing was added or changed.",
    noAnalysis: "No AI summary has been saved.",
    nextOptions: "Chat above, prepare a reviewed summary, or find an advocate.",
    openSummary: "Write your summary",
    findAdvocate: "Find an advocate",
    yourWordsNote: "Your words — review and shorten before sharing.",
    shortenSummary: "Shorten your summary to 4,000 characters before saving. Your full intake stays saved.",
  },
  hi: {
    savedTitle: "आपकी बात सहेज ली गई है।",
    savedBody: "नीचे वही है जो आपने लिखा था। इसमें कुछ जोड़ा या बदला नहीं गया है।",
    noAnalysis: "कोई AI सारांश सहेजा नहीं गया है।",
    nextOptions: "ऊपर चैट करें, जाँचा सारांश तैयार करें, या अधिवक्ता खोजें।",
    openSummary: "अपना सारांश लिखें",
    findAdvocate: "अधिवक्ता खोजें",
    yourWordsNote: "आपके शब्द — साझा करने से पहले जाँचें और छोटा करें।",
    shortenSummary: "सहेजने से पहले सारांश को 4,000 अक्षरों तक छोटा करें। आपका पूरा विवरण सुरक्षित है।",
  },
  pa: {
    savedTitle: "ਤੁਹਾਡੀ ਗੱਲ ਸੰਭਾਲ ਲਈ ਗਈ ਹੈ।",
    savedBody: "ਹੇਠਾਂ ਉਹੀ ਹੈ ਜੋ ਤੁਸੀਂ ਲਿਖਿਆ ਸੀ। ਇਸ ਵਿੱਚ ਕੁਝ ਜੋੜਿਆ ਜਾਂ ਬਦਲਿਆ ਨਹੀਂ ਗਿਆ ਹੈ।",
    noAnalysis: "ਕੋਈ AI ਸਾਰਾਂਸ਼ ਸੰਭਾਲਿਆ ਨਹੀਂ ਗਿਆ।",
    nextOptions: "ਉੱਪਰ ਚੈਟ ਕਰੋ, ਜਾਂਚਿਆ ਸਾਰਾਂਸ਼ ਤਿਆਰ ਕਰੋ, ਜਾਂ ਵਕੀਲ ਲੱਭੋ।",
    openSummary: "ਆਪਣਾ ਸਾਰਾਂਸ਼ ਲਿਖੋ",
    findAdvocate: "ਵਕੀਲ ਲੱਭੋ",
    yourWordsNote: "ਤੁਹਾਡੇ ਸ਼ਬਦ — ਸਾਂਝਾ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਜਾਂਚੋ ਅਤੇ ਛੋਟਾ ਕਰੋ।",
    shortenSummary: "ਸੰਭਾਲਣ ਤੋਂ ਪਹਿਲਾਂ ਸਾਰਾਂਸ਼ ਨੂੰ 4,000 ਅੱਖਰਾਂ ਤੱਕ ਛੋਟਾ ਕਰੋ। ਤੁਹਾਡਾ ਪੂਰਾ ਵੇਰਵਾ ਸੰਭਾਲਿਆ ਰਹੇਗਾ।",
  },
};
