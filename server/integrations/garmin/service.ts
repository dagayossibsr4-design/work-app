import { refreshGarminToken } from "./client";
import {
  getGarminCredentials,
  getUserGarminConnection,
  markGarminConnectionError,
  replaceGarminTokens,
} from "./repository";

const REFRESH_SAFETY_WINDOW_MS = 5 * 60 * 1000;

export async function getValidGarminAccessToken(userId: number) {
  const connection = await getUserGarminConnection(userId);
  if (!connection || connection.status !== "active") {
    throw new Error("Garmin connection is not active");
  }
  const credentials = await getGarminCredentials(connection.id);
  if (!credentials) throw new Error("Garmin credentials are missing");

  const expiresSoon = credentials.accessTokenExpiresAt
    ? credentials.accessTokenExpiresAt.getTime() <= Date.now() + REFRESH_SAFETY_WINDOW_MS
    : false;
  if (!expiresSoon) return { connectionId: connection.id, accessToken: credentials.accessToken };
  if (!credentials.refreshToken) {
    await markGarminConnectionError(connection.id, "refresh_token_missing", "expired");
    throw new Error("Garmin refresh token is missing");
  }

  try {
    const refreshed = await refreshGarminToken(credentials.refreshToken);
    await replaceGarminTokens(connection.id, {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? credentials.refreshToken,
      accessTokenExpiresAt: refreshed.accessTokenExpiresAt,
      refreshTokenExpiresAt:
        refreshed.refreshTokenExpiresAt ?? credentials.refreshTokenExpiresAt ?? undefined,
    });
    return { connectionId: connection.id, accessToken: refreshed.accessToken };
  } catch {
    await markGarminConnectionError(connection.id, "token_refresh_failed", "expired");
    throw new Error("Garmin token refresh failed");
  }
}
