import { and, eq, gt, isNull } from "drizzle-orm";
import {
  garminConnections,
  garminCredentials,
  garminOauthStates,
  garminSyncRuns,
} from "../../../drizzle/schema";
import { getDb } from "../../db";
import {
  currentGarminKeyVersion,
  decryptToken,
  encryptToken,
  fingerprintToken,
  generateCodeVerifier,
  generateOAuthState,
  hashOAuthState,
} from "./token-vault";

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type StoredTokens = {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
};

function tokenContext(connectionId: number, field: "access" | "refresh") {
  return `connection:${connectionId}:${field}`;
}

export async function createOAuthState(userId: number, returnUri: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const state = generateOAuthState();
  const codeVerifier = generateCodeVerifier();
  await db.insert(garminOauthStates).values({
    userId,
    stateHash: hashOAuthState(state),
    codeVerifierCiphertext: encryptToken(codeVerifier, `oauth-state:${userId}`),
    returnUri,
    expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
  });
  return { state, codeVerifier };
}

export async function consumeOAuthState(state: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const stateHash = hashOAuthState(state);
  const rows = await db
    .select()
    .from(garminOauthStates)
    .where(
      and(
        eq(garminOauthStates.stateHash, stateHash),
        isNull(garminOauthStates.consumedAt),
        gt(garminOauthStates.expiresAt, new Date()),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const consumed = await db
    .update(garminOauthStates)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(garminOauthStates.id, row.id),
        isNull(garminOauthStates.consumedAt),
        gt(garminOauthStates.expiresAt, new Date()),
      ),
    );
  if (Number(consumed[0]?.affectedRows ?? 0) !== 1) return null;

  return {
    ...row,
    codeVerifier: row.codeVerifierCiphertext
      ? decryptToken(row.codeVerifierCiphertext, `oauth-state:${row.userId}`)
      : undefined,
  };
}

export async function upsertGarminConnection(
  userId: number,
  garminUserId: string | undefined,
  scopes: string[],
  tokens: StoredTokens,
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const existing = await db
    .select()
    .from(garminConnections)
    .where(
      and(eq(garminConnections.userId, userId), eq(garminConnections.provider, "garmin")),
    )
    .limit(1);
  let connectionId = existing[0]?.id;

  if (connectionId) {
    await db
      .update(garminConnections)
      .set({
        garminUserIdHash: garminUserId ? fingerprintToken(garminUserId) : undefined,
        status: "active",
        scopes,
        connectedAt: existing[0]?.connectedAt ?? new Date(),
        revokedAt: null,
        lastErrorCode: null,
        lastErrorAt: null,
        updatedAt: new Date(),
      })
      .where(eq(garminConnections.id, connectionId));
  } else {
    const inserted = await db
      .insert(garminConnections)
      .values({
        userId,
        provider: "garmin",
        garminUserIdHash: garminUserId ? fingerprintToken(garminUserId) : undefined,
        status: "active",
        scopes,
        connectedAt: new Date(),
      });
    connectionId = Number(inserted[0].insertId);
  }

  const accessTokenCiphertext = encryptToken(
    tokens.accessToken,
    tokenContext(connectionId, "access"),
  );
  const refreshTokenCiphertext = tokens.refreshToken
    ? encryptToken(tokens.refreshToken, tokenContext(connectionId, "refresh"))
    : undefined;
  const credential = {
    connectionId,
    accessTokenCiphertext,
    refreshTokenCiphertext,
    accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
    keyVersion: currentGarminKeyVersion(),
    tokenFingerprint: fingerprintToken(tokens.accessToken),
    rotatedAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(garminCredentials).values(credential).onDuplicateKeyUpdate({
    set: {
      accessTokenCiphertext,
      refreshTokenCiphertext,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      keyVersion: credential.keyVersion,
      tokenFingerprint: credential.tokenFingerprint,
      rotatedAt: credential.rotatedAt,
      updatedAt: credential.updatedAt,
    },
  });
  return connectionId;
}

export async function getUserGarminConnection(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(garminConnections)
    .where(
      and(eq(garminConnections.userId, userId), eq(garminConnections.provider, "garmin")),
    )
    .limit(1);
  return rows[0];
}

export async function getGarminCredentials(connectionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(garminCredentials)
    .where(eq(garminCredentials.connectionId, connectionId))
    .limit(1);
  const row = rows[0];
  if (!row) return undefined;
  return {
    ...row,
    accessToken: decryptToken(row.accessTokenCiphertext, tokenContext(connectionId, "access")),
    refreshToken: row.refreshTokenCiphertext
      ? decryptToken(row.refreshTokenCiphertext, tokenContext(connectionId, "refresh"))
      : undefined,
  };
}

export async function replaceGarminTokens(
  connectionId: number,
  tokens: StoredTokens,
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const accessTokenCiphertext = encryptToken(
    tokens.accessToken,
    tokenContext(connectionId, "access"),
  );
  const refreshTokenCiphertext = tokens.refreshToken
    ? encryptToken(tokens.refreshToken, tokenContext(connectionId, "refresh"))
    : undefined;
  await db
    .update(garminCredentials)
    .set({
      accessTokenCiphertext,
      refreshTokenCiphertext,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      keyVersion: currentGarminKeyVersion(),
      tokenFingerprint: fingerprintToken(tokens.accessToken),
      rotatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(garminCredentials.connectionId, connectionId));
}

export async function markGarminConnectionError(
  connectionId: number,
  errorCode: string,
  status: "expired" | "error" = "error",
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(garminConnections)
    .set({ status, lastErrorCode: errorCode.slice(0, 64), lastErrorAt: new Date() })
    .where(eq(garminConnections.id, connectionId));
}

export async function disconnectGarminConnection(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const connection = await getUserGarminConnection(userId);
  if (!connection) return false;
  await db.delete(garminCredentials).where(eq(garminCredentials.connectionId, connection.id));
  await db
    .update(garminConnections)
    .set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() })
    .where(eq(garminConnections.id, connection.id));
  return true;
}

export async function createSyncRun(connectionId: number, requestedBy: "user" | "scheduled" | "retry") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const inserted = await db.insert(garminSyncRuns).values({ connectionId, requestedBy, status: "queued" });
  return Number(inserted[0].insertId);
}
