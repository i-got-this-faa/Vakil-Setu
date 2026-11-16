import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { api } from "@convex-api";
import { AppProvider, useAppState } from "../state/AppContext";
import { ServicesContext, useServiceQuery, ConvexServices, ServiceNotice } from "../state/ConvexServices";
import HomePage from "../pages/HomePage";
import { MemoryRouter } from "react-router-dom";
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });
function client() {
  const watches = [];
  return { watches, watchQuery: vi.fn((reference, args) => {
    const name = getFunctionName(reference);
    const watch = { name, args, value: name === "cases:listMine" ? { page: [], isDone: true } : undefined, callback: null, unsubscribe: vi.fn() };
    watches.push(watch);
    return { localQueryResult: () => watch.value, onUpdate: callback => { watch.callback = callback; return watch.unsubscribe; } };
  }) };
}
test("query argument changes and sign-out immediately hide old private query results", () => {
  const c = client();
  function Probe({ caseId }) { const query = useServiceQuery(api.cases.getMine, { caseId }); return <p>{query.data?.text || "No private record"}</p>; }
  const view = (id, status = "ready", userId = "alice") => <ServicesContext.Provider value={{ client: c, status, userId }}><Probe caseId={id}/></ServicesContext.Provider>;
  const ui = render(view("case-a"));
  act(() => { c.watches[0].value = { text: "Alice private case" }; c.watches[0].callback(); });
  expect(screen.getByText("Alice private case")).toBeTruthy();
  ui.rerender(view("case-b"));
  expect(screen.queryByText("Alice private case")).toBeNull(); expect(c.watches[0].unsubscribe).toHaveBeenCalled();
  ui.rerender(view("case-b", "signed_out", null));
  act(() => { c.watches[0].value = { text: "Late private response" }; c.watches[0].callback(); });
  expect(screen.queryByText("Late private response")).toBeNull();
});
test("changing Clerk identity remounts all selected private case and advocate state", () => {
  const c = client();
  function Probe() { const state = useAppState(); return <><p>{state.activeCaseId || "No selected case"}</p><p>{state.selectedAdvocate?.displayName || "No advocate"}</p><button onClick={() => { state.setActiveCaseId("alice-case"); state.setSelectedAdvocate({ displayName: "Alice selection" }); }}>Select</button></>; }
  const view = userId => <ServicesContext.Provider value={{ client: c, status: "ready", userId }}><AppProvider><Probe/></AppProvider></ServicesContext.Provider>;
  const ui = render(view("alice")); fireEvent.click(screen.getByText("Select"));
  expect(screen.getByText("alice-case")).toBeTruthy();
  ui.rerender(view("bob"));
  expect(screen.queryByText("alice-case")).toBeNull(); expect(screen.queryByText("Alice selection")).toBeNull();
});
test("missing credentials preserve the landing page and explain unavailable writes", () => {
  // Do not let a developer's real .env.local (VITE_CONVEX_URL / VITE_CLERK_PUBLISHABLE_KEY) drive this test.
  vi.stubEnv("VITE_CONVEX_URL", "");
  vi.stubEnv("VITE_CLERK_PUBLISHABLE_KEY", "");
  render(<MemoryRouter><ConvexServices><AppProvider><ServiceNotice/><HomePage/></AppProvider></ConvexServices></MemoryRouter>);
  expect(screen.queryByAltText("Meera, Legal-Setu AI assistant avatar")).toBeNull();
  expect(screen.getByText(/Account services are not configured/)).toBeTruthy();
  expect(screen.getByRole("link", { name: /Start chat/ })).toBeTruthy();
});
