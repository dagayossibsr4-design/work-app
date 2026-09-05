import { describe, expect, it } from "vitest";
import { shouldResetLocalAccountCache } from "../lib/account-cache-isolation";

describe("shouldResetLocalAccountCache", () => {
  it("resets when this device's cache belongs to a different account and there is no cloud snapshot yet", () => {
    expect(shouldResetLocalAccountCache({ storedOwnerId: "admin-uuid", currentAccountId: "new-user-uuid", hasCloudSnapshot: false })).toBe(true);
  });

  it("never resets once a cloud snapshot exists, regardless of the local owner marker", () => {
    expect(shouldResetLocalAccountCache({ storedOwnerId: "admin-uuid", currentAccountId: "new-user-uuid", hasCloudSnapshot: true })).toBe(false);
  });

  it("never resets a brand-new device that has no owner marker yet", () => {
    expect(shouldResetLocalAccountCache({ storedOwnerId: null, currentAccountId: "new-user-uuid", hasCloudSnapshot: false })).toBe(false);
  });

  it("never resets when the same account signs back in", () => {
    expect(shouldResetLocalAccountCache({ storedOwnerId: "same-uuid", currentAccountId: "same-uuid", hasCloudSnapshot: false })).toBe(false);
  });
});
