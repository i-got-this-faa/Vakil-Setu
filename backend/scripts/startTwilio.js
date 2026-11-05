process.env.WHATSAPP_MODE = "live";
process.env.WHATSAPP_PROVIDER = "twilio";
await import("../src/whatsappServer.js");
