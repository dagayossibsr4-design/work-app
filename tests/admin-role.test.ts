import { describe, expect, it } from "vitest";
import { isAdminRole, normalizeAppRole } from "../lib/admin-role";

describe("admin role authorization", () => {
  it("accepts only the exact admin role", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("user")).toBe(false);
    expect(isAdminRole("ADMIN")).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });

  it("normalizes unknown database values to user", () => {
    expect(normalizeAppRole("admin")).toBe("admin");
    expect(normalizeAppRole("user")).toBe("user");
    expect(normalizeAppRole("owner")).toBe("user");
    expect(normalizeAppRole(null)).toBe("user");
  });
});
