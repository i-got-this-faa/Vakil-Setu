/**
 * Device voices decide whether read-aloud is offered. A voice is never assumed:
 * if none matches the text's language, the control is disabled with an honest label.
 */
export interface DeviceVoice {
  readonly language?: string | undefined;
}

function normalizeTag(tag: string): string {
  return tag.trim().replaceAll("_", "-").toLowerCase();
}

function primarySubtag(tag: string): string {
  return normalizeTag(tag).split("-")[0] ?? "";
}

/**
 * Returns the language tag to pass to the speech engine, or null when the device
 * reports no voice for this language. Exact regional matches win; a primary-language
 * voice (for example "hi" for "hi-IN") is accepted when no regional match exists.
 */
export function chooseSpeechLanguage(voices: readonly DeviceVoice[], languageTag: string): string | null {
  const wanted = normalizeTag(languageTag);
  const reported = voices.map((voice) => voice.language).filter((tag): tag is string => typeof tag === "string" && tag.length > 0);
  if (reported.some((tag) => normalizeTag(tag) === wanted)) return languageTag;
  const primary = primarySubtag(languageTag);
  if (primary && reported.some((tag) => primarySubtag(tag) === primary)) return primary;
  return null;
}
