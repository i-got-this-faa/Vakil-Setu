import { describe, expect, test } from "bun:test";
import { formatIst, formatIstFallback } from "./format";

describe("formatIst", () => {
  test("renders the Indian Standard Time wall clock regardless of the device zone", () => {
    // 2026-11-20 04:30 UTC is 10:00 IST.
    const instant = Date.parse("2026-11-20T04:30:00Z");
    const text = formatIst(instant, "en");
    expect(text).toContain("10:00");
  });

  test("fallback formatting uses the +05:30 offset and crosses midnight correctly", () => {
    expect(formatIstFallback(Date.parse("2026-11-20T20:00:00Z"))).toBe("21 Nov 2026, 01:30 IST");
    expect(formatIstFallback(Date.parse("2026-01-05T04:30:00Z"))).toBe("05 Jan 2026, 10:00 IST");
  });
});
