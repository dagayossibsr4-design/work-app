import { describe, expect, it } from "vitest";

import { existingUserOtpOptions, NEW_USER_ACCESS_MESSAGE, validateExistingUserLogin } from "../lib/access-policy";

describe("access policy", () => {
  it("never allows OTP to create a new user", () => {
    expect(existingUserOtpOptions("https://example.com/register")).toEqual({
      emailRedirectTo: "https://example.com/register",
      shouldCreateUser: false,
    });
  });

  it("explains the payment and manager approval gate", () => {
    expect(NEW_USER_ACCESS_MESSAGE).toContain("תשלום");
    expect(NEW_USER_ACCESS_MESSAGE).toContain("אישור מנהל");
  });

  it("requires a valid email and password for approved-user login", () => {
    expect(validateExistingUserLogin("bad-email", "secret")).toContain("דוא״ל");
    expect(validateExistingUserLogin("user@example.com", "")).toContain("סיסמה");
    expect(validateExistingUserLogin(" USER@example.com ", "secret")).toBeNull();
  });
});
