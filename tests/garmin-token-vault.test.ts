import { beforeEach, describe, expect, it } from "vitest";
import {
  decryptToken,
  encryptToken,
  fingerprintToken,
  generateOAuthState,
  hashOAuthState,
} from "../server/integrations/garmin/token-vault";

describe("Garmin token vault", () => {
  beforeEach(() => {
    process.env.GARMIN_TOKEN_ENCRYPTION_KEY = Buffer.from(
      "0123456789abcdef0123456789abcdef",
      "utf8",
    ).toString("base64");
    process.env.GARMIN_KEY_VERSION = "test-v1";
  });

  it("encrypts and decrypts a token with context binding", () => {
    const ciphertext = encryptToken("access-secret", "connection:1:access");
    expect(ciphertext).not.toContain("access-secret");
    expect(decryptToken(ciphertext, "connection:1:access")).toBe("access-secret");
  });

  it("rejects a ciphertext under a different context", () => {
    const ciphertext = encryptToken("access-secret", "connection:1:access");
    expect(() => decryptToken(ciphertext, "connection:2:access")).toThrow(
      "Unable to decrypt Garmin token",
    );
  });

  it("uses a fresh nonce for every encryption and a stable fingerprint", () => {
    const first = encryptToken("same-secret", "connection:1:access");
    const second = encryptToken("same-secret", "connection:1:access");
    expect(first).not.toBe(second);
    expect(fingerprintToken("same-secret")).toBe(fingerprintToken("same-secret"));
    expect(fingerprintToken("same-secret")).not.toBe(fingerprintToken("other-secret"));
  });

  it("creates unpredictable OAuth state values and hashes them deterministically", () => {
    const state = generateOAuthState();
    expect(state.length).toBeGreaterThan(30);
    expect(hashOAuthState(state)).toBe(hashOAuthState(state));
    expect(hashOAuthState(state)).not.toBe(hashOAuthState(generateOAuthState()));
  });
});
