import { beforeEach, expect, mock, test } from "bun:test";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getFunctionName } from "convex/server";
import { getMessages } from "@vakil/i18n";
import type { PilotLocale } from "@vakil/domain";
import { productCopy } from "../src/lib/copy";
import { caseNoSummaryCopy } from "../src/lib/case-copy";
import { chatCopy } from "../src/lib/chat-copy";

let locale: PilotLocale = "en";
let intake = "Synthetic intake for the saved outcome check.";
let source: "none" | "manual" | "provider" = "none";
let chatScenario: "empty" | "reply" | "pending" | "unavailable" | "timeout" = "empty";

// Only data/auth and audio boundaries are replaced; render the actual case UI.
mock.module("../src/components/workspace-gate", () => ({
  RequireRole: ({ children }: { children: ReactNode }) => children,
  useAccount: () => ({ role: "user" }),
}));
mock.module("../src/components/locale", () => ({
  useLocale: () => ({ locale, copy: productCopy[locale], messages: getMessages(locale) }),
}));
mock.module("../src/components/speech", () => ({ ReadAloud: () => null, SpeechCapture: () => null }));
mock.module("../src/components/providers", () => ({ useServices: () => ({ kind: "configured" }) }));
mock.module("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
mock.module("convex/react", () => ({
  useAction: () => () => { throw new Error("Rendering must not call AI."); },
  useMutation: () => () => { throw new Error("Rendering must not write data."); },
  usePaginatedQuery: () => { throw new Error("Case detail must not list cases."); },
  useQuery: (reference: Parameters<typeof getFunctionName>[0]) => {
    const name = getFunctionName(reference);
    if (name === "chat:listMine") return { turns: chatScenario === "empty" ? [] : [{ _id: "turn-fixture", text: "Synthetic user question", createdAt: 0, documentIds: ["removed-document-fixture"], result: chatScenario === "reply" ? { kind: "reply", text: '<script>alert("unsafe")</script> Synthetic model reply' } : chatScenario === "pending" ? { kind: "pending" } : { kind: "unavailable", reason: chatScenario === "timeout" ? "timeout" : "blocked" } }], limitReached: false, contextKey: "0:0:" };
    if (name === "caseDocuments:listMine") return [];
    if (name === "cases:resolveMine") return "case-fixture";
    if (name !== "cases:getMine") throw new Error(`Unexpected query: ${name}`);
    return {
      case: { _id: "case-fixture", title: "Test case", text: intake, locale,
        state: "draft", summaryVersion: source === "none" ? 0 : 1,
        contextRevision: 0, context: [] },
      summaries: source === "none" ? [] : [{ _id: "summary-fixture", version: 1,
        createdAt: 0, source: { kind: source },
        summary: { text: "Reviewed fixture summary", domain: "unknown", urgency: "unknown", actions: [], locale } }],
    };
  },
}));

const { CasePage } = await import("../src/components/cases");
const { Intake } = await import("../src/components/intake");
const render = () => renderToStaticMarkup(<CasePage caseId="case-fixture" />);

beforeEach(() => {
  locale = "en";
  intake = "Synthetic intake for the saved outcome check.";
  source = "none";
  chatScenario = "empty";
});

test("a persisted timeout offers review and retry without dispatching automatically", () => {
  chatScenario = "timeout";
  const html = render();
  expect(html).toContain(chatCopy.en.restoreMessage);
  expect(html).toContain("Your case is saved");
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?Send message/);
});

for (const pilot of ["en", "hi", "pa"] as const) {
  test(`${pilot}: intake saves before chat with no model consent or AI action`, () => {
    locale = pilot;
    const html = renderToStaticMarkup(<Intake />);
    expect(html).not.toContain("Gemini");
    expect(html).not.toContain('value="chat"');
    expect(html.match(/type="submit"/g)).toHaveLength(1);
  });
}

for (const pilot of ["en", "hi", "pa"] as const) {
  test(`${pilot}: a saved intake shows an outcome and prefills a reviewed manual summary`, () => {
    locale = pilot;
    const html = render();
    expect(html).toContain(caseNoSummaryCopy[pilot].savedTitle);
    expect(html).toContain(caseNoSummaryCopy[pilot].noAnalysis);
    expect(html).toContain(caseNoSummaryCopy[pilot].findAdvocate);
    expect(html.match(/<textarea[^>]*id="summary-text"[^>]*>([\s\S]*?)<\/textarea>/)?.[1]).toBe(intake);
    expect(html).toMatch(/<option value="unknown" selected="">Unknown<\/option>/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Save reviewed summary<\/button>/);
  });
}

test("a long intake stays intact and asks the user to shorten the manual summary", () => {
  intake = "ਪ".repeat(5000);
  const html = render();
  expect(html).toContain(intake);
  expect(html).toContain(caseNoSummaryCopy.en.shortenSummary);
});

test("an unreviewed provider draft prompts review", () => {
  source = "provider";
  const html = render();
  expect(html).toContain("Review your draft");
  expect(html).not.toContain("Ready to contact an advocate");
});

test("a manually reviewed summary offers advocate discovery", () => {
  source = "manual";
  const html = render();
  expect(html).toContain("Ready to contact an advocate");
  expect(html).toContain("Reviewed fixture summary");
  expect(html).not.toContain(caseNoSummaryCopy.en.noAnalysis);
});

test("chat renders model text safely and identifies removed attachments", () => {
  chatScenario = "reply";
  const html = render();
  expect(html).toContain("Synthetic user question");
  expect(html).toContain("Synthetic model reply");
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain('<script>alert("unsafe")</script>');
  expect(html).toContain(chatCopy.en.disclaimer);
  expect(html).toContain(chatCopy.en.removedAttachment);
});

test("pending chat prevents another send and does not render a reply", () => {
  chatScenario = "pending";
  const html = render();
  expect(html).toContain(chatCopy.en.pendingStatus);
  expect(html).not.toContain("Synthetic model reply");
  const sendButton = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].find(match => match[2]?.includes("Send message"));
  expect(sendButton?.[1]).toContain('disabled=""');
});

for (const pilot of ["en", "hi", "pa"] as const) {
  test(`${pilot}: failed chat explains the result and exposes document limits and recipient`, () => {
    locale = pilot;
    chatScenario = "unavailable";
    const html = render();
    expect(html).toContain(chatCopy[pilot].title.replaceAll("&", "&amp;"));
    expect(html).toContain(chatCopy[pilot].errors.blocked);
    expect(html).toContain("Google Gemini");
    expect(html).toContain("3 MiB");
    expect(html).toContain('accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"');
  });
}
