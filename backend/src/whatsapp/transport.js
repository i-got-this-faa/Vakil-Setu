import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { digest } from "../services/legalCorpus.js";

export class DemoTransport {
  constructor(directory) { this.directory = directory; this.mode = "simulated_whatsapp"; }
  async downloadAudio(mediaId) { return { bytes: Buffer.from(mediaId), contentType: "audio/ogg" }; }
  async deliver(to, message, speech, id) {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const filename = path.join(this.directory, `${digest(id).slice(0, 20)}.json`);
    try { return JSON.parse(await readFile(filename, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
    const receipt = { id, to, kind: message.kind, text: message.text, simulatedDelivery: true };
    if (message.kind === "audio") {
      const audio = await speech.synthesize(message.text, message.language);
      receipt.audioPath = path.join(this.directory, `${digest(id).slice(0, 20)}.${audio.extension}`);
      await writeFile(receipt.audioPath, audio.bytes, { mode: 0o600 });
      receipt.contentType = audio.contentType;
    }
    await writeFile(filename, JSON.stringify(receipt, null, 2), { mode: 0o600 });
    return receipt;
  }
}

export class MetaTransport {
  constructor({ token, phoneId, version, fetchImpl = fetch }) {
    if (!token || !/^\d+$/.test(phoneId || "") || !/^v\d+\.\d+$/.test(version || "")) throw new Error("Live WhatsApp requires an access token, numeric phone-number ID and explicit Graph API version");
    Object.assign(this, { token, phoneId, fetchImpl, base: `https://graph.facebook.com/${version}`, mode: "meta_cloud_api" });
  }

  async api(endpoint, options = {}) {
    const response = await this.fetchImpl(`${this.base}/${endpoint}`, {
      ...options, headers: { Authorization: `Bearer ${this.token}`, ...options.headers }, signal: AbortSignal.timeout(45000)
    });
    if (!response.ok) throw new Error(`WhatsApp API returned HTTP ${response.status}`);
    return response.json();
  }

  async downloadAudio(mediaId) {
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(mediaId || "")) throw new Error("Invalid media ID");
    const media = await this.api(mediaId);
    const url = new URL(media.url);
    const allowed = ["facebook.com", "fbsbx.com", "fbcdn.net"].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
    if (url.protocol !== "https:" || !allowed || url.username || url.password || url.port) throw new Error("Untrusted WhatsApp media host");
    const response = await this.fetchImpl(url.href, { headers: { Authorization: `Bearer ${this.token}` }, redirect: "error", signal: AbortSignal.timeout(45000) });
    if (!response.ok) throw new Error(`WhatsApp media returned HTTP ${response.status}`);
    const contentType = (response.headers.get("content-type") || "").split(";")[0];
    if (!contentType.startsWith("audio/")) throw new Error("Incoming media is not audio");
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 16 * 1024 * 1024) throw new Error("Voice note exceeds 16 MiB");
      chunks.push(chunk);
    }
    return { bytes: Buffer.concat(chunks), contentType };
  }

  async deliver(to, message, speech, _id) {
    let payload;
    if (message.kind === "audio") {
      const audio = await speech.synthesize(message.text, message.language);
      const form = new FormData();
      form.set("messaging_product", "whatsapp");
      form.set("type", audio.contentType);
      form.set("file", new Blob([audio.bytes], { type: audio.contentType }), `reply.${audio.extension}`);
      const media = await this.api(`${this.phoneId}/media`, { method: "POST", body: form });
      if (!media.id) throw new Error("WhatsApp did not return an uploaded-media ID");
      payload = { messaging_product: "whatsapp", to, type: "audio", audio: { id: media.id } };
    } else {
      payload = { messaging_product: "whatsapp", to, type: "text", text: { body: message.text.slice(0, 4000), preview_url: false } };
    }
    const result = await this.api(`${this.phoneId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const sid = result.messages?.[0]?.id;
    if (typeof sid !== "string" || !sid) throw new Error("WhatsApp did not return an outbound message ID");
    return { sid, status: "accepted", provider: "meta", kind: message.kind };
  }
}
