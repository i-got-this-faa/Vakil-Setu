import dotenv from "dotenv";
import { createRuntime } from "./whatsapp/runtime.js";
dotenv.config({ path: new URL("../.env", import.meta.url) });
const runtime = await createRuntime();
const port = Number(process.env.WHATSAPP_PORT || 5001);
const host = runtime.mode === "demo" ? "127.0.0.1" : "0.0.0.0";
const server = runtime.app.listen(port, host, () => {
  console.log(`Vakil Setu ${runtime.mode} WhatsApp backend: http://${host}:${port}`);
  console.log(`Webhook: ${runtime.provider === "twilio" ? "/webhooks/twilio" : "/webhooks/whatsapp"}. No website or MongoDB is required.`);
  console.log(runtime.mode === "demo" ? "DEMO: messaging and transcription are simulated; generated audio and corpus retrieval are real." : `LIVE ${runtime.provider} adapter configured. Provider delivery still requires working messaging, public HTTPS callback and speech configuration.`);
});
const cleanup = setInterval(() => runtime.mediaStore?.cleanup().catch(() => console.error("Temporary media cleanup needs review")), 60000);
cleanup.unref();
runtime.service.kick();
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
  server.close(async () => { clearInterval(cleanup); await runtime.service.waitUntilIdle(); process.exit(0); });
});
