// One command for the live Twilio WhatsApp bot:
//   1. opens a Cloudflare quick tunnel to the local WhatsApp port,
//   2. saves the new public URL as PUBLIC_BASE_URL in backend/.env,
//   3. starts the WhatsApp backend in live Twilio mode,
//   4. checks the public /health endpoint and prints the webhook to paste into Twilio.
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import dotenv from "dotenv";

const envPath = new URL("../.env", import.meta.url);
dotenv.config({ path: envPath });
const e = process.env;
const port = Number(e.WHATSAPP_PORT || 5002);

const missing = [];
if (!/^AC[a-fA-F0-9]{32}$/.test(e.TWILIO_ACCOUNT_SID || "")) missing.push("TWILIO_ACCOUNT_SID");
if (!e.TWILIO_AUTH_TOKEN || e.TWILIO_AUTH_TOKEN.length < 16) missing.push("TWILIO_AUTH_TOKEN");
if (!/^whatsapp:\+\d{6,20}$/.test(e.TWILIO_WHATSAPP_FROM || "")) missing.push("TWILIO_WHATSAPP_FROM");
if (missing.length) {
  console.error(`Missing Twilio settings: ${missing.join(", ")}.\nRun: npm run setup:twilio --prefix backend`);
  process.exit(1);
}

const children = [];
const shutdown = (code = 0) => {
  for (const child of children) if (child.exitCode === null) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 1500).unref();
};
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => shutdown(0));

// 1. Tunnel
const pathWithLocal = [path.join(os.homedir(), ".local/bin"), e.PATH].join(path.delimiter);
const tunnel = spawn("cloudflared", ["tunnel", "--url", `http://127.0.0.1:${port}`, "--no-autoupdate"], {
  env: { ...e, PATH: pathWithLocal },
  stdio: ["ignore", "pipe", "pipe"]
});
children.push(tunnel);
tunnel.on("error", (error) => {
  console.error(error.code === "ENOENT" ? "cloudflared is not installed (https://github.com/cloudflare/cloudflared/releases)." : error.message);
  shutdown(1);
});
tunnel.on("exit", (code) => { console.error(`Tunnel stopped (code ${code}).`); shutdown(1); });

const publicUrl = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("Timed out waiting for the Cloudflare tunnel URL")), 45000);
  const onData = (chunk) => {
    const match = chunk.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match) { clearTimeout(timer); resolve(match[0]); }
  };
  tunnel.stdout.on("data", onData);
  tunnel.stderr.on("data", onData);
}).catch((error) => { console.error(error.message); shutdown(1); return null; });
if (!publicUrl) await new Promise(() => {});

// 2. Persist the URL so doctor/other scripts see the same origin
let envText = await readFile(envPath, "utf8");
envText = /^PUBLIC_BASE_URL=.*$/m.test(envText)
  ? envText.replace(/^PUBLIC_BASE_URL=.*$/m, `PUBLIC_BASE_URL=${publicUrl}`)
  : `${envText.replace(/\n?$/, "\n")}PUBLIC_BASE_URL=${publicUrl}\n`;
await writeFile(envPath, envText);

// 3. WhatsApp backend (live Twilio)
const server = spawn(process.execPath, [new URL("../src/whatsappServer.js", import.meta.url).pathname], {
  env: { ...e, PATH: pathWithLocal, WHATSAPP_MODE: "live", WHATSAPP_PROVIDER: "twilio", WHATSAPP_PORT: String(port), PUBLIC_BASE_URL: publicUrl },
  stdio: "inherit"
});
children.push(server);
server.on("exit", (code) => { console.error(`WhatsApp backend stopped (code ${code}).`); shutdown(code || 1); });

// 4. Wait until the public URL actually reaches the backend (quick-tunnel DNS can lag)
let reachable = false;
for (let attempt = 0; attempt < 30 && !reachable; attempt++) {
  await new Promise((r) => setTimeout(r, 2000));
  try {
    const response = await fetch(`${publicUrl}/health`, { signal: AbortSignal.timeout(5000) });
    reachable = response.ok;
  } catch { /* not ready yet */ }
}

const webhook = `${publicUrl}/webhooks/twilio`;
console.log(`
==================== Twilio WhatsApp bot is ${reachable ? "LIVE" : "STARTED (public URL not yet reachable)"} ====================
Paste this into Twilio Console → Messaging → Try it out → Send a WhatsApp message
→ Sandbox settings → "When a message comes in" (Method: POST), then Save:

    ${webhook}

Status callbacks are set automatically per message.
The tunnel URL changes on every run, so update that field each time you restart.
From your phone: send the sandbox "join <code>" phrase once, then send a voice note or text.
Press Ctrl+C to stop.
===================================================================================================
`);
