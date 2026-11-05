import { readFile } from "node:fs/promises";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => { vi.unstubAllEnvs(); });

// Operator opt-in only. Never read legacy environment files or send a real intake.
describe.skipIf(process.env.AI_SYNTHETIC_LIVE !== "1")("actual native Gemini with local Convex persistence", () => {
  it("completes synthetic document chat, private history recall, and three locale outputs", async () => {
    const key = (await readFile(new URL("../../../.runtime/gemini-api-key", import.meta.url), "utf8")).trim();
    vi.stubEnv("GEMINI_API_KEY", key);
    vi.stubEnv("GEMINI_MODEL", "gemini-3.6-flash");
    vi.stubEnv("AI_CHAT_LOCALES", undefined);
    const t = convexTest(schema, modules);
    const user = t.withIdentity({ subject: "synthetic-ai-live-owner" });
    await user.mutation(api.accounts.ensure, { role: "user", displayName: "Synthetic live test", locale: "en" });
    for (const locale of ["en", "hi", "pa"] as const) {
      const caseId = await user.mutation(api.cases.create, { title: "SYNTHETIC TEST ONLY", text: "A fictional tenant wants to prepare documents before meeting an advocate about a deposit receipt.", context: [], locale });
      const documentId = await user.action(api.caseDocuments.upload, { caseId, fileName: "synthetic-marker.txt", contentType: "text/plain", content: new TextEncoder().encode("SYNTHETIC ONLY. Reference marker: MARIGOLD-428. This is fictional test data.").buffer });
      const contextKey = (await user.query(api.chat.listMine, { caseId })).contextKey;
      const result = await user.action(api.chat.send, { caseId, contextKey, consent: true, requestId: `synthetic-first-${locale}`, message: "Read the selected synthetic document. Repeat its reference marker, then give one short document-preparation suggestion in the case language.", documentIds: [documentId] });
      expect(result).toEqual({ kind: "available" });
      const first = await user.query(api.chat.listMine, { caseId });
      const answer = first.turns[0]?.result;
      expect(answer?.kind).toBe("reply");
      if (answer?.kind !== "reply") throw new Error("Expected completed synthetic answer");
      expect(answer.text.includes("MARIGOLD-428")).toBe(true);
      expect(locale === "hi" ? /[\u0900-\u097f]/u.test(answer.text) : locale === "pa" ? /[\u0a00-\u0a7f]/u.test(answer.text) : /[A-Za-z]/u.test(answer.text)).toBe(true);
      if (locale === "en") {
        expect(await user.action(api.chat.send, { caseId, contextKey: first.contextKey, consent: true, requestId: "synthetic-second-en", message: "Repeat the reference marker from the prior answer. No file is selected on this turn.", documentIds: [] })).toEqual({ kind: "available" });
        const second = (await user.query(api.chat.listMine, { caseId })).turns[1]?.result;
        expect(second?.kind === "reply" && second.text.includes("MARIGOLD-428")).toBe(true);
      }
      await user.mutation(api.cases.deleteDraft, { caseId });
    }
  }, 240_000);
});
