import { describe, expect, test } from "bun:test";
import { bookingStateLabel, bookingStateTone, consultationModeLabel, urgencyLabel } from "./labels";

describe("labels", () => {
  test("consultation modes map to their names", () => {
    expect(consultationModeLabel("in_person")).toBe("In person");
    expect(consultationModeLabel("sms")).toBe("Not listed");
  });

  test("urgency keeps the no-guarantee wording for emergency", () => {
    expect(urgencyLabel("emergency")).toContain("no guaranteed response");
    expect(urgencyLabel("future-level")).toBe("Unmarked");
  });

  test("booking states map to a label and tone", () => {
    expect(bookingStateLabel("pending")).toBe("Awaiting advocate");
    expect(bookingStateTone("accepted")).toBe("success");
    expect(bookingStateTone("pending")).toBe("warning");
    expect(bookingStateTone("expired")).toBe("danger");
    expect(bookingStateLabel("legacy")).toBe("Unknown status");
    expect(bookingStateTone("legacy")).toBe("neutral");
  });
});
