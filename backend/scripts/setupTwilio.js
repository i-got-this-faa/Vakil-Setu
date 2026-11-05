// Interactive, local-only Twilio credential setup. Writes backend/.env in place;
// the Auth Token is read without echo and nothing secret is printed.
import { readFile, writeFile } from "node:fs/promises";
import readline from "node:readline";

const envPath = new URL("../.env", import.meta.url);
const SANDBOX_NUMBER = "whatsapp:+14155238886";

function ask(question, { hidden = false, fallback = "" } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) {
    rl._writeToOutput = (text) => { if (text.includes(question)) rl.output.write(text); };
  }
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    if (hidden) process.stdout.write("\n");
    resolve(answer.trim() || fallback);
  }));
}

function setVar(text, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  return pattern.test(text) ? text.replace(pattern, line) : `${text.replace(/\n?$/, "\n")}${line}\n`;
}

let env = await readFile(envPath, "utf8").catch(() => "");
const current = (key) => env.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1] || "";

console.log("Twilio WhatsApp Sandbox setup — values come from https://console.twilio.com (Account Info).");
console.log("Press Enter to keep an existing value.\n");

const sid = await ask(`Account SID${current("TWILIO_ACCOUNT_SID") ? " [keep current]" : ""}: `, { fallback: current("TWILIO_ACCOUNT_SID") });
if (!/^AC[a-fA-F0-9]{32}$/.test(sid)) throw new Error("Account SID must look like AC followed by 32 hex characters");
const token = await ask(`Auth Token (hidden)${current("TWILIO_AUTH_TOKEN") ? " [keep current]" : ""}: `, { hidden: true, fallback: current("TWILIO_AUTH_TOKEN") });
if (!/^[a-fA-F0-9]{32}$/.test(token)) throw new Error("Auth Token must be 32 hex characters");
const fromDefault = current("TWILIO_WHATSAPP_FROM") || SANDBOX_NUMBER;
let from = await ask(`Sandbox sender [${fromDefault}]: `, { fallback: fromDefault });
if (/^\+?\d{6,20}$/.test(from)) from = `whatsapp:+${from.replace(/^\+/, "")}`;
if (!/^whatsapp:\+\d{6,20}$/.test(from)) throw new Error("Sender must look like whatsapp:+14155238886");

env = setVar(env, "TWILIO_ACCOUNT_SID", sid);
env = setVar(env, "TWILIO_AUTH_TOKEN", token);
env = setVar(env, "TWILIO_WHATSAPP_FROM", from);
await writeFile(envPath, env, { mode: 0o600 });
console.log("\nSaved to backend/.env (credentials not printed).");
console.log("Next: npm run twilio:live   (starts tunnel + live WhatsApp bot)");
