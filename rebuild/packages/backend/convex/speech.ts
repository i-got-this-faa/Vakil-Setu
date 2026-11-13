import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, query } from "./_generated/server";
import { AiDeadlineError, withAiDeadline } from "./lib/ai";
import { speechCapabilities, speechConfig, speechResult, synthesizeElevenLabs, SPEECH_LIMITS } from "./lib/speech";
import type { SpeechResult } from "./lib/speech";

// Public, secret-free configuration. Does not reveal the API key or voice ID.
export const capabilities = query({
  args: {},
  returns: v.object({
    configured: v.boolean(),
    reason: v.optional(v.union(v.literal("not_configured"), v.literal("invalid_config"))),
    provider: v.literal("elevenlabs"),
    model: v.string(),
    languages: v.array(v.string()),
    maxTextChars: v.number(),
    maxAudioBytes: v.number(),
  }),
  handler: async () => speechCapabilities(process.env),
});

// Explicit, per-request opt-in. The reply text is resolved from the owner's persisted assistant turn on the server.
export const synthesize = action({
  args: { turnId: v.id("chatTurns"), consent: v.literal(true) },
  returns: speechResult,
  handler: async (ctx, args): Promise<SpeechResult> => {
    const config = speechConfig(process.env);
    if (config.kind === "unavailable") return { kind: "unavailable", reason: config.reason };
    const reservation = await ctx.runMutation(internal.speechState.reserve, { turnId: args.turnId });
    if (reservation.kind === "unavailable") return reservation;
    try {
      return await withAiDeadline(SPEECH_LIMITS.timeoutMs, signal => synthesizeElevenLabs(config, reservation.text, signal));
    } catch (error) {
      return { kind: "unavailable", reason: error instanceof AiDeadlineError ? "timeout" : "provider_failed" };
    }
  },
});
