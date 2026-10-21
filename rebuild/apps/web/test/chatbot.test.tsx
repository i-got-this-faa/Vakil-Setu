import { expect, test } from "bun:test";
import { createChatStarterAttempt, getChatbotCopy, runChatStarter } from "../src/lib/chatbot-copy";

test("lost creation acknowledgement replays the same creation request", async () => {
  const attempt = createChatStarterAttempt<string>("  My legal question  ", "hi", false);
  const requests: string[] = [];
  let sends = 0;
  const boundary = {
    create: async (args: { requestId: string; title: string; text: string }) => {
      requests.push(args.requestId);
      expect(args.title).toBe("My legal question");
      expect(args.text).toBe("My legal question");
      if (requests.length === 1) throw new Error("lost acknowledgement");
      return "saved-case";
    },
    send: async () => { sends++; return { kind: "available" }; },
  };
  await expect(runChatStarter(attempt, boundary)).rejects.toThrow("lost acknowledgement");
  await runChatStarter(attempt, boundary);
  expect(requests).toEqual([attempt.creationRequestId, attempt.creationRequestId]);
  expect(sends).toBe(1);
});

test("send retry retains the saved case, exact question, consent and request ID", async () => {
  const attempt = createChatStarterAttempt<string>("x".repeat(130), "pa", true);
  let creates = 0;
  const requests: unknown[] = [];
  const boundary = {
    create: async (args: { title: string }) => { creates++; expect(args.title.length).toBe(100); return "saved-case"; },
    send: async (args: unknown) => { requests.push(args); if (requests.length === 1) throw new Error("network"); return { kind: "unavailable", reason: "rate_limited" }; },
  };
  await expect(runChatStarter(attempt, boundary)).rejects.toThrow("network");
  expect(attempt.caseId).toBe("saved-case");
  const result = await runChatStarter(attempt, boundary);
  expect(creates).toBe(1);
  expect(requests[0]).toEqual(requests[1]);
  expect(requests[1]).toEqual({ caseId: "saved-case", message: "x".repeat(130), documentIds: [], requestId: attempt.sendRequestId, contextKey: "0:0:", consent: true, allowVertexFallback: true });
  expect(result.result).toEqual({ kind: "unavailable", reason: "rate_limited" });
});

test("primary-only requests omit fallback permission and unknown copy falls back honestly", async () => {
  const attempt = createChatStarterAttempt<string>("question", "en", false);
  await runChatStarter(attempt, {
    create: async () => "saved-case",
    send: async args => { expect("allowVertexFallback" in args).toBe(false); return { kind: "available" }; },
  });
  expect(getChatbotCopy("ta")).toBe(getChatbotCopy("en"));
  expect(getChatbotCopy("ta").fallback).toContain("English");
});
