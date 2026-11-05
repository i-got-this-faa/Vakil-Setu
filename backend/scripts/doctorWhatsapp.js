import dotenv from "dotenv";
import { LocalSpeech } from "../src/whatsapp/speech.js";
import { loadCorpus } from "../src/services/legalCorpus.js";
import { publicOrigin } from "../src/whatsapp/twilio.js";
import twilio from "twilio";

dotenv.config({ path: new URL("../.env", import.meta.url) });
const e = process.env;
const providerIndex = process.argv.indexOf("--provider");
const provider = providerIndex >= 0 ? process.argv[providerIndex + 1] : e.WHATSAPP_PROVIDER || "twilio";
if (!["meta", "twilio"].includes(provider)) throw new Error("Choose --provider meta or --provider twilio");
console.log(`Messaging provider: ${provider}. No credentials will be printed.`);
let failed = false;
const check = (name, okay) => {
  console.log(`${okay ? "PASS" : "MISSING / INVALID"}: ${name}`);
  if (!okay) failed = true;
};
if (provider === "twilio") {
  check("Twilio Account SID", /^AC[a-fA-F0-9]{32}$/.test(e.TWILIO_ACCOUNT_SID || ""));
  check("Twilio Auth Token", Boolean(e.TWILIO_AUTH_TOKEN && e.TWILIO_AUTH_TOKEN.length >= 16));
  check("Twilio sandbox sender", /^whatsapp:\+\d{6,20}$/.test(e.TWILIO_WHATSAPP_FROM || ""));
} else {
  check("Meta access token", Boolean(e.WHATSAPP_ACCESS_TOKEN && e.WHATSAPP_ACCESS_TOKEN.length >= 16));
  check("Meta phone-number ID", /^\d+$/.test(e.WHATSAPP_PHONE_NUMBER_ID || ""));
  check("Meta app secret", Boolean(e.WHATSAPP_APP_SECRET));
  check("Webhook verify token", Boolean(e.WHATSAPP_VERIFY_TOKEN));
  check("Explicit Graph API version", /^v\d+\.\d+$/.test(e.WHATSAPP_GRAPH_VERSION || ""));
}
try {
  const origin = publicOrigin(e.PUBLIC_BASE_URL);
  check("Public HTTPS origin syntax", true);
  console.log(`Callback to enter in ${provider}: ${origin}${provider === "twilio" ? "/webhooks/twilio" : "/webhooks/whatsapp"}`);
  console.log("Origin syntax does not prove the tunnel/backend is running.");
} catch { check("Public HTTPS origin", false); }
if ((e.SPEECH_PROVIDER || "local") === "local") {
  try { await new LocalSpeech().checkReady(); check("Local English Whisper model and FFmpeg", true); }
  catch { check("Local English speech; run npm run setup:speech:local --prefix backend", false); }
} else {
  check("Configured audio API", ["SPEECH_API_BASE_URL", "SPEECH_API_KEY", "STT_MODEL", "TTS_MODEL", "TTS_VOICE"].every((key) => Boolean(e[key])));
}
const corpus = await loadCorpus();
check("Searchable legal corpus", corpus.documents.length > 0);
if (process.argv.includes("--verify-account") && !failed) {
  try {
    if (provider === "twilio") await twilio(e.TWILIO_ACCOUNT_SID, e.TWILIO_AUTH_TOKEN, { autoRetry: false, timeout: 30000 }).api.v2010.accounts(e.TWILIO_ACCOUNT_SID).fetch();
    else {
      const response = await fetch(`https://graph.facebook.com/${e.WHATSAPP_GRAPH_VERSION}/${e.WHATSAPP_PHONE_NUMBER_ID}`, { headers: { Authorization: `Bearer ${e.WHATSAPP_ACCESS_TOKEN}` }, signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error("Meta authentication failed");
    }
    check(`${provider} account authentication (read-only)`, true);
  } catch { check(`${provider} account authentication`, false); }
}
console.log("Credential values were not printed. Recipient permissions and real message delivery still require a phone test.");
if (failed) process.exitCode = 1;
