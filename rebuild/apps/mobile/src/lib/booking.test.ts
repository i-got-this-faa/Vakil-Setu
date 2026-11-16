import { describe, expect, test } from "bun:test";
import { consultationDurationMinutes, participantBookingActions, pendingRequestExpired } from "./booking";

const start = Date.parse("2026-11-20T10:00:00+05:30");
const end = start + 30 * 60_000;

describe("participantBookingActions", () => {
  test("a user may cancel a live consultation before it starts", () => {
    expect(participantBookingActions({ state: "pending", start, end, now: start - 60_000 })).toEqual(["cancel"]);
    expect(participantBookingActions({ state: "accepted", start, end, now: start - 60_000 })).toEqual(["cancel"]);
  });

  test("no cancellation once the slot has started or the booking is terminal", () => {
    expect(participantBookingActions({ state: "accepted", start, end, now: start })).toEqual([]);
    expect(participantBookingActions({ state: "cancelled", start, end, now: start - 60_000 })).toEqual([]);
    expect(participantBookingActions({ state: "completed", start, end, now: end + 1 })).toEqual([]);
    expect(participantBookingActions({ state: "expired", start, end, now: start - 60_000 })).toEqual([]);
  });
});

describe("pending expiry", () => {
  test("is expired exactly at the deadline", () => {
    expect(pendingRequestExpired(1000, 999)).toBe(false);
    expect(pendingRequestExpired(1000, 1000)).toBe(true);
  });

});

describe("helpers", () => {
  test("rounds durations to whole minutes", () => {
    expect(consultationDurationMinutes(0, 30 * 60_000)).toBe(30);
    expect(consultationDurationMinutes(0, 89_000)).toBe(1);
  });

});
