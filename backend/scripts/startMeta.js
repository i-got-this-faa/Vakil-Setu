process.env.WHATSAPP_MODE = "live";
process.env.WHATSAPP_PROVIDER = "meta";
await import("../src/whatsappServer.js");
