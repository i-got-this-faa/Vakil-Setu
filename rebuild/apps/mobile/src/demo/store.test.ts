import { expect, test } from "bun:test";
import { makeFunctionReference } from "convex/server";
import { runAction, runMutation, runQuery } from "./store";

test("a fresh demo conversation clears the prior turns and gets a distinct ID", async () => {
  const start = makeFunctionReference("conversations:startNew");
  const get = makeFunctionReference("conversations:get");
  const first = await runMutation(start, { locale: "doi", consent: true });
  await runAction(makeFunctionReference("voice:send"), { requestId: "demo-reset-test", input: { kind: "text", text: "Demo question" } });
  expect(runQuery(get, {})).toMatchObject({ turnCount: 1 });
  const next = await runMutation(start, { locale: "doi", consent: true });
  expect(next).not.toBe(first);
  expect(runQuery(get, {})).toMatchObject({ _id: next, turnCount: 0, turns: [], bookings: [], profile: { suggestLawyer: false } });
});
