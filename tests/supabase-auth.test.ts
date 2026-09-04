import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const ORIGINAL_SECRET = process.env.SUPABASE_JWT_SECRET;
const TEST_SECRET = "test-supabase-jwt-secret-01234567890123456789";

async function signSupabaseToken(payload: Record<string, unknown>) {
  const secret = new TextEncoder().encode(TEST_SECRET);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}

describe("getSupabaseIdentityFromToken (local verification)", () => {
  beforeEach(() => {
    process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    process.env.SUPABASE_JWT_SECRET = ORIGINAL_SECRET;
  });

  it("verifies a validly signed token without any network dependency and extracts the identity", async () => {
    const { getSupabaseIdentityFromToken } = await import("../server/_core/supabaseAuth");
    const token = await signSupabaseToken({
      sub: "11111111-1111-1111-1111-111111111111",
      email: "user@example.com",
      user_metadata: { name: "Test User" },
    });

    const identity = await getSupabaseIdentityFromToken(token);
    expect(identity).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      email: "user@example.com",
      name: "Test User",
    });
  });

  it("rejects a token signed with the wrong secret", async () => {
    const { getSupabaseIdentityFromToken } = await import("../server/_core/supabaseAuth");
    const wrongSecret = new TextEncoder().encode("a-completely-different-secret-value");
    const forged = await new SignJWT({ sub: "attacker-id" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(wrongSecret);

    const identity = await getSupabaseIdentityFromToken(forged);
    expect(identity).toBeNull();
  });

  it("rejects a garbage string that is not a JWT at all", async () => {
    const { getSupabaseIdentityFromToken } = await import("../server/_core/supabaseAuth");
    const identity = await getSupabaseIdentityFromToken("not-a-real-token");
    expect(identity).toBeNull();
  });
});
