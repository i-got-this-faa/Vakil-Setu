import { beforeEach, expect, mock, test } from "bun:test";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getFunctionName } from "convex/server";
import { getMessages } from "@vakil/i18n";
import type { PilotLocale } from "@vakil/domain";
import { productCopy } from "../src/lib/copy";
import { caseNoSummaryCopy } from "../src/lib/case-copy";

let locale: PilotLocale = "en";
let intake = "Synthetic intake for the saved outcome check.";
let source: "none" | "manual" | "provider" = "none";

// Only data/auth and audio boundaries are replaced; render the actual case UI.
mock.module("../src/components/workspace-gate", () => ({
  RequireRole: ({ children }: { children: ReactNode }) => children,
}));
mock.module("../src/components/locale", () => ({
  useLocale: () => ({ locale, copy: productCopy[locale], messages: getMessages(locale) }),
}));
mock.module("../src/components/speech", () => ({ ReadAloud: () => null }));
mock.module("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
mock.module("convex/react", () => ({
  useAction: () => () => { throw new Error("Rendering must not call AI."); },
  useMutation: () => () => { throw new Error("Rendering must not write data."); },
  usePaginatedQuery: () => { throw new Error("Case detail must not list cases."); },
  useQuery: (reference: Parameters<typeof getFunctionName>[0]) => {
    const name = getFunctionName(reference);
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
const render = () => renderToStaticMarkup(<CasePage caseId="case-fixture" />);

beforeEach(() => {
  locale = "en";
  intake = "Synthetic intake for the saved outcome check.";
  source = "none";
});

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
