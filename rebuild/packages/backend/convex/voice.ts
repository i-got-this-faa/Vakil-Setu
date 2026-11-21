"use node";

import { VOICE_LIMITS } from "@legal-setu/domain";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { boundedText } from "./lib/input";
import { validateDocument } from "./lib/chat";
import { AiDeadlineError, withAiDeadline } from "./lib/ai";
import type { AiMessage, AiPart } from "./lib/ai";
import { dgxQueryProvider, fallThroughAnyFailure, generateWithQuotaFallback, voiceRoutes, writeLawQuery } from "./lib/aiRouting";
import { fastVoiceResponseSchema, groundedResponseSchema, groundedSystemInstruction, parseGroundedResult, parseVoiceResult, pickSources, voiceResponseSchema, voiceSendArgs, voiceSystemInstruction } from "./lib/voice";
import type { BookingCard, BookingIntent, GroundingPassage, ParsedVoiceResult, VoiceSendResult, VoiceSource } from "./lib/voice";
import { spokenTime, todayLabel } from "./lib/voiceBooking";
import { TRANSLATED_REPLIES } from "./lib/voiceLanguages";
import { retrieveLegalEvidence } from "./lib/legalRetrieval";
import { bhashiniKeys, bhashiniTranscribe, bhashiniTranslate } from "./lib/bhashini";
import type { VoiceLocale } from "@legal-setu/domain";


/**
 * One spoken (or typed) turn: Bhashini writes down what was said, the AI (college DGX models,
 * Gemini as a last resort) replies in the person's language and updates what we understand about the problem.
 * If Bhashini can't transcribe, the audio itself goes to Gemini, which can listen.
 * When the message is a question about the law, the AI also writes an English search phrase;
 * we look up matching law excerpts (RAG) and the AI answers again from them, citing what it used.
 * The client watches `conversations.get` for the stored reply.
 */
export const send = action({ args: voiceSendArgs, handler: async (ctx, args): Promise<VoiceSendResult> => {
  if (args.input.kind === "audio" && (args.input.data.byteLength === 0 || args.input.data.byteLength > VOICE_LIMITS.audioBytes)) {
    return { kind: "unavailable", reason: "audio_too_large" };
  }
  const typed = args.input.kind === "text" ? boundedText(args.input.text, "Message", VOICE_LIMITS.textChars)
    : args.input.kind === "booking" ? boundedText(args.input.label, "Message", VOICE_LIMITS.textChars) : undefined;
  // A shared document is checked, then kept with the conversation so later questions can refer to it.
  let attachment: { storageId: Id<"_storage">; fileName: string; contentType: "application/pdf" | "image/jpeg" | "image/png"; size: number } | undefined;
  if (args.input.kind === "document") {
    const fileName = args.input.fileName.trim().slice(0, 150) || "document";
    try {
      if (/[\x00-\x1f/\\]/u.test(fileName)) throw new Error("bad name");
      validateDocument(args.input.data, args.input.mimeType);
    } catch {
      return { kind: "unavailable", reason: "document_invalid" };
    }
    const storageId = await ctx.storage.store(new Blob([args.input.data], { type: args.input.mimeType }));
    attachment = { storageId, fileName, contentType: args.input.mimeType, size: args.input.data.byteLength };
  }
  let reservation;
  try {
    reservation = await ctx.runMutation(internal.conversations.reserve, {
      ...(args.conversationId ? { conversationId: args.conversationId } : {}),
      ...(args.guestToken ? { guestToken: args.guestToken } : {}),
      locale: args.locale, requestId: args.requestId, inputKind: args.input.kind, ...(typed ? { text: typed } : {}), ...(attachment ? { attachment } : {}),
    });
  } catch (error) {
    if (attachment) await ctx.storage.delete(attachment.storageId);
    throw error;
  }
  if (attachment && reservation.kind !== "reserved") await ctx.storage.delete(attachment.storageId);
  if (reservation.kind === "unavailable") return reservation;
  if (reservation.kind === "replay") {
    const ids = { conversationId: reservation.conversationId, turnId: reservation.turnId };
    if (reservation.reply.kind === "reply") return { kind: "available", ...ids };
    if (reservation.reply.kind === "pending") return { kind: "unavailable", reason: reservation.expired ? "timeout" : "in_progress", ...ids };
    return { kind: "unavailable", reason: reservation.reply.reason, ...ids };
  }
  const turnId: Id<"conversationTurns"> = reservation.turnId;
  const ids = { conversationId: reservation.conversationId, turnId };
  let outcome: { kind: "reply"; transcript: string; reply: string; sources: VoiceSource[]; profile: NonNullable<ReturnType<typeof parseVoiceResult>>["profile"]; model: string; booking?: BookingCard } | { kind: "unavailable"; reason: string };
  try {
    const started = Date.now();
    outcome = await withAiDeadline(VOICE_LIMITS.timeoutMs, async signal => {
      const context = await ctx.runQuery(internal.conversations.context, { turnId });
      if (!context) return { kind: "unavailable", reason: "state_changed" } as const;
      const locale = context.conversation.locale;
      // A booking step: the server finds lawyers and times (or books), then the reply is put into the person's language.
      const bookingStep = async (intent: BookingIntent) => {
        const result = await ctx.runMutation(internal.voiceBooking.step, { turnId, intent });
        if (!result) return null;
        const texts = result.segments.map(segment => segment.text);
        for (const from of new Set(result.segments.map(segment => segment.lang))) {
          if (from === locale) continue;
          const indices = result.segments.flatMap((segment, index) => segment.lang === from ? [index] : []);
          // If translation fails the English is kept: understandable, and better than silence.
          const translated = await bhashiniTranslate(indices.map(index => texts[index]!), from, locale, bhashiniKeys(process.env), signal).catch(() => null);
          if (translated) indices.forEach((index, n) => { if (translated[n]) texts[index] = translated[n]!; });
        }
        console.info("voice_booking_step", { action: intent.action, stage: result.card?.stage ?? "none" });
        return { reply: texts.join(" ").slice(0, VOICE_LIMITS.replyChars), card: result.card };
      };
      // A tap on a booking card needs no AI at all.
      if (args.input.kind === "booking") {
        const step = await bookingStep({ action: args.input.action, ...(args.input.option !== undefined ? { option: args.input.option } : {}) });
        if (!step) return { kind: "unavailable", reason: "state_changed" } as const;
        return { kind: "reply", transcript: typed!, reply: step.reply, sources: [], profile: context.conversation.profile, model: "booking", ...(step.card ? { booking: step.card } : {}) } as const;
      }
      const config = voiceRoutes(process.env);
      if (config.kind === "unavailable") return { kind: "unavailable", reason: config.reason } as const;
      // Speech-to-text first, so text-only models can answer. null = Bhashini unavailable; the audio is sent instead.
      let heard: string | null = null;
      if (args.input.kind === "audio") {
        heard = await bhashiniTranscribe(args.input.data, args.input.mimeType, context.conversation.locale, bhashiniKeys(process.env), signal).catch(error => { if (signal.aborted) throw error; return null; });
        console.info("voice_transcribe", { ok: heard !== null, empty: heard === "" });
      }
      if (heard) heard = heard.slice(0, VOICE_LIMITS.transcriptChars);
      const spoken = heard ?? typed;
      const messages: AiMessage[] = [];
      for (const entry of context.history) {
        messages.push({ role: "user", parts: [{ kind: "text", text: entry.user || "(unclear audio)" }] });
        messages.push({ role: "assistant", parts: [{ kind: "text", text: entry.assistant }] });
      }
      const parts: AiPart[] = heard !== null
        ? [{ kind: "text", text: heard ? `(The person spoke; speech-to-text wrote:) ${heard}` : "(The person's audio was silent or unclear.)" }]
        : args.input.kind === "audio"
        ? [{ kind: "text", text: "The person's new spoken message is attached as audio." }, { kind: "file", mimeType: args.input.mimeType, dataBase64: Buffer.from(args.input.data).toString("base64") }]
        : args.input.kind === "document"
          ? [{ kind: "text", text: `The person shared this document (file name: ${JSON.stringify(attachment!.fileName)}). Explain it to them.` }, { kind: "file", mimeType: args.input.mimeType, dataBase64: Buffer.from(args.input.data).toString("base64") }]
          : [{ kind: "text", text: typed ?? "" }];
      messages.push({ role: "user", parts });
      signal.throwIfAborted();
      const replyLocale = TRANSLATED_REPLIES[context.conversation.locale] ?? context.conversation.locale;
      const now = Date.now();
      const draft = context.conversation.booking && context.conversation.booking.expiresAt > now ? context.conversation.booking : null;
      const voiceContext = {
        locale: replyLocale, profile: context.conversation.profile, history: context.history, bookings: context.bookings, firstTurn: context.history.length === 0,
        today: todayLabel(now),
        bookingInProgress: draft ? { stage: draft.stage, lawyers: draft.lawyers.map(lawyer => lawyer.name), times: draft.times.map(time => spokenTime(time.start, now)) } : null,
      };
      const audit = async (provider: { model: string; recipientOrigin: string }) => {
        await ctx.runMutation(internal.conversations.auditDispatch, { turnId, model: provider.model, recipientOrigin: provider.recipientOrigin });
      };
      const queryProvider = spoken !== undefined ? dgxQueryProvider(process.env) : null;
      let first: Omit<ParsedVoiceResult, "lawQuery" | "booking">;
      let bookingIntent: BookingIntent | null = null;
      let answer: { reply: string; sources: VoiceSource[] };
      let model: string;
      if (queryProvider) {
        // Fast path (words already known): a small model writes the law search phrase, we look up the law,
        // and ONE answer call replies with the excerpts in hand. No transcript or search phrase to write back.
        let passages: GroundingPassage[] = [];
        if (spoken) {
          try {
            const lawQuery = await writeLawQuery(queryProvider, spoken, context.conversation.profile.summary, signal, audit);
            if (lawQuery) {
              const retrieval = await retrieveLegalEvidence(ctx, `${lawQuery} ${context.conversation.profile.domain === "unknown" ? "" : context.conversation.profile.domain}`.trim(), signal, async () => {});
              passages = retrieval.passages;
            }
            console.info("voice_law_lookup", { fast: true, searched: Boolean(lawQuery), found: passages.length });
          } catch (error) {
            if (signal.aborted) throw error;
            console.warn("voice_law_lookup_failed");
          }
        }
        signal.throwIfAborted();
        const generated = await generateWithQuotaFallback(config.providers, {
          systemInstruction: voiceSystemInstruction(voiceContext, { passages }),
          messages, maxOutputTokens: 1024, maxReplyChars: 16_000, output: { kind: "json", schema: fastVoiceResponseSchema(passages.length > 0) },
        }, { signal, onMetadata: () => {} }, audit, fallThroughAnyFailure);
        if (generated.result.kind !== "reply") return { kind: "unavailable", reason: generated.result.reason } as const;
        let record: unknown = null;
        try { record = JSON.parse(generated.result.text); } catch { record = null; }
        const parsed = parseVoiceResult(record, context.conversation.profile, spoken);
        if (!parsed) return { kind: "unavailable", reason: "malformed" } as const;
        const { lawQuery: _none, booking: intent, ...rest } = parsed;
        first = rest;
        bookingIntent = intent;
        answer = { reply: rest.reply, sources: passages.length ? pickSources((record as { usedSources?: unknown }).usedSources, passages) : [] };
        model = generated.provider.model;
      } else {
      const generated = await generateWithQuotaFallback(config.providers, {
        systemInstruction: voiceSystemInstruction(voiceContext),
        messages, maxOutputTokens: 2048, maxReplyChars: 16_000, output: { kind: "json", schema: voiceResponseSchema() },
      }, { signal, onMetadata: () => {} }, audit, fallThroughAnyFailure);
      if (generated.result.kind !== "reply") return { kind: "unavailable", reason: generated.result.reason } as const;
      let parsed;
      try { parsed = parseVoiceResult(JSON.parse(generated.result.text), context.conversation.profile, spoken); } catch { parsed = null; }
      if (!parsed) return { kind: "unavailable", reason: "malformed" } as const;
      const { lawQuery, booking: intent, ...rest } = parsed;
      first = rest;
      bookingIntent = intent;
      model = generated.provider.model;
      answer = { reply: first.reply, sources: [] };
      // The law-based second answer is optional: skip it unless there is clearly time left for it.
      if (lawQuery && !bookingIntent && Date.now() - started < VOICE_LIMITS.timeoutMs - 20_000) {
        // Any failure here keeps the first, ungrounded answer rather than failing the turn.
        try {
          const retrieval = await retrieveLegalEvidence(ctx, `${lawQuery} ${first.profile.domain === "unknown" ? "" : first.profile.domain}`.trim(), signal, async () => {});
          if (retrieval.passages.length) {
            // Audio is replaced by its transcript; a document stays attached so the answer can use what it says.
            if (args.input.kind === "audio") messages[messages.length - 1] = { role: "user", parts: [{ kind: "text", text: first.transcript || "(unclear audio)" }] };
            // Its own shorter deadline, so a slow law-based answer falls back to the first answer instead of failing the turn.
            const budget = VOICE_LIMITS.timeoutMs - (Date.now() - started) - 3_000;
            const grounded = await withAiDeadline(budget, async groundedSignal => await generateWithQuotaFallback(config.providers, {
              systemInstruction: groundedSystemInstruction({ locale: replyLocale, profile: first.profile }, retrieval.passages),
              messages, maxOutputTokens: 2048, maxReplyChars: 16_000, output: { kind: "json", schema: groundedResponseSchema() },
            }, { signal: groundedSignal, onMetadata: () => {} }, audit, fallThroughAnyFailure)).catch(error => { if (signal.aborted || !(error instanceof AiDeadlineError)) throw error; return null; });
            if (grounded?.result.kind === "reply") {
              let better;
              try { better = parseGroundedResult(JSON.parse(grounded.result.text), retrieval.passages); } catch { better = null; }
              if (better) answer = better;
            }
          }
          console.info("voice_law_lookup", { method: retrieval.method, found: retrieval.passages.length, cited: answer.sources.length });
        } catch (error) {
          if (signal.aborted) throw error;
          console.warn("voice_law_lookup_failed");
        }
      }
      }
      if (bookingIntent) {
        const step = await bookingStep(bookingIntent);
        // Booking chatter ("Alisha Kohli at 4 pm") is not part of the problem the lawyer reads: keep the summary as it was.
        const profile = { ...first.profile, summary: context.conversation.profile.summary || first.profile.summary };
        if (step) return { kind: "reply", transcript: first.transcript, reply: step.reply, sources: [], profile, model, ...(step.card ? { booking: step.card } : {}) } as const;
      }
      const via = TRANSLATED_REPLIES[context.conversation.locale];
      if (via) {
        // If translation fails, the untranslated reply is kept: understandable, and better than no answer.
        const translated = await bhashiniTranslate([answer.reply], via, context.conversation.locale, bhashiniKeys(process.env), signal).catch(() => null);
        if (translated?.[0]) answer = { ...answer, reply: translated[0] };
        console.info("voice_translate", { to: context.conversation.locale, ok: Boolean(translated) });
      }
      return { kind: "reply", transcript: first.transcript, profile: first.profile, ...answer, model } as const;
    });
  } catch (error) {
    outcome = { kind: "unavailable", reason: error instanceof AiDeadlineError ? "timeout" : "provider_failed" };
  }
  const finished = await ctx.runMutation(internal.conversations.finish, { turnId, result: outcome });
  console.info("voice_turn", { reason: finished.kind === "available" ? "complete" : finished.reason, input: args.input.kind });
  return finished.kind === "available" ? { kind: "available", ...ids } : { kind: "unavailable", reason: finished.reason, ...ids };
} });
