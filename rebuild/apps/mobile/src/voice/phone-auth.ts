/** Parse the public Clerk configuration before offering phone authentication. */
export function phoneSignInEnabled(environment: unknown): boolean {
  if (typeof environment !== "object" || environment === null || !("auth_config" in environment)) return false;
  const config = environment.auth_config;
  if (typeof config !== "object" || config === null) return false;
  return "phone_number" in config && (config.phone_number === "on" || config.phone_number === "required")
    && "first_factors" in config && Array.isArray(config.first_factors) && config.first_factors.includes("phone_code");
}

export function phoneAuthCopy(locale: string) {
  if (locale === "hi" || locale === "doi") return {
    unavailable: "फ़ोन से साइन इन अभी उपलब्ध नहीं है। कृपया बाद में फिर कोशिश करें।",
    retry: "फिर कोशिश करें", change: "नंबर बदलें", resend: "कोड फिर भेजें",
    incomplete: "खाता बनाने के लिए अतिरिक्त जानकारी चाहिए। कृपया ऐप सहायता से संपर्क करें।",
  };
  if (locale === "pa") return {
    unavailable: "ਫ਼ੋਨ ਨਾਲ ਸਾਈਨ ਇਨ ਇਸ ਵੇਲੇ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਬਾਅਦ ਵਿੱਚ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
    retry: "ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ", change: "ਨੰਬਰ ਬਦਲੋ", resend: "ਕੋਡ ਦੁਬਾਰਾ ਭੇਜੋ",
    incomplete: "ਖਾਤਾ ਬਣਾਉਣ ਲਈ ਹੋਰ ਜਾਣਕਾਰੀ ਚਾਹੀਦੀ ਹੈ। ਐਪ ਸਹਾਇਤਾ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।",
  };
  return {
    unavailable: "Phone sign-in is currently unavailable. Please try again later.",
    retry: "Try again", change: "Change number", resend: "Resend code",
    incomplete: "More information is required to create your account. Please contact app support.",
  };
}
