import type { Express, Request, Response } from "express";
import { ENV } from "../../_core/env";
import { exchangeGarminCode } from "./client";
import {
  consumeOAuthState,
  disconnectGarminConnection,
  getUserGarminConnection,
  createOAuthState,
  createSyncRun,
  upsertGarminConnection,
} from "./repository";

function queryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function redirectWithStatus(res: Response, status: "success" | "error", code: string) {
  const destination = ENV.garminReturnUri || "workouttracker://garmin/callback";
  try {
    const url = new URL(destination);
    url.searchParams.set("status", status);
    url.searchParams.set("code", code);
    res.redirect(302, url.toString());
  } catch {
    res.status(status === "error" ? 500 : 200).json({ status, code });
  }
}

export function registerGarminRoutes(app: Express) {
  app.get("/api/integrations/garmin/callback", async (req: Request, res: Response) => {
    const code = queryParam(req, "code");
    const state = queryParam(req, "state");
    const providerError = queryParam(req, "error");
    if (providerError || !code || !state) {
      redirectWithStatus(res, "error", "authorization_denied");
      return;
    }

    try {
      const oauthState = await consumeOAuthState(state);
      if (!oauthState) {
        redirectWithStatus(res, "error", "invalid_or_expired_state");
        return;
      }
      const tokens = await exchangeGarminCode(code, oauthState.codeVerifier);
      const connectionId = await upsertGarminConnection(
        oauthState.userId,
        tokens.garminUserId,
        tokens.scopes,
        tokens,
      );
      redirectWithStatus(res, "success", `connected_${connectionId}`);
    } catch (error) {
      console.error("[Garmin] OAuth callback failed", error instanceof Error ? error.message : "unknown");
      redirectWithStatus(res, "error", "oauth_exchange_failed");
    }
  });
}

export async function beginGarminConnection(userId: number) {
  if (!ENV.garminEnabled) {
    return { configured: false as const, reason: "approval_pending" as const };
  }
  if (!ENV.garminReturnUri) {
    throw new Error("GARMIN_RETURN_URI is not configured");
  }
  const { state, codeVerifier } = await createOAuthState(userId, ENV.garminReturnUri);
  const { buildGarminAuthorizationUrl } = await import("./client");
  return {
    configured: true as const,
    authorizationUrl: buildGarminAuthorizationUrl(state, codeVerifier),
  };
}

export async function getGarminStatus(userId: number) {
  const connection = await getUserGarminConnection(userId);
  return {
    configured: ENV.garminEnabled,
    connected: connection?.status === "active",
    status: connection?.status ?? "not_connected",
    scopes: connection?.scopes ?? [],
    lastSyncAt: connection?.lastSyncAt?.toISOString() ?? null,
    lastErrorCode: connection?.lastErrorCode ?? null,
  };
}

export async function requestGarminSync(userId: number) {
  const connection = await getUserGarminConnection(userId);
  if (!connection || connection.status !== "active") {
    throw new Error("Garmin connection is not active");
  }
  return { syncRunId: await createSyncRun(connection.id, "user") };
}

export async function disconnectGarmin(userId: number) {
  return { disconnected: await disconnectGarminConnection(userId) };
}
