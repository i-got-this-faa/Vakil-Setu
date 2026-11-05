import express from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { validDeliveryStatus } from "./delivery.js";

export function verifySignature(body, signature, secret) {
  if (!secret || !/^sha256=[a-f0-9]{64}$/.test(signature || "")) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex"));
}

export function incomingMessages(payload, phoneId) {
  if (payload?.object !== "whatsapp_business_account") return [];
  if (!Array.isArray(payload.entry)) throw new Error("Invalid webhook entries");
  const messages = [];
  for (const entry of payload.entry || []) {
    if (!Array.isArray(entry?.changes)) throw new Error("Invalid webhook changes");
    for (const change of entry.changes || []) {
      const value = change.value;
      if (change.field !== "messages" || value?.metadata?.phone_number_id !== phoneId) continue;
      if (value.messages !== undefined && !Array.isArray(value.messages)) throw new Error("Invalid incoming messages");
      for (const message of value.messages || []) {
        if (messages.length >= 10) throw new Error("Too many messages in one webhook");
        if (typeof message.id !== "string" || message.id.length > 300 || !/^\d{6,20}$/.test(message.from || "")) throw new Error("Invalid incoming message identity");
        if (message.type === "audio" && /^[A-Za-z0-9_-]{1,200}$/.test(message.audio?.id || "")) messages.push({ id: message.id, from: message.from, type: "audio", mediaId: message.audio.id });
        else if (message.type === "text" && typeof message.text?.body === "string" && message.text.body.length <= 6000) messages.push({ id: message.id, from: message.from, type: "text", text: message.text.body });
        else messages.push({ id: message.id, from: message.from, type: "unsupported" });
      }
    }
  }
  return messages;
}

export function incomingStatuses(payload, phoneId) {
  if (payload?.object !== "whatsapp_business_account") return [];
  const statuses = [];
  for (const entry of payload.entry || []) for (const change of entry.changes || []) {
    const value = change.value;
    if (change.field !== "messages" || value?.metadata?.phone_number_id !== phoneId) continue;
    if (value.statuses !== undefined && !Array.isArray(value.statuses)) throw new Error("Invalid incoming status callback");
    for (const event of value.statuses || []) {
      if (statuses.length >= 100 || typeof event.id !== "string" || !event.id.startsWith("wamid.") || event.id.length > 300 || !/^\d{6,20}$/.test(event.recipient_id || "")) throw new Error("Invalid incoming status callback");
      if (!validDeliveryStatus(event.status)) continue;
      const errorCode = event.errors?.[0]?.code;
      statuses.push({ sid: event.id, status: event.status, errorCode: errorCode !== undefined && /^\d{1,8}$/.test(String(errorCode)) ? String(errorCode) : undefined });
    }
  }
  return statuses;
}

export function createWhatsappApp({ service, appSecret, verifyToken, phoneId, demo }) {
  if (!appSecret || !verifyToken || !phoneId) throw new Error("Webhook configuration is incomplete");
  const app = express();
  app.disable("x-powered-by");
  app.get("/health", (_req, res) => res.json({ status: "ok", messaging: service.transport.mode, speech: service.speech.mode, demo, websiteRequired: false }));
  app.get("/webhooks/whatsapp", (req, res) => {
    if (req.query["hub.mode"] === "subscribe" && typeof req.query["hub.verify_token"] === "string" && req.query["hub.verify_token"] === verifyToken && typeof req.query["hub.challenge"] === "string") return res.type("text/plain").send(req.query["hub.challenge"]);
    return res.sendStatus(403);
  });
  app.post("/webhooks/whatsapp", express.raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !verifySignature(req.body, req.get("x-hub-signature-256"), appSecret)) return res.sendStatus(401);
    try {
      const payload = JSON.parse(req.body.toString("utf8"));
      const messages = incomingMessages(payload, phoneId);
      const statuses = incomingStatuses(payload, phoneId);
      await service.enqueue(messages);
      for (const event of statuses) await service.recordDelivery(event);
      return res.sendStatus(200);
    } catch (error) {
      if (error instanceof SyntaxError || /incoming|webhook/.test(error.message)) return res.sendStatus(400);
      return res.sendStatus(503);
    }
  });
  app.use((error, _req, res, _next) => res.sendStatus(error.type === "entity.too.large" ? 413 : 400));
  return app;
}
