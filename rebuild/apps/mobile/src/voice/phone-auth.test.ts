import { describe, expect, test } from "bun:test";
import { phoneSignInEnabled } from "./phone-auth";

describe("phone sign-in settings", () => {
  test("does not offer phone codes for an email-only Clerk instance", () => {
    expect(phoneSignInEnabled({ auth_config: { phone_number: "off", first_factors: ["email_code", "password"] } })).toBe(false);
  });
  test("requires phone code as a first factor, not just a phone profile field", () => {
    expect(phoneSignInEnabled({ auth_config: { phone_number: "on", first_factors: ["password"] } })).toBe(false);
    expect(phoneSignInEnabled({ auth_config: { phone_number: "on", first_factors: ["phone_code"] } })).toBe(true);
  });
  test("fails closed for malformed configuration", () => {
    for (const value of [null, {}, { auth_config: null }, { auth_config: { first_factors: "phone_code" } }]) {
      expect(phoneSignInEnabled(value)).toBe(false);
    }
  });
});
