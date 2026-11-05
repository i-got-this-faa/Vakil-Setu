"use node";

import type { AiProvider, AiRequest, AiResult } from "./ai";
import { nativeGeminiProvider } from "./aiGemini";
import { nativeVertexProvider } from "./aiVertex";
import { geminiConfig } from "./provider";
import { vertexConfig } from "./vertexConfig";

// Only explicitly consented routes enter the chain. The caller owns the shared deadline.
export function aiRoutes(env: Record<string, string | undefined>, allowVertexFallback: boolean) {
  const gemini = geminiConfig(env);
  if (gemini.kind === "unavailable") return gemini;
  const vertex = vertexConfig(env);
  const providers: AiProvider[] = [nativeGeminiProvider(gemini)];
  if (allowVertexFallback && vertex.kind === "configured") providers.push(nativeVertexProvider(vertex));

  return { kind: "configured", providers } as const;
}

export async function generateWithQuotaFallback(providers: readonly AiProvider[], request: AiRequest, options: Parameters<AiProvider["generate"]>[1], beforeDispatch: (provider: AiProvider) => Promise<void>): Promise<{ result: AiResult; provider: AiProvider }> {
  for (const provider of providers) {
    options.signal.throwIfAborted();
    // Recheck ownership and persist the exact recipient BEFORE each outbound request.
    await beforeDispatch(provider);
    options.signal.throwIfAborted();
    const result = await provider.generate(request, options);
    if (result.kind !== "unavailable" || result.reason !== "rate_limited" || provider === providers.at(-1)) return { result, provider };
  }
  throw new Error("At least one configured provider required");
}
