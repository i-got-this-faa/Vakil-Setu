import { describe, expect, test } from "bun:test";
import { interpolate } from "./i18n-template";

describe("interpolate", () => {
  test("fills named placeholders and keeps unknown ones visible", () => {
    expect(interpolate("{current} / {max} characters", { current: 12, max: 4000 })).toBe("12 / 4000 characters");
    expect(interpolate("Hello {name}, {missing}", { name: "Asha" })).toBe("Hello Asha, {missing}");
  });
});
