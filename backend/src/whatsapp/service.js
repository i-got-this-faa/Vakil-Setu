import { createHash } from "node:crypto";
import { planConversation } from "./conversation.js";
import { mergeDelivery } from "./delivery.js";

export class WhatsappService {
  constructor({ store, transport, speech, advocates, demo, sandboxProfiles = false, answer }) {
    Object.assign(this, { store, transport, speech, advocates, demo, sandboxProfiles, answer });
    this.running = null;
  }

  async enqueue(messages) {
    const accepted = await this.store.mutate((state) => {
      const ids = [];
      const pending = Object.values(state.inbox).filter((job) => ["queued", "processing", "sending"].includes(job.status)).length;
      const uniqueNew = [...new Set(messages.map((message) => createHash("sha256").update(message.id).digest("hex")))].filter((key) => !state.inbox[key]);
      if (pending + uniqueNew.length > 100) throw new Error("Worker queue is full");
      for (const message of messages) {
        const key = createHash("sha256").update(message.id).digest("hex");
        if (state.inbox[key]) continue;
        state.inbox[key] = { key, message, status: "queued", receivedAt: new Date().toISOString() };
        ids.push(key);
      }
      return ids;
    });
    this.kick();
    return accepted;
  }

  async recordDelivery(event) {
    await this.store.mutate((state) => {
      state.delivery ||= {};
      state.delivery[event.sid] = mergeDelivery(state.delivery[event.sid], event);
      // Bound unmatched callbacks arriving before the message-create response.
      const orphaned = Object.values(state.delivery).filter((record) => !record.jobKey);
      for (const record of orphaned.slice(0, Math.max(0, orphaned.length - 200))) delete state.delivery[record.sid];
    });
  }

  kick() {
    if (!this.running) this.running = this.drain().catch((error) => {
      console.error("WhatsApp worker stopped:", error.name);
    }).finally(() => { this.running = null; });
  }

  async waitUntilIdle() {
    while (this.running) await this.running;
    if (Object.values(this.store.snapshot().inbox).some((j) => j.status === "queued")) {
      this.kick();
      if (this.running) await this.waitUntilIdle();
    }
  }

  async drain() {
    while (true) {
      const job = Object.values(this.store.snapshot().inbox).find((j) => j.status === "queued");
      if (!job) return;
      await this.store.mutate((state) => { state.inbox[job.key].status = "processing"; });
      try {
        const incoming = job.message;
        const snapshot = this.store.snapshot();
        const previous = snapshot.sessions[incoming.from];
        let text = incoming.text || "";
        let transcription;
        let plan;
        // Before the first consent prompt, do not download/transcribe case audio.
        if (incoming.type === "audio" && previous?.phase) {
          try {
            const media = await this.transport.downloadAudio(incoming.mediaId);
            transcription = await this.speech.transcribe(incoming.mediaId, media, previous.language);
            text = transcription.text;
          } catch {
            plan = { session: previous, messages: [{ kind: "audio", language: previous.language, text: previous.language === "hi" ? "आपका वॉइस नोट समझ नहीं आया। कृपया छोटा और स्पष्ट संदेश फिर से भेजें।" : "I could not process that voice note. Please send a short, clear message again. Your conversation has not advanced." }] };
          }
        }
        if (incoming.type === "unsupported" && previous?.phase) plan = { session: previous, messages: [{ kind: "audio", language: previous.language, text: "Please send a voice note. Images and documents are not processed in this presentation workflow." }] };
        if (!plan && !text.trim() && previous?.phase) throw new Error("Empty incoming transcript");
        plan ||= await planConversation({ session: previous, text, sender: incoming.from, jobId: incoming.id, advocates: this.advocates, requests: Object.values(snapshot.requests), demo: this.demo, sandboxProfiles: this.sandboxProfiles, supportedLanguages: this.speech.supportedLanguages, answer: this.answer });
        await this.store.mutate((state) => {
          if (plan.requestUpdate) {
            const request = state.requests[plan.requestUpdate.id];
            if (!request || request.sender !== incoming.from || request.status !== plan.requestUpdate.expectedStatus) throw new Error("Request changed before cancellation");
            const { expectedStatus: _expected, ...update } = plan.requestUpdate;
            Object.assign(request, update);
          }
          const audio = plan.messages.find((message) => message.kind === "audio");
          if (audio) plan.session.lastSpokenReply = audio.text;
          state.sessions[incoming.from] = plan.session;
          if (plan.request) state.requests[plan.request.id] = plan.request;
          Object.assign(state.inbox[job.key], { status: "sending", outgoing: plan.messages, evidence: plan.evidence, receipts: [] });
          if (plan.session.consent) state.inbox[job.key].transcription = transcription;
          if (!plan.session.consent) delete state.inbox[job.key].message.text;
        });
        for (let index = 0; index < plan.messages.length; index++) {
          const receipt = await this.transport.deliver(incoming.from, plan.messages[index], this.speech, `${job.key}-${index}`);
          await this.store.mutate((state) => {
            state.inbox[job.key].receipts.push(receipt);
            if (["twilio", "meta"].includes(receipt.provider) && receipt.sid) {
              state.delivery ||= {};
              const record = mergeDelivery(state.delivery[receipt.sid], { sid: receipt.sid, status: receipt.status || "queued" });
              state.delivery[receipt.sid] = { ...record, jobKey: job.key, messageIndex: index };
            }
          });
        }
        await this.store.mutate((state) => {
          state.inbox[job.key].status = "done";
          state.inbox[job.key].finishedAt = new Date().toISOString();
        });
      } catch (error) {
        await this.store.mutate((state) => {
          state.inbox[job.key].status = "needs_review";
          state.inbox[job.key].error = "Processing or delivery failed. Check provider configuration and delivery before replaying.";
        });
        console.error("WhatsApp message needs review:", job.key.slice(0, 8), error.name);
      }
    }
  }
}
