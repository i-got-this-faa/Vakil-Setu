import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const shared = vi.hoisted(() => ({ state: null }));
vi.mock("../state/AppContext", () => ({ useAppState: () => shared.state }));
import { useLegalChat } from "../hooks/useLegalChat";
afterEach(cleanup);
beforeEach(() => {
  shared.state = { services: { status: "ready", userId: "alice", client: { query: vi.fn(async () => ({ contextKey: "current", turns: [] })), action: vi.fn(async () => ({ kind: "available" })) } }, capabilities: { configured: true }, activeCaseId: "case-a", sessionGeneration: { current: 0 }, chatMessages: [], conversation: {}, clearSession: vi.fn() };
});
const wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>;
test("no consent means no private query, model action or mutation", async () => {
  const { result } = renderHook(useLegalChat, { wrapper });
  await act(async () => { expect(await result.current.submitMessage("Private facts", "english", false)).toBe(false); });
  expect(shared.state.services.client.query).not.toHaveBeenCalled(); expect(shared.state.services.client.action).not.toHaveBeenCalled();
});
test("an in-progress retry reuses the exact request id and reviewed context", async () => {
  const action = shared.state.services.client.action;
  action.mockResolvedValueOnce({ kind: "unavailable", reason: "in_progress" }).mockResolvedValueOnce({ kind: "available" });
  const { result } = renderHook(useLegalChat, { wrapper });
  await act(async () => result.current.submitMessage("Same message", "english", true));
  await act(async () => result.current.submitMessage("Same message", "english", true));
  expect(action.mock.calls[0][1]).toEqual(action.mock.calls[1][1]);
  expect(action.mock.calls[0][1]).not.toHaveProperty("allowVertexFallback");
});
test("a new case invalidates an in-flight reply before read-aloud or other effects", async () => {
  let resolve; shared.state.services.client.action.mockReturnValue(new Promise(r => { resolve = r; }));
  const { result } = renderHook(useLegalChat, { wrapper });
  let send; await act(async () => { send = result.current.submitMessage("Old facts", "english", true); });
  shared.state.sessionGeneration.current++;
  await act(async () => { resolve({ kind: "available" }); await send; });
  expect(shared.state.services.client.query).toHaveBeenCalledTimes(1);
});
