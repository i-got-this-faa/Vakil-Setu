"use node";

import { internalAction } from "./_generated/server";
import { dgxConfig } from "./lib/aiDgx";

/**
 * Keeps the DGX models loaded on the GPU. After a few idle minutes the server unloads a model and the next
 * person waits ~10 s extra while it reloads. A one-word request every few minutes avoids that.
 * Only fixed text is sent, never anything a person said. Turn off with DGX_KEEP_WARM=false.
 */
export const ping = internalAction({ args: {}, handler: async () => {
  const dgx = dgxConfig(process.env);
  if (dgx.kind !== "configured" || process.env.DGX_KEEP_WARM === "false") return null;
  const models = [...new Set([...dgx.models, ...(dgx.queryModel ? [dgx.queryModel] : [])])];
  const results = await Promise.all(models.map(async model => {
    const started = Date.now();
    try {
      const response = await fetch(dgx.url, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(60_000),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${dgx.apiKey}` },
        body: JSON.stringify({ model, stream: false, think: false, keep_alive: "30m", options: { num_predict: 1 }, messages: [{ role: "user", content: "hi" }] }),
      });
      await response.body?.cancel();
      return { model, status: response.status, ms: Date.now() - started };
    } catch {
      return { model, status: 0, ms: Date.now() - started };
    }
  }));
  console.info("dgx_keep_warm", results);
  return null;
} });
