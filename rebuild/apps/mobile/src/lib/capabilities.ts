export interface AiCapabilityView {
  readonly configured: boolean;
  readonly retrievalConfigured?: boolean;
  readonly locales: readonly string[];
  readonly vertexFallback?: boolean;
}

/** AI is offered only when the server is configured and lists this exact locale. */
export function aiAllowedForLocale(capabilities: AiCapabilityView | undefined, locale: string): boolean {
  return Boolean((capabilities?.configured || capabilities?.retrievalConfigured) && capabilities.locales.includes(locale));
}

export function vertexFallbackEnabled(capabilities: AiCapabilityView | undefined): boolean {
  return capabilities?.vertexFallback === true;
}

