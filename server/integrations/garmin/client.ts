import { createHash } from "node:crypto";
import { ENV } from "../../_core/env";

export type GarminTokenResponse = {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
  garminUserId?: string;
  scopes: string[];
};

function assertConfigured() {
  const missing = [
    ["GARMIN_ENABLED", ENV.garminEnabled],
    ["GARMIN_CLIENT_ID", ENV.garminClientId],
    ["GARMIN_CLIENT_SECRET", ENV.garminClientSecret],
    ["GARMIN_AUTHORIZATION_URL", ENV.garminAuthorizationUrl],
    ["GARMIN_TOKEN_URL", ENV.garminTokenUrl],
    ["GARMIN_REDIRECT_URI", ENV.garminRedirectUri],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`Garmin integration is not configured: ${missing.join(", ")}`);
  }
}

function usePkce() {
  return process.env.GARMIN_USE_PKCE === "true";
}

export function buildGarminAuthorizationUrl(state: string, codeVerifier: string) {
  assertConfigured();
  const url = new URL(ENV.garminAuthorizationUrl);
  url.searchParams.set("client_id", ENV.garminClientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", ENV.garminRedirectUri);
  url.searchParams.set("scope", ENV.garminScopes.join(" "));
  url.searchParams.set("state", state);
  if (usePkce()) {
    url.searchParams.set(
      "code_challenge",
      createHash("sha256").update(codeVerifier).digest("base64url"),
    );
    url.searchParams.set("code_challenge_method", "S256");
  }
  return url.toString();
}

async function parseTokenResponse(response: Response): Promise<GarminTokenResponse> {
  const body = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`Garmin token exchange failed: ${response.status}`);
  }
  const accessToken = typeof body.access_token === "string" ? body.access_token : undefined;
  if (!accessToken) throw new Error("Garmin token response did not contain access_token");
  const refreshToken = typeof body.refresh_token === "string" ? body.refresh_token : undefined;
  const expiresIn = typeof body.expires_in === "number" ? body.expires_in : undefined;
  const refreshExpiresIn = typeof body.refresh_token_expires_in === "number"
    ? body.refresh_token_expires_in
    : undefined;
  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
    refreshTokenExpiresAt: refreshExpiresIn
      ? new Date(Date.now() + refreshExpiresIn * 1000)
      : undefined,
    garminUserId: typeof body.user_id === "string" ? body.user_id : undefined,
    scopes: Array.isArray(body.scope)
      ? body.scope.filter((item): item is string => typeof item === "string")
      : ENV.garminScopes,
  };
}

export async function exchangeGarminCode(code: string, codeVerifier?: string) {
  assertConfigured();
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: ENV.garminClientId,
    client_secret: ENV.garminClientSecret,
    redirect_uri: ENV.garminRedirectUri,
  });
  if (usePkce() && codeVerifier) form.set("code_verifier", codeVerifier);
  const response = await fetch(ENV.garminTokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });
  return parseTokenResponse(response);
}

export async function refreshGarminToken(refreshToken: string) {
  assertConfigured();
  const form = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: ENV.garminClientId,
    client_secret: ENV.garminClientSecret,
  });
  const response = await fetch(ENV.garminTokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });
  return parseTokenResponse(response);
}
