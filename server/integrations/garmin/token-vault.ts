import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const NONCE_BYTES = 12;
const KEY_BYTES = 32;
const CURRENT_KEY_VERSION = process.env.GARMIN_KEY_VERSION ?? "v1";

type CipherPayload = {
  v: 1;
  keyVersion: string;
  nonce: string;
  ciphertext: string;
  tag: string;
};

function getKey(): Buffer {
  const raw = process.env.GARMIN_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error("GARMIN_TOKEN_ENCRYPTION_KEY is not configured");
  }

  const decoded = /^[0-9a-f]{64}$/i.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");
  if (decoded.length !== KEY_BYTES) {
    throw new Error("GARMIN_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes");
  }
  return decoded;
}

function aadFor(context: string): Buffer {
  return Buffer.from(`garmin-token:${context}`, "utf8");
}

export function encryptToken(token: string, context: string): string {
  if (!token) throw new Error("Cannot encrypt an empty Garmin token");
  const key = getKey();
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, nonce);
  cipher.setAAD(aadFor(context));
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const payload: CipherPayload = {
    v: 1,
    keyVersion: CURRENT_KEY_VERSION,
    nonce: nonce.toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
    tag: tag.toString("base64url"),
  };
  return JSON.stringify(payload);
}

export function decryptToken(ciphertext: string, context: string): string {
  let payload: CipherPayload;
  try {
    payload = JSON.parse(ciphertext) as CipherPayload;
  } catch {
    throw new Error("Invalid encrypted Garmin token payload");
  }

  if (
    payload?.v !== 1 ||
    typeof payload.keyVersion !== "string" ||
    typeof payload.nonce !== "string" ||
    typeof payload.ciphertext !== "string" ||
    typeof payload.tag !== "string"
  ) {
    throw new Error("Malformed encrypted Garmin token payload");
  }

  const key = getKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.nonce, "base64url"),
  );
  decipher.setAAD(aadFor(context));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64url"));
  try {
    return Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("Unable to decrypt Garmin token");
  }
}

export function fingerprintToken(token: string): string {
  const key = getKey();
  return createHmac("sha256", key)
    .update("garmin-token-fingerprint:")
    .update(token, "utf8")
    .digest("hex");
}

export function currentGarminKeyVersion(): string {
  return CURRENT_KEY_VERSION;
}

export function generateGarminEncryptionKey(): string {
  return randomBytes(KEY_BYTES).toString("base64");
}

export function hashOAuthState(state: string): string {
  return createHash("sha256").update(state, "utf8").digest("hex");
}

export function generateOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}
