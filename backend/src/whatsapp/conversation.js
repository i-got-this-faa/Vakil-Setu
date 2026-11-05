import { digest } from "../services/legalCorpus.js";
import { legalReply, citationMessage } from "./legalReply.js";

const yes = (text) => (/^(yes|haan|han|हाँ|हां|जी|ok|okay|confirm)\b|^(हाँ|हां|जी)(?:\s|$|,)/i.test(text.trim())) && !/\b(no|not|don't|nahi|nahin)\b|नहीं|नही|मत/i.test(text);
const no = (text) => /^(no|nahi|नहीं|नही)(?:\b|\s|$|,)/i.test(text.trim());
const domainOf = (text) => /theft|chori|चोरी|bail|arrest|police/i.test(text) ? "criminal" : /land|tenant|property|possession/i.test(text) ? "property" : /marriage|divorce|custody/i.test(text) ? "family" : "civil";
const choose = (text) => /\b(first|one|1)\b|पहला|पहले/i.test(text) ? 0 : /\b(second|two|2)\b|दूसरा|दूसरे/i.test(text) ? 1 : -1;
const msg = (text, language = "en", kind = "audio") => ({ kind, text, language });
const local = (session, english, hindi) => session.language === "hi" ? hindi : english;

export async function planConversation({ session: previous, text, sender, jobId, advocates, requests = [], demo, sandboxProfiles = false, supportedLanguages = demo ? ["en"] : ["en", "hi"], answer = legalReply }) {
  const demoProfiles = demo || sandboxProfiles;
  const session = structuredClone(previous || { phase: "new", language: "en", consent: false });
  const reply = (en, hi = en) => ({ session, messages: [msg(local(session, en, hi), session.language)] });
  const command = text.trim().replace(/[.!?।]+$/u, "").trim();
  if (/^(?:(?:please|can you|could you) )?repeat\b|^(?:please )?say that again(?: please)?$/i.test(command)) {
    // Replaying is harmless; tolerate imperfect ASR after the clear repeat intent.
    const saved = /answer|last/i.test(command) && !/message/i.test(command) ? session.lastLegalReply || session.lastSpokenReply : session.lastSpokenReply;
    return reply(saved || "There is no previous reply to repeat yet. Please describe your legal question.");
  }
  if (!session.consent) {
    if (session.phase !== "consent") {
      session.phase = "consent";
      return reply(`Welcome to Vakil Setu. ${demo ? "This is a local demonstration, not a live WhatsApp service. " : sandboxProfiles ? "This sandbox demonstration uses fictional advocate profiles. " : ""}I can search legal reference sources and help request a consultation. This is general information, not a lawyer's advice. May I store this conversation and your consultation request locally? Say yes and your preferred language.${supportedLanguages.length === 1 ? " This setup currently supports English only." : " English and Hindi are available when supported by the speech provider."}`);
    }
    if (no(text)) return reply("No case details will be collected. Say yes, English if you want to begin later.");
    if (!yes(text)) return reply("Please say yes to consent or no to decline. You can include your preferred language.");
    const hindi = /Hindi|हिंदी|हिन्दी|हाँ|हां/i.test(text);
    if (hindi && !supportedLanguages.includes("hi")) return reply("This speech setup supports English only. Please say yes, English. Hindi needs a configured and evaluated Hindi speech provider.");
    session.language = hindi ? "hi" : "en";
    session.consent = true;
    session.consentedAt = new Date().toISOString();
    session.phase = "question";
    return reply("Thank you. Describe your legal question in a voice message.", "धन्यवाद। अपना कानूनी सवाल आवाज़ में बताइए।");
  }
  if (/^(?:help|what can you do|what should I say)(?: please)?$/i.test(command)) {
    const prompts = { city: "Please say your city.", choice: "Say first or second to choose an offered advocate, or cancel.", time: "Give your preferred day, time and consultation mode, or say cancel.", confirm: "Listen to the request details, then say yes to approve sharing or no to change the time.", cancel_request: "Say yes to cancel the saved request or no to keep it." };
    return reply(`${prompts[session.phase] || "Ask a legal question or say find a lawyer."} You can also say repeat, request status, cancel my request, or start a new case.`);
  }
  if (/^(?:start over|start (?:a )?new case|new case|reset)$/i.test(command)) {
    return { session: { consent: true, consentedAt: session.consentedAt, language: session.language, phase: "question", requestId: session.requestId }, messages: [msg("A new case is ready. Existing consultation requests are unchanged. Please describe your question.", session.language)] };
  }
  const owned = requests.filter((request) => request.sender === sender);
  const current = owned.find((request) => request.id === session.requestId) || owned.at(-1);
  if (/request status|booking status|appointment status|मेरी.*स्थिति/i.test(text)) {
    if (!current) return reply("You have not submitted a consultation request yet. Say find a lawyer to begin.");
    if (current.status === "cancelled") return reply(`Your consultation request ${current.id} is cancelled. No payment was taken through this request workflow.`);
    return reply(`Your consultation request ${current.id} is ${current.status === "requested" ? "pending advocate acceptance" : current.status}. No appointment time or payment has been confirmed by this service.${current.demo ? " No real advocate has been contacted in this demo." : ""}`);
  }
  if (/^(?:please )?cancel (?:my |the )?(?:consultation |appointment |booking )?request$|^cancel (?:my |the )?(?:appointment|booking|consultation)$/i.test(command)) {
    if (!current) return reply("There is no saved consultation request to cancel. Say cancel to discard a request you are still drafting.");
    if (current.status === "cancelled") return reply(`Your request ${current.id} is already cancelled.`);
    if (current.status !== "requested") return reply("This request needs staff review before cancellation. No change has been made.");
    session.phase = "cancel_request";
    session.cancellingRequestId = current.id;
    return reply(`Do you want to cancel request ${current.id} with ${current.advocateName}? Say yes to cancel or no to keep the request. No payment or refund will be processed.`);
  }
  if (session.phase === "cancel_request") {
    if (no(text) || /^cancel$/i.test(command)) {
      session.phase = "question";
      delete session.cancellingRequestId;
      return reply("Your saved request is unchanged. You can ask another question.");
    }
    if (!yes(text)) return reply("Please say yes to cancel the saved request or no to keep it.");
    const request = owned.find((record) => record.id === session.cancellingRequestId);
    session.phase = "question";
    delete session.cancellingRequestId;
    if (!request || request.status !== "requested") return reply("The request is no longer pending. No cancellation was made.");
    return { ...reply(`Your consultation request ${request.id} is cancelled. No payment or refund was processed.`), requestUpdate: { id: request.id, expectedStatus: "requested", status: "cancelled", cancelledAt: new Date().toISOString() } };
  }
  if (/^(cancel|कैंसल|रद्द)$/i.test(command) && ["city", "choice", "time", "confirm"].includes(session.phase)) {
    session.phase = "question";
    delete session.choices;
    delete session.selected;
    delete session.timePreference;
    return reply("The consultation draft is cancelled. No request was submitted.", "परामर्श का ड्राफ्ट रद्द हो गया है। कोई अनुरोध नहीं भेजा गया।");
  }
  if (session.phase === "city") {
    if (!text.trim() || text.length > 100) return reply("Please say only your city.", "कृपया केवल अपने शहर का नाम बताइए।");
    session.city = text.trim().replace(/^(?:I(?:'m| am)|we(?:'re| are)) (?:in|from) /i, "").replace(/[.!?।]+$/u, "").trim();
    const language = session.language === "hi" ? "Hindi" : "English";
    session.choices = advocates.filter((a) => (demoProfiles ? a.demo === true : a.verified === true && a.demo !== true) && a.city.toLowerCase() === session.city.toLowerCase() && a.expertise.includes(session.domain || "civil") && a.languages.includes(language)).slice(0, 2);
    if (!session.choices.length) {
      session.phase = "question";
      return reply(`No ${demoProfiles ? "sample" : "verified"} advocate matching your city, language and issue is configured. You can ask another legal question.`, "आपके शहर, भाषा और मामले के लिए कोई सत्यापित वकील उपलब्ध नहीं है। आप दूसरा कानूनी सवाल पूछ सकते हैं।");
    }
    session.phase = "choice";
    const options = session.choices.map((a, i) => `${i + 1}. ${a.name}, ${a.city}, ${a.languages.join(" and ")}`).join(". ");
    return reply(`${demoProfiles ? "These are fictional demonstration profiles. " : ""}I heard your city as ${session.city}. ${options}. Fees and times require advocate confirmation. Say first${session.choices.length > 1 ? " or second" : ""} to choose, or cancel.`, `${session.city} के लिए ये विकल्प हैं। ${options}। फीस और समय की पुष्टि वकील करेंगे। चुनने के लिए पहला या दूसरा कहें, या रद्द करने के लिए कैंसल कहें।`);
  }
  if (session.phase === "choice") {
    const index = choose(text);
    if (index < 0 || !session.choices[index]) return reply("Please say the number of one of the offered advocates, or cancel.");
    session.selected = session.choices[index];
    session.phase = "time";
    return reply("What day and time would you prefer, and would you like a phone consultation or an in-person meeting? This is a preference, not a reserved slot.", "आप किस दिन और समय पर परामर्श चाहते हैं? फोन पर बात करना चाहेंगे या मिलना चाहेंगे? अभी समय आरक्षित नहीं हुआ है।");
  }
  if (session.phase === "time") {
    if (!text.trim() || text.length > 300) return reply("Please give a short preferred day, time and consultation mode.");
    session.timePreference = text.trim();
    session.phase = "confirm";
    return reply(`Please confirm: ${session.selected.name}, in ${session.city}, speaking ${session.language === "hi" ? "Hindi" : "English"}. Your preference is: ${session.timePreference}. Fees and availability are not confirmed, and no payment will be taken. May I save a request and share your case summary with this selected advocate? Say yes to confirm or no to change the time.${demoProfiles ? " This demonstration saves a local request only and contacts nobody." : ""}`, `${session.selected.name}, शहर ${session.city}। आपकी पसंद: ${session.timePreference}। फीस और उपलब्धता की पुष्टि नहीं हुई है। क्या मैं अनुरोध सुरक्षित करूँ और आपके मामले का सार इस वकील के साथ साझा करने की अनुमति दर्ज करूँ? हाँ या नहीं कहें।`);
  }
  if (session.phase === "confirm") {
    if (no(text)) {
      session.phase = "time";
      return reply("Nothing has been submitted. Please give a different time preference or say cancel.");
    }
    if (!yes(text)) return reply("Please say yes to approve the request and sharing, no to change the time, or cancel.");
    const requestId = `VS-${digest(jobId).slice(0, 8).toUpperCase()}`;
    const request = {
      id: requestId, sender, advocateId: session.selected.id, advocateName: session.selected.name,
      city: session.city, language: session.language, timePreference: session.timePreference,
      caseSummary: session.lastQuestion || "User requested a consultation without a case summary.",
      sharingConsentAt: new Date().toISOString(), status: "requested", paymentStatus: "not_requested", demo: demoProfiles
    };
    session.phase = "question";
    session.requestId = requestId;
    delete session.choices;
    return { session, request, messages: [msg(local(session,
      `Your request ${requestId} has been saved, pending advocate acceptance. It is not a confirmed appointment. No payment has been taken.${demoProfiles ? " This is a demonstration; no real advocate was contacted." : " Staff must process the request; it has not automatically been sent to an advocate."}`,
      `आपका अनुरोध ${requestId} सुरक्षित कर दिया गया है। वकील की स्वीकृति बाकी है; अपॉइंटमेंट की पुष्टि नहीं हुई है और कोई भुगतान नहीं लिया गया है।`), session.language)] };
  }
  if (/find.*lawyer|book.*lawyer|consult.*lawyer|advocate|वकील|वक़ील/i.test(text)) {
    session.phase = "city";
    session.domain ||= domainOf(session.lastQuestion || text);
    return reply("Which city are you in? I will use your current conversation language to find matching advocates.", "आप किस शहर में हैं? मैं बातचीत की भाषा के अनुसार वकील खोजूँगा।");
  }
  if (/\blawyer\b/i.test(text) && !/theft|property|case|arrest|police|divorce/i.test(text)) return reply("Would you like help finding a lawyer? Say find a lawyer, or describe your legal question.");
  if (text.trim().split(/\s+/).length < 4 && !/theft|chori|चोरी|property|land|bail|arrest|fir|divorce|custody|assault|hit|section|धारा|संपत्ति/i.test(text)) return reply("Please describe your legal question in a complete sentence, or say find a lawyer.");
  session.lastQuestion = text;
  session.domain = domainOf(text);
  const result = await answer(text, { language: session.language });
  const messages = [msg(result.spoken, session.language)];
  session.lastLegalReply = result.spoken;
  if (result.citations?.length) messages.push(msg(citationMessage(result.citations), session.language, "text"));
  return { session, messages, evidence: { status: result.status, generationMode: result.generationMode, citations: result.citations } };
}
