import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { parseWebhook, verifyMetaSignature } from "./lib/whatsapp";

const http = httpRouter();

// Meta calls this once when you save the webhook URL in the App Dashboard.
http.route({ path: "/whatsapp/webhook", method: "GET", handler: httpAction(async (_ctx, req) => {
  const params = new URL(req.url).searchParams;
  const expected = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  const challenge = params.get("hub.challenge");
  if (!expected || params.get("hub.mode") !== "subscribe" || params.get("hub.verify_token") !== expected || !challenge) return new Response("Forbidden", { status: 403 });
  return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}) });

http.route({ path: "/whatsapp/webhook", method: "POST", handler: httpAction(async (ctx, req) => {
  const secret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!secret) return new Response("Not configured", { status: 503 });
  const raw = await req.text();
  if (raw.length > 1_000_000 || !(await verifyMetaSignature(secret, raw, req.headers.get("x-hub-signature-256")))) return new Response("Invalid signature", { status: 401 });
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return new Response("Bad request", { status: 400 }); }
  const messages = parseWebhook(payload);
  if (!messages) return new Response("Bad request", { status: 400 });
  // Acknowledge quickly; replies are scheduled so Meta does not retry on slow AI calls.
  for (const message of messages.slice(0, 50)) await ctx.runMutation(internal.whatsapp.receive, { message });
  return new Response("OK", { status: 200 });
}) });

export default http;
