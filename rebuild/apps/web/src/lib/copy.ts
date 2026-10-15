import type { LegalDomain, PilotLocale } from "@vakil/domain";

// Product copy supplements the shared form/navigation dictionaries. No capability claims.
// Hindi/Punjabi entries are worker-drafted interface strings, not human-verified
// legal translations. See README for the exact untranslated remainder.
type ProductCopy = {
  tagline: string;
  advocateDesk: string;
  workspace: string;
  cases: string;
  notifications: string;
  concernTitle: string;
  concernDescription: string;
  shortTitle: string;
  intakeLanguage: string;
  reviewIntake: string;
  saveIntake: string;
  notSaved: string;
  noTranslation: string;
  voiceDisclosure: string;
  voiceConsent: string;
  transcriptReview: string;
  addTranscript: string;
  readAloud: {
    label: string;
    stop: string;
    empty: string;
    checking: string;
    unavailable: string;
    noVoice: string;
    ready: string;
    bundledReady: string;
    bundledStarting: string;
    bundledDisclosure: string;
    bundledError: string;
    bundledLimit: string;
    starting: string;
    speaking: string;
    finished: string;
    stopped: string;
    error: string;
    blocked: string;
  };
  headline: string;
  headlineAccent: string;
  heroDescription: string;
  startIntake: string;
  intakeTitlePlaceholder: string;
  intakeTextPlaceholder: string;
  intakeStaysNote: string;
  charactersUnit: string;
  saveUnavailable: string;
  intakeRoleNote: string;
  setupTitle: string;
  setupBody: string;
  setupNotSaved: string;
  accountDisabled: string;
  onboardingRoleFixed: string;
  followUpConsent: string;
  summaryConsent: string;
  aiConsent: string;
  cancelBeforeStart: string;
  selfDisableNote: string;
  matchesPractice: string;
  matchesLanguage: string;
  discoveryOrder: string;
  domainLabels: Record<LegalDomain, string>;
};

export const productCopy: Record<PilotLocale, ProductCopy> = {
  en: {
    tagline: "A bridge to legal clarity",
    advocateDesk: "Advocate desk",
    workspace: "My workspace",
    cases: "My cases",
    notifications: "Notifications",
    concernTitle: "Describe your concern.",
    concernDescription:
      "Include the facts, important dates, and what you need help with. Review the text before saving. This is a private intake, not a consultation request.",
    shortTitle: "A short title",
    intakeLanguage: "Intake language",
    reviewIntake:
      "I reviewed and corrected this text. I want to save it to my private account.",
    saveIntake: "Save reviewed intake",
    notSaved:
      "This text has not been saved. Configure the services and sign in before saving.",
    noTranslation:
      "Language selection describes your text. It does not automatically translate it.",
    voiceDisclosure:
      "Your browser may send audio to its vendor’s servers for recognition. Vakil Setu does not store an audio recording. Recognition in your language depends on the browser and is not guaranteed. Typed input is always available.",
    voiceConsent:
      "I understand this browser processing and choose to use my microphone.",
    transcriptReview: "Review final transcript",
    addTranscript: "Add reviewed text to intake",
    readAloud: {
      label: "Read aloud",
      stop: "Stop playback",
      empty: "Enter text before reading it aloud. If you recorded speech, add the reviewed transcript first.",
      checking: "Checking device voices…",
      unavailable: "Read-aloud is unavailable in this browser.",
      noVoice: "No local voice was found for the selected text language. Install a matching device voice to use read-aloud.",
      ready: "Ready to read this text using a local device voice. Pronunciation is unverified; remote voices are not used.",
      bundledReady: "Ready to read with the bundled local voice.",
      bundledStarting: "Preparing local speech… voice data is about 19 MB on first use.",
      bundledDisclosure: "Hindi and Punjabi use a synthetic voice inside your browser. Text is not sent to a speech service. Pronunciation is unverified.",
      bundledError: "Local speech could not complete. Check your connection while loading the voice files, then retry. No device voice installation is needed.",
      bundledLimit: "This text produces more than five minutes of audio. Use a shorter passage for local read-aloud; your text has not been changed.",
      starting: "Starting playback…",
      speaking: "Reading aloud…",
      finished: "Playback finished.",
      stopped: "Playback stopped.",
      error: "The device could not play this text. Check your audio output and installed speech voices, then try again.",
      blocked: "The browser blocked playback. Allow sound for this site, then click Read aloud again.",
    },
    headline: "Your next step.",
    headlineAccent: "A little clearer.",
    heroDescription:
      "Put your legal concern into words. Review a private summary. Connect with an approved advocate, at a time that works for you.",
    startIntake: "Start with your concern",
    intakeTitlePlaceholder: "For example, a rental deposit concern",
    intakeTextPlaceholder:
      "Describe what happened and what you would like to understand…",
    intakeStaysNote: "Text stays in this browser page until you save.",
    charactersUnit: "characters",
    saveUnavailable: "Save private intake — service unavailable",
    intakeRoleNote:
      "Intake and case requests are available to user accounts.",
    setupTitle: "Service setup is incomplete",
    setupBody:
      "Public information is readable. Sign-in, saved cases, advocate applications, and consultation requests need real Clerk and Convex configuration.",
    setupNotSaved: "Nothing entered here is saved to a server.",
    accountDisabled:
      "Your account is disabled. Private operations are unavailable.",
    onboardingRoleFixed:
      "Your account role is fixed after registration. Advocate accounts require a separate application and approval before appearing in discovery.",
    followUpConsent:
      "I reviewed this follow-up and want to append it to this case.",
    summaryConsent:
      "I have reviewed this summary and want to save a new version.",
    aiConsent:
      "I consent to send this saved intake and its saved follow-up context to the deployment's configured AI provider for a private draft summary. I will review any result.",
    cancelBeforeStart:
      "Cancellation is available only before the slot start.",
    selfDisableNote:
      "You cannot disable your own administrator account.",
    matchesPractice: "Matches selected practice area",
    matchesLanguage: "Profile lists your requested language",
    discoveryOrder: "Results are ordered by earliest requestable slot, then name. Profiles without an open slot appear last.",
    domainLabels: {
      criminal: "Criminal",
      civil: "Civil",
      family: "Family",
      property: "Property",
      employment: "Employment",
      consumer: "Consumer",
      other: "Other",
      unknown: "Not sure yet",
    },
  },
  hi: {
    tagline: "कानूनी समझ की ओर एक सेतु",
    advocateDesk: "अधिवक्ता कार्यस्थल",
    workspace: "मेरा कार्यस्थल",
    cases: "मेरे मामले",
    notifications: "सूचनाएँ",
    concernTitle: "अपनी समस्या बताइए।",
    concernDescription:
      "तथ्य, महत्वपूर्ण तिथियाँ और आपको किस मदद की ज़रूरत है, लिखिए। सहेजने से पहले पाठ जाँचिए। यह निजी विवरण है, परामर्श का अनुरोध नहीं।",
    shortTitle: "संक्षिप्त शीर्षक",
    intakeLanguage: "विवरण की भाषा",
    reviewIntake:
      "मैंने यह पाठ जाँचा और सुधारा है। मैं इसे अपने निजी खाते में सहेजना चाहता/चाहती हूँ।",
    saveIntake: "जाँचा हुआ विवरण सहेजें",
    notSaved:
      "यह पाठ सहेजा नहीं गया है। सहेजने के लिए सेवाओं का विन्यास और साइन इन ज़रूरी है।",
    noTranslation:
      "भाषा का चयन आपके पाठ की भाषा बताता है। इससे पाठ का स्वतः अनुवाद नहीं होता।",
    voiceDisclosure:
      "आवाज़ पहचानने के लिए आपका ब्राउज़र ऑडियो अपने प्रदाता के सर्वर पर भेज सकता है। वकील सेतु ऑडियो रिकॉर्डिंग सहेजता नहीं है। आपकी भाषा की पहचान ब्राउज़र पर निर्भर है और इसकी गारंटी नहीं है। आप हमेशा टाइप कर सकते हैं।",
    voiceConsent:
      "मैं ब्राउज़र द्वारा इस प्रक्रिया को समझता/समझती हूँ और माइक्रोफ़ोन इस्तेमाल करना चाहता/चाहती हूँ।",
    transcriptReview: "अंतिम प्रतिलेख जाँचें",
    addTranscript: "जाँचा हुआ पाठ विवरण में जोड़ें",
    readAloud: {
      label: "पाठ सुनें",
      stop: "सुनना रोकें",
      empty: "पाठ सुनने से पहले पाठ लिखें। अगर आपने आवाज़ रिकॉर्ड की है, तो पहले जाँचा हुआ प्रतिलेख जोड़ें।",
      checking: "डिवाइस की आवाज़ें जाँची जा रही हैं…",
      unavailable: "इस ब्राउज़र में पाठ सुनने की सुविधा उपलब्ध नहीं है।",
      noVoice: "चुनी गई पाठ की भाषा के लिए स्थानीय आवाज़ नहीं मिली। पाठ सुनने के लिए डिवाइस पर उस भाषा की आवाज़ स्थापित करें।",
      ready: "स्थानीय डिवाइस की आवाज़ में पाठ सुनने के लिए तैयार। उच्चारण की जाँच नहीं हुई है; दूरस्थ आवाज़ों का उपयोग नहीं होता।",
      bundledReady: "ऐप की स्थानीय आवाज़ में पाठ सुनने के लिए तैयार।",
      bundledStarting: "स्थानीय आवाज़ तैयार हो रही है… पहली बार लगभग 19 MB आवाज़ डेटा लोड होगा।",
      bundledDisclosure: "हिन्दी और पंजाबी के लिए आपके ब्राउज़र में कृत्रिम आवाज़ बनती है। पाठ किसी आवाज़ सेवा को नहीं भेजा जाता। उच्चारण की जाँच नहीं हुई है।",
      bundledError: "स्थानीय आवाज़ पूरी नहीं हो सकी। आवाज़ की फ़ाइलें लोड होते समय कनेक्शन जाँचें और फिर कोशिश करें। डिवाइस पर आवाज़ स्थापित करने की ज़रूरत नहीं है।",
      bundledLimit: "इस पाठ से पाँच मिनट से अधिक आवाज़ बनती है। सुनने के लिए छोटा अंश चुनें; आपका पाठ बदला नहीं गया है।",
      starting: "पाठ सुनाना शुरू हो रहा है…",
      speaking: "पाठ सुनाया जा रहा है…",
      finished: "पाठ सुनाना पूरा हुआ।",
      stopped: "पाठ सुनाना रोक दिया गया।",
      error: "डिवाइस यह पाठ सुना नहीं सका। ऑडियो आउटपुट और स्थापित आवाज़ें जाँचकर फिर कोशिश करें।",
      blocked: "ब्राउज़र ने आवाज़ रोक दी। इस साइट के लिए ध्वनि की अनुमति देकर फिर पाठ सुनें पर क्लिक करें।",
    },
    headline: "आपका अगला कदम।",
    headlineAccent: "कुछ और स्पष्ट।",
    heroDescription:
      "अपनी कानूनी समस्या शब्दों में लिखिए। निजी सारांश जाँचिए। अपने लिए उपयुक्त समय पर स्वीकृत अधिवक्ता से जुड़िए।",
    startIntake: "अपनी समस्या से शुरुआत करें",
    intakeTitlePlaceholder: "उदाहरण: किराए की जमानत संबंधी समस्या",
    intakeTextPlaceholder:
      "बताइए क्या हुआ और आप क्या समझना चाहते हैं…",
    intakeStaysNote: "पाठ सहेजने तक इसी ब्राउज़र पन्ने में रहता है।",
    charactersUnit: "अक्षर",
    saveUnavailable: "निजी विवरण सहेजें — सेवा अनुपलब्ध",
    intakeRoleNote:
      "विवरण और मामले का अनुरोध केवल उपयोगकर्ता खातों के लिए है।",
    setupTitle: "सेवा की स्थापना अधूरी है",
    setupBody:
      "सार्वजनिक जानकारी देखी जा सकती है। साइन इन, सहेजे गए मामले, अधिवक्ता आवेदन और परामर्श अनुरोध के लिए असली Clerk और Convex विन्यास ज़रूरी है।",
    setupNotSaved: "यहाँ दर्ज कुछ भी सर्वर पर सहेजा नहीं जाता।",
    accountDisabled:
      "आपका खाता निष्क्रिय है। निजी कार्य उपलब्ध नहीं हैं।",
    onboardingRoleFixed:
      "पंजीकरण के बाद खाते की भूमिका तय रहती है। अधिवक्ता खातों को खोज में दिखने से पहले अलग आवेदन और स्वीकृति चाहिए।",
    followUpConsent:
      "मैंने यह अतिरिक्त जानकारी जाँची है और इसे इस मामले में जोड़ना चाहता/चाहती हूँ।",
    summaryConsent:
      "मैंने यह सारांश जाँचा है और नया संस्करण सहेजना चाहता/चाहती हूँ।",
    aiConsent:
      "मैं सहमति देता/देती हूँ कि यह सहेजा विवरण और इसकी सहेजी अतिरिक्त जानकारी निजी मसौदा सारांश के लिए निर्धारित AI प्रदाता को भेजी जाए। मैं हर परिणाम जाँचूँगा/जाँचूँगी।",
    cancelBeforeStart:
      "रद्द करना केवल स्लॉट शुरू होने से पहले उपलब्ध है।",
    selfDisableNote:
      "आप अपना खुद का प्रशासक खाता निष्क्रिय नहीं कर सकते।",
    matchesPractice: "चुने गए कार्यक्षेत्र से मेल",
    matchesLanguage: "प्रोफ़ाइल में आपकी माँगी गई भाषा दर्ज है",
    discoveryOrder: "परिणाम पहले उपलब्ध स्लॉट के समय, फिर नाम के अनुसार हैं। खाली स्लॉट के बिना प्रोफ़ाइल अंत में हैं।",
    domainLabels: {
      criminal: "आपराधिक",
      civil: "दीवानी",
      family: "परिवार",
      property: "संपत्ति",
      employment: "रोज़गार",
      consumer: "उपभोक्ता",
      other: "अन्य",
      unknown: "अभी स्पष्ट नहीं",
    },
  },
  pa: {
    tagline: "ਕਾਨੂੰਨੀ ਸਮਝ ਵੱਲ ਇੱਕ ਪੁਲ",
    advocateDesk: "ਵਕੀਲ ਕਾਰਜਸਥਾਨ",
    workspace: "ਮੇਰਾ ਕਾਰਜਸਥਾਨ",
    cases: "ਮੇਰੇ ਮਾਮਲੇ",
    notifications: "ਸੂਚਨਾਵਾਂ",
    concernTitle: "ਆਪਣੀ ਸਮੱਸਿਆ ਦੱਸੋ।",
    concernDescription:
      "ਤੱਥ, ਅਹਿਮ ਤਾਰੀਖਾਂ ਅਤੇ ਤੁਹਾਨੂੰ ਕਿਹੜੀ ਮਦਦ ਚਾਹੀਦੀ ਹੈ, ਲਿਖੋ। ਸੰਭਾਲਣ ਤੋਂ ਪਹਿਲਾਂ ਪਾਠ ਜਾਂਚੋ। ਇਹ ਨਿੱਜੀ ਵੇਰਵਾ ਹੈ, ਸਲਾਹ ਲਈ ਬੇਨਤੀ ਨਹੀਂ।",
    shortTitle: "ਛੋਟਾ ਸਿਰਲੇਖ",
    intakeLanguage: "ਵੇਰਵੇ ਦੀ ਭਾਸ਼ਾ",
    reviewIntake:
      "ਮੈਂ ਇਹ ਪਾਠ ਜਾਂਚਿਆ ਅਤੇ ਸੁਧਾਰਿਆ ਹੈ। ਮੈਂ ਇਸਨੂੰ ਆਪਣੇ ਨਿੱਜੀ ਖਾਤੇ ਵਿੱਚ ਸੰਭਾਲਣਾ ਚਾਹੁੰਦਾ/ਚਾਹੁੰਦੀ ਹਾਂ।",
    saveIntake: "ਜਾਂਚਿਆ ਵੇਰਵਾ ਸੰਭਾਲੋ",
    notSaved:
      "ਇਹ ਪਾਠ ਸੰਭਾਲਿਆ ਨਹੀਂ ਗਿਆ। ਸੰਭਾਲਣ ਲਈ ਸੇਵਾਵਾਂ ਦੀ ਸੰਰਚਨਾ ਅਤੇ ਸਾਈਨ ਇਨ ਲੋੜੀਂਦਾ ਹੈ।",
    noTranslation:
      "ਭਾਸ਼ਾ ਦੀ ਚੋਣ ਤੁਹਾਡੇ ਪਾਠ ਦੀ ਭਾਸ਼ਾ ਦੱਸਦੀ ਹੈ। ਇਹ ਆਪਣੇ ਆਪ ਅਨੁਵਾਦ ਨਹੀਂ ਕਰਦੀ।",
    voiceDisclosure:
      "ਆਵਾਜ਼ ਪਛਾਣਨ ਲਈ ਤੁਹਾਡਾ ਬ੍ਰਾਊਜ਼ਰ ਆਡੀਓ ਆਪਣੇ ਪ੍ਰਦਾਤਾ ਦੇ ਸਰਵਰਾਂ ਨੂੰ ਭੇਜ ਸਕਦਾ ਹੈ। ਵਕੀਲ ਸੇਤੂ ਆਡੀਓ ਰਿਕਾਰਡਿੰਗ ਸੰਭਾਲਦਾ ਨਹੀਂ ਹੈ। ਤੁਹਾਡੀ ਭਾਸ਼ਾ ਦੀ ਪਛਾਣ ਬ੍ਰਾਊਜ਼ਰ ਉੱਤੇ ਨਿਰਭਰ ਹੈ ਅਤੇ ਇਸਦੀ ਗਾਰੰਟੀ ਨਹੀਂ ਹੈ। ਤੁਸੀਂ ਹਮੇਸ਼ਾ ਟਾਈਪ ਕਰ ਸਕਦੇ ਹੋ।",
    voiceConsent:
      "ਮੈਂ ਬ੍ਰਾਊਜ਼ਰ ਦੀ ਇਸ ਪ੍ਰਕਿਰਿਆ ਨੂੰ ਸਮਝਦਾ/ਸਮਝਦੀ ਹਾਂ ਅਤੇ ਮਾਈਕ੍ਰੋਫ਼ੋਨ ਵਰਤਣਾ ਚੁਣਦਾ/ਚੁਣਦੀ ਹਾਂ।",
    transcriptReview: "ਅੰਤਿਮ ਲਿਖਤ ਜਾਂਚੋ",
    addTranscript: "ਜਾਂਚਿਆ ਪਾਠ ਵੇਰਵੇ ਵਿੱਚ ਜੋੜੋ",
    readAloud: {
      label: "ਪਾਠ ਸੁਣੋ",
      stop: "ਸੁਣਨਾ ਰੋਕੋ",
      empty: "ਪਾਠ ਸੁਣਨ ਤੋਂ ਪਹਿਲਾਂ ਪਾਠ ਲਿਖੋ। ਜੇ ਤੁਸੀਂ ਆਵਾਜ਼ ਰਿਕਾਰਡ ਕੀਤੀ ਹੈ, ਤਾਂ ਪਹਿਲਾਂ ਜਾਂਚੀ ਲਿਖਤ ਜੋੜੋ।",
      checking: "ਡਿਵਾਈਸ ਦੀਆਂ ਆਵਾਜ਼ਾਂ ਜਾਂਚੀਆਂ ਜਾ ਰਹੀਆਂ ਹਨ…",
      unavailable: "ਇਸ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਪਾਠ ਸੁਣਨ ਦੀ ਸਹੂਲਤ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।",
      noVoice: "ਚੁਣੀ ਪਾਠ ਦੀ ਭਾਸ਼ਾ ਲਈ ਸਥਾਨਕ ਆਵਾਜ਼ ਨਹੀਂ ਮਿਲੀ। ਪਾਠ ਸੁਣਨ ਲਈ ਡਿਵਾਈਸ ਉੱਤੇ ਉਸ ਭਾਸ਼ਾ ਦੀ ਆਵਾਜ਼ ਸਥਾਪਤ ਕਰੋ।",
      ready: "ਸਥਾਨਕ ਡਿਵਾਈਸ ਦੀ ਆਵਾਜ਼ ਵਿੱਚ ਪਾਠ ਸੁਣਨ ਲਈ ਤਿਆਰ। ਉਚਾਰਨ ਦੀ ਜਾਂਚ ਨਹੀਂ ਹੋਈ; ਦੂਰ ਦੀਆਂ ਆਵਾਜ਼ਾਂ ਨਹੀਂ ਵਰਤੀਆਂ ਜਾਂਦੀਆਂ।",
      bundledReady: "ਐਪ ਦੀ ਸਥਾਨਕ ਆਵਾਜ਼ ਵਿੱਚ ਪਾਠ ਸੁਣਨ ਲਈ ਤਿਆਰ।",
      bundledStarting: "ਸਥਾਨਕ ਆਵਾਜ਼ ਤਿਆਰ ਹੋ ਰਹੀ ਹੈ… ਪਹਿਲੀ ਵਾਰ ਲਗਭਗ 19 MB ਆਵਾਜ਼ ਡਾਟਾ ਲੋਡ ਹੋਵੇਗਾ।",
      bundledDisclosure: "ਹਿੰਦੀ ਅਤੇ ਪੰਜਾਬੀ ਲਈ ਤੁਹਾਡੇ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਨਕਲੀ ਆਵਾਜ਼ ਬਣਦੀ ਹੈ। ਪਾਠ ਕਿਸੇ ਆਵਾਜ਼ ਸੇਵਾ ਨੂੰ ਨਹੀਂ ਭੇਜਿਆ ਜਾਂਦਾ। ਉਚਾਰਨ ਦੀ ਜਾਂਚ ਨਹੀਂ ਹੋਈ ਹੈ।",
      bundledError: "ਸਥਾਨਕ ਆਵਾਜ਼ ਪੂਰੀ ਨਹੀਂ ਹੋ ਸਕੀ। ਆਵਾਜ਼ ਦੀਆਂ ਫ਼ਾਈਲਾਂ ਲੋਡ ਹੋਣ ਵੇਲੇ ਕਨੈਕਸ਼ਨ ਜਾਂਚੋ ਅਤੇ ਫਿਰ ਕੋਸ਼ਿਸ਼ ਕਰੋ। ਡਿਵਾਈਸ ਉੱਤੇ ਆਵਾਜ਼ ਸਥਾਪਤ ਕਰਨ ਦੀ ਲੋੜ ਨਹੀਂ ਹੈ।",
      bundledLimit: "ਇਸ ਪਾਠ ਤੋਂ ਪੰਜ ਮਿੰਟ ਤੋਂ ਵੱਧ ਆਵਾਜ਼ ਬਣਦੀ ਹੈ। ਸੁਣਨ ਲਈ ਛੋਟਾ ਹਿੱਸਾ ਚੁਣੋ; ਤੁਹਾਡਾ ਪਾਠ ਬਦਲਿਆ ਨਹੀਂ ਗਿਆ ਹੈ।",
      starting: "ਪਾਠ ਸੁਣਾਉਣਾ ਸ਼ੁਰੂ ਹੋ ਰਿਹਾ ਹੈ…",
      speaking: "ਪਾਠ ਸੁਣਾਇਆ ਜਾ ਰਿਹਾ ਹੈ…",
      finished: "ਪਾਠ ਸੁਣਾਉਣਾ ਪੂਰਾ ਹੋਇਆ।",
      stopped: "ਪਾਠ ਸੁਣਾਉਣਾ ਰੋਕ ਦਿੱਤਾ ਗਿਆ।",
      error: "ਡਿਵਾਈਸ ਇਹ ਪਾਠ ਸੁਣਾ ਨਹੀਂ ਸਕਿਆ। ਆਡੀਓ ਆਉਟਪੁੱਟ ਅਤੇ ਸਥਾਪਤ ਆਵਾਜ਼ਾਂ ਜਾਂਚ ਕੇ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
      blocked: "ਬ੍ਰਾਊਜ਼ਰ ਨੇ ਆਵਾਜ਼ ਰੋਕ ਦਿੱਤੀ। ਇਸ ਸਾਈਟ ਲਈ ਆਵਾਜ਼ ਦੀ ਇਜਾਜ਼ਤ ਦੇ ਕੇ ਮੁੜ ਪਾਠ ਸੁਣੋ ਉੱਤੇ ਕਲਿੱਕ ਕਰੋ।",
    },
    headline: "ਤੁਹਾਡਾ ਅਗਲਾ ਕਦਮ।",
    headlineAccent: "ਕੁਝ ਹੋਰ ਸਪਸ਼ਟ।",
    heroDescription:
      "ਆਪਣੀ ਕਾਨੂੰਨੀ ਸਮੱਸਿਆ ਸ਼ਬਦਾਂ ਵਿੱਚ ਲਿਖੋ। ਨਿੱਜੀ ਸਾਰਾਂਸ਼ ਜਾਂਚੋ। ਤੁਹਾਡੇ ਲਈ ਢੁਕਵੇਂ ਸਮੇਂ ਉੱਤੇ ਮਨਜ਼ੂਰਸ਼ੁਦਾ ਵਕੀਲ ਨਾਲ ਜੁੜੋ।",
    startIntake: "ਆਪਣੀ ਸਮੱਸਿਆ ਤੋਂ ਸ਼ੁਰੂ ਕਰੋ",
    intakeTitlePlaceholder: "ਉਦਾਹਰਨ: ਕਿਰਾਏ ਦੀ ਜ਼ਮਾਨਤ ਸਬੰਧੀ ਸਮੱਸਿਆ",
    intakeTextPlaceholder:
      "ਦੱਸੋ ਕੀ ਹੋਇਆ ਅਤੇ ਤੁਸੀਂ ਕੀ ਸਮਝਣਾ ਚਾਹੁੰਦੇ ਹੋ…",
    intakeStaysNote: "ਪਾਠ ਸੰਭਾਲਣ ਤੱਕ ਇਸੇ ਬ੍ਰਾਊਜ਼ਰ ਪੰਨੇ ਵਿੱਚ ਰਹਿੰਦਾ ਹੈ।",
    charactersUnit: "ਅੱਖਰ",
    saveUnavailable: "ਨਿੱਜੀ ਵੇਰਵਾ ਸੰਭਾਲੋ — ਸੇਵਾ ਉਪਲਬਧ ਨਹੀਂ",
    intakeRoleNote:
      "ਵੇਰਵਾ ਅਤੇ ਮਾਮਲੇ ਦੀ ਬੇਨਤੀ ਸਿਰਫ਼ ਵਰਤੋਂਕਾਰ ਖਾਤਿਆਂ ਲਈ ਹੈ।",
    setupTitle: "ਸੇਵਾ ਦੀ ਸਥਾਪਨਾ ਅਧੂਰੀ ਹੈ",
    setupBody:
      "ਜਨਤਕ ਜਾਣਕਾਰੀ ਵੇਖੀ ਜਾ ਸਕਦੀ ਹੈ। ਸਾਈਨ ਇਨ, ਸੰਭਾਲੇ ਮਾਮਲੇ, ਵਕੀਲ ਅਰਜ਼ੀਆਂ ਅਤੇ ਸਲਾਹ ਬੇਨਤੀਆਂ ਲਈ ਅਸਲੀ Clerk ਅਤੇ Convex ਸੰਰਚਨਾ ਲੋੜੀਂਦੀ ਹੈ।",
    setupNotSaved: "ਇੱਥੇ ਦਰਜ ਕੁਝ ਵੀ ਸਰਵਰ ਉੱਤੇ ਸੰਭਾਲਿਆ ਨਹੀਂ ਜਾਂਦਾ।",
    accountDisabled:
      "ਤੁਹਾਡਾ ਖਾਤਾ ਅਯੋਗ ਹੈ। ਨਿੱਜੀ ਕਾਰਵਾਈਆਂ ਉਪਲਬਧ ਨਹੀਂ ਹਨ।",
    onboardingRoleFixed:
      "ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਤੋਂ ਬਾਅਦ ਖਾਤੇ ਦੀ ਭੂਮਿਕਾ ਪੱਕੀ ਰਹਿੰਦੀ ਹੈ। ਵਕੀਲ ਖਾਤਿਆਂ ਨੂੰ ਖੋਜ ਵਿੱਚ ਦਿਖਣ ਤੋਂ ਪਹਿਲਾਂ ਵੱਖਰੀ ਅਰਜ਼ੀ ਅਤੇ ਪ੍ਰਵਾਨਗੀ ਚਾਹੀਦੀ ਹੈ।",
    followUpConsent:
      "ਮੈਂ ਇਹ ਵਾਧੂ ਜਾਣਕਾਰੀ ਜਾਂਚੀ ਹੈ ਅਤੇ ਇਸਨੂੰ ਇਸ ਮਾਮਲੇ ਵਿੱਚ ਜੋੜਨਾ ਚਾਹੁੰਦਾ/ਚਾਹੁੰਦੀ ਹਾਂ।",
    summaryConsent:
      "ਮੈਂ ਇਹ ਸਾਰਾਂਸ਼ ਜਾਂਚਿਆ ਹੈ ਅਤੇ ਨਵਾਂ ਸੰਸਕਰਣ ਸੰਭਾਲਣਾ ਚਾਹੁੰਦਾ/ਚਾਹੁੰਦੀ ਹਾਂ।",
    aiConsent:
      "ਮੈਂ ਸਹਿਮਤੀ ਦਿੰਦਾ/ਦਿੰਦੀ ਹਾਂ ਕਿ ਇਹ ਸੰਭਾਲਿਆ ਵੇਰਵਾ ਅਤੇ ਇਸਦੀ ਸੰਭਾਲੀ ਵਾਧੂ ਜਾਣਕਾਰੀ ਨਿੱਜੀ ਮਸੌਦਾ ਸਾਰਾਂਸ਼ ਲਈ ਨਿਰਧਾਰਤ AI ਪ੍ਰਦਾਤਾ ਨੂੰ ਭੇਜੀ ਜਾਵੇ। ਮੈਂ ਹਰ ਨਤੀਜਾ ਜਾਂਚਾਂਗਾ/ਜਾਂਚਾਂਗੀ।",
    cancelBeforeStart:
      "ਰੱਦ ਕਰਨਾ ਸਿਰਫ਼ ਸਲਾਟ ਸ਼ੁਰੂ ਹੋਣ ਤੋਂ ਪਹਿਲਾਂ ਉਪਲਬਧ ਹੈ।",
    selfDisableNote:
      "ਤੁਸੀਂ ਆਪਣਾ ਖੁਦ ਦਾ ਪ੍ਰਬੰਧਕ ਖਾਤਾ ਅਯੋਗ ਨਹੀਂ ਕਰ ਸਕਦੇ।",
    matchesPractice: "ਚੁਣੇ ਕਾਰਜ ਖੇਤਰ ਨਾਲ ਮੇਲ",
    matchesLanguage: "ਪ੍ਰੋਫ਼ਾਈਲ ਵਿੱਚ ਤੁਹਾਡੀ ਮੰਗੀ ਭਾਸ਼ਾ ਦਰਜ ਹੈ",
    discoveryOrder: "ਨਤੀਜੇ ਸਭ ਤੋਂ ਪਹਿਲੇ ਉਪਲਬਧ ਸਲਾਟ ਦੇ ਸਮੇਂ, ਫਿਰ ਨਾਮ ਅਨੁਸਾਰ ਹਨ। ਖੁੱਲ੍ਹੇ ਸਲਾਟ ਬਿਨਾਂ ਪ੍ਰੋਫ਼ਾਈਲ ਅੰਤ ਵਿੱਚ ਹਨ।",
    domainLabels: {
      criminal: "ਫ਼ੌਜਦਾਰੀ",
      civil: "ਦੀਵਾਨੀ",
      family: "ਪਰਿਵਾਰ",
      property: "ਜਾਇਦਾਦ",
      employment: "ਰੁਜ਼ਗਾਰ",
      consumer: "ਖਪਤਕਾਰ",
      other: "ਹੋਰ",
      unknown: "ਹਾਲੇ ਪਤਾ ਨਹੀਂ",
    },
  },
};
