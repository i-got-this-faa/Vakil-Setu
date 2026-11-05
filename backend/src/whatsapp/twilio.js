import twilio from "twilio";
import express from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, writeFile, readdir, stat, rm } from "node:fs/promises";
import path from "node:path";
import { digest } from "../services/legalCorpus.js";
import { validDeliveryStatus } from "./delivery.js";

export function publicOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || !["", "/"].includes(url.pathname)) throw new Error("PUBLIC_BASE_URL must be the public HTTPS origin without a path, query or credentials");
  return url.origin;
}

export class SignedAudioStore {
  constructor({ directory, baseUrl, secret, ttlSeconds = 900 }) {
    if (!secret || secret.length < 16 || !Number.isInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 3600) throw new Error("Invalid signed-media configuration");
    Object.assign(this, { directory, baseUrl: publicOrigin(baseUrl), secret, ttlSeconds });
  }
  sign(filename, expires) { return createHmac("sha256", this.secret).update(`${filename}:${expires}`).digest("hex"); }
  authorized(filename, expires, signature) {
    if (typeof filename !== "string" || typeof expires !== "string" || typeof signature !== "string") return false;
    if (!/^[a-f0-9]{40}\.(mp3|ogg)$/.test(filename || "") || !/^\d{10}$/.test(String(expires || "")) || !/^[a-f0-9]{64}$/.test(signature || "")) return false;
    const now = Math.floor(Date.now() / 1000);
    if (Number(expires) <= now || Number(expires) > now + this.ttlSeconds + 60) return false;
    return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(this.sign(filename, expires), "hex"));
  }
  async publish(audio, id) {
    if (!["audio/mpeg", "audio/ogg"].includes(audio.contentType) || !["mp3", "ogg"].includes(audio.extension) || !audio.bytes?.length || audio.bytes.length > 16 * 1024 * 1024) throw new Error("Twilio reply requires MP3 or OGG/Opus audio up to 16 MiB");
    if ((audio.contentType === "audio/mpeg") !== (audio.extension === "mp3")) throw new Error("Audio extension does not match content type");
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const filename = `${digest(id).slice(0, 40)}.${audio.extension}`;
    await writeFile(path.join(this.directory, filename), audio.bytes, { mode: 0o600 });
    const expires = Math.floor(Date.now() / 1000) + this.ttlSeconds;
    return `${this.baseUrl}/media/${filename}?expires=${expires}&signature=${this.sign(filename, expires)}`;
  }
  async cleanup() {
    let files;
    try { files = await readdir(this.directory); } catch (error) { if (error.code === "ENOENT") return; throw error; }
    for (const filename of files) {
      if (!/^[a-f0-9]{40}\.(mp3|ogg)$/.test(filename)) continue;
      const file = path.join(this.directory, filename);
      if ((await stat(file)).mtimeMs < Date.now() - (this.ttlSeconds + 60) * 1000) await rm(file, { force: true });
    }
  }
  mount(app) {
    app.get("/media/:filename", (req, res) => {
      if (!this.authorized(req.params.filename, req.query.expires, req.query.signature)) return res.sendStatus(403);
      res.set("Cache-Control", "private, no-store");
      res.set("X-Content-Type-Options", "nosniff");
      res.type(req.params.filename.endsWith(".mp3") ? "audio/mpeg" : "audio/ogg");
      return res.sendFile(path.resolve(this.directory, req.params.filename), (error) => {
        if (error && !res.headersSent) res.sendStatus(error.status === 404 ? 404 : 500);
      });
    });
  }
}

export function twilioMessage(params, { accountSid, fromNumber }) {
  if (!params || Object.values(params).some((value) => typeof value !== "string")) throw new Error("Invalid Twilio form");
  if (params.AccountSid !== accountSid || params.To !== fromNumber) throw new Error("Twilio account or recipient does not match configuration");
  if (!/^(SM|MM)[a-fA-F0-9]{32}$/.test(params.MessageSid || "") || !/^whatsapp:\+\d{6,20}$/.test(params.From || "")) throw new Error("Invalid Twilio sender or message ID");
  const base = { id: `twilio:${params.MessageSid}`, from: params.From.slice("whatsapp:+".length) };
  if (params.NumMedia === "1" && /^audio\//.test(params.MediaContentType0 || "") && typeof params.MediaUrl0 === "string" && params.MediaUrl0.length <= 2048) return { ...base, type: "audio", mediaId: params.MediaUrl0 };
  if ((!params.NumMedia || params.NumMedia === "0") && params.Body?.trim() && params.Body.length <= 6000) return { ...base, type: "text", text: params.Body.trim() };
  return { ...base, type: "unsupported" };
}

export class TwilioTransport {
  constructor({ accountSid, authToken, fromNumber, mediaStore, client, fetchImpl = fetch }) {
    if (!/^AC[a-fA-F0-9]{32}$/.test(accountSid || "") || !authToken || !/^whatsapp:\+\d{6,20}$/.test(fromNumber || "") || !mediaStore) throw new Error("Twilio requires an Account SID, Auth Token, sandbox WhatsApp number and signed media store");
    Object.assign(this, { accountSid, authToken, fromNumber, mediaStore, fetchImpl, client: client || twilio(accountSid, authToken, { autoRetry: false, timeout: 45000 }), mode: "twilio_sandbox" });
  }
  async downloadAudio(mediaUrl) {
    let url = new URL(mediaUrl);
    const accountPath = `/2010-04-01/Accounts/${this.accountSid}/Messages/`;
    if (url.protocol !== "https:" || url.hostname !== "api.twilio.com" || !url.pathname.startsWith(accountPath) || !/\/(SM|MM)[a-fA-F0-9]{32}\/Media\/ME[a-fA-F0-9]{32}(?:\.\w+)?$/.test(url.pathname) || url.username || url.password || url.port || url.search || url.hash) throw new Error("Untrusted Twilio media URL");
    const authorization = `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64")}`;
    for (let count = 0; count < 4; count++) {
      const headers = url.hostname === "api.twilio.com" ? { Authorization: authorization } : {};
      const response = await this.fetchImpl(url.href, { headers, redirect: "manual", signal: AbortSignal.timeout(45000) });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location) throw new Error("Twilio media redirect has no location");
        url = new URL(location, url);
        const allowed = ["twilio.com", "twiliocdn.com", "amazonaws.com", "cloudfront.net"].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
        if (url.protocol !== "https:" || !allowed || url.username || url.password || url.port) throw new Error("Untrusted Twilio media redirect");
        continue;
      }
      if (!response.ok) throw new Error(`Twilio media returned HTTP ${response.status}`);
      const contentType = (response.headers.get("content-type") || "").split(";")[0];
      if (!contentType.startsWith("audio/")) throw new Error("Twilio attachment is not audio");
      const chunks = [];
      let bytes = 0;
      for await (const chunk of response.body) {
        bytes += chunk.length;
        if (bytes > 16 * 1024 * 1024) throw new Error("Twilio voice note exceeds 16 MiB");
        chunks.push(chunk);
      }
      return { bytes: Buffer.concat(chunks), contentType };
    }
    throw new Error("Too many Twilio media redirects");
  }
  async deliver(to, message, speech, id) {
    const payload = { from: this.fromNumber, to: `whatsapp:+${to}`, statusCallback: `${this.mediaStore.baseUrl}/webhooks/twilio/status` };
    if (message.kind === "audio") payload.mediaUrl = [await this.mediaStore.publish(await speech.synthesize(message.text, message.language), id)];
    else payload.body = message.text.slice(0, 1600);
    const result = await this.client.messages.create(payload);
    return { sid: result.sid, status: result.status, provider: "twilio", kind: message.kind };
  }
}

export function createTwilioApp({ service, accountSid, authToken, fromNumber, baseUrl, mediaStore, demo = false }) {
  const app = express();
  const callbackUrl = `${publicOrigin(baseUrl)}/webhooks/twilio`;
  app.disable("x-powered-by");
  mediaStore.mount(app);
  app.get("/health", (_req, res) => res.json({ status: "ok", messaging: service.transport.mode, speech: service.speech.mode, demo, websiteRequired: false }));
  app.post("/webhooks/twilio/status", express.urlencoded({ extended: false, limit: "32kb", parameterLimit: 100 }), async (req, res) => {
    if (req.originalUrl !== "/webhooks/twilio/status") return res.sendStatus(400);
    const signature = req.get("x-twilio-signature") || "";
    if (!req.is("application/x-www-form-urlencoded") || !req.body || !signature || !twilio.validateRequest(authToken, signature, `${callbackUrl}/status`, req.body)) return res.sendStatus(401);
    const body = req.body;
    if (Object.values(body).some((value) => typeof value !== "string") || body.AccountSid !== accountSid || body.From !== fromNumber || !/^whatsapp:\+\d{6,20}$/.test(body.To || "") || !/^(SM|MM)[a-fA-F0-9]{32}$/.test(body.MessageSid || "")) return res.sendStatus(400);
    const status = body.MessageStatus || body.SmsStatus;
    if (!validDeliveryStatus(status)) return res.sendStatus(204);
    if (body.ErrorCode && !/^\d{1,8}$/.test(body.ErrorCode)) return res.sendStatus(400);
    try {
      await service.recordDelivery({ sid: body.MessageSid, status, errorCode: body.ErrorCode || undefined });
      return res.sendStatus(204);
    } catch { return res.sendStatus(503); }
  });
  app.post("/webhooks/twilio", express.urlencoded({ extended: false, limit: "32kb", parameterLimit: 100 }), async (req, res) => {
    if (req.originalUrl !== "/webhooks/twilio") return res.sendStatus(400);
    const signature = req.get("x-twilio-signature") || "";
    if (!req.is("application/x-www-form-urlencoded") || !req.body || !signature || !twilio.validateRequest(authToken, signature, callbackUrl, req.body)) return res.sendStatus(401);
    let message;
    try { message = twilioMessage(req.body, { accountSid, fromNumber }); }
    catch { return res.sendStatus(400); }
    try {
      if (message) await service.enqueue([message]);
      return res.type("text/xml").send('<?xml version="1.0" encoding="UTF-8"?><Response/>');
    } catch { return res.sendStatus(503); }
  });
  app.use((error, _req, res, _next) => res.sendStatus(error.type === "entity.too.large" ? 413 : 400));
  return app;
}
