import type { Express, Request, Response } from "express";
import { activateUserSubscription } from "./db";
import { parseMorningWebhookPayload, verifyMorningWebhookSignature } from "./morning";

const PLAN_DURATION_DAYS: Record<"monthly" | "annual", number> = {
  monthly: 30,
  annual: 365,
};

// Best-effort in-process de-duplication for webhook retries. Not durable
// across restarts/instances - acceptable here because re-processing the same
// paid event only extends the subscription a little early, it never charges
// or grants access without a verified signature.
const processedEventIds = new Set<string>();
const MAX_TRACKED_EVENTS = 5000;

function rememberEvent(eventId: string): boolean {
  if (processedEventIds.has(eventId)) return false;
  if (processedEventIds.size >= MAX_TRACKED_EVENTS) processedEventIds.clear();
  processedEventIds.add(eventId);
  return true;
}

/**
 * Receives Morning/Green Invoice payment webhooks. This is the only place a
 * user's subscription is ever activated - the checkout redirect (successUrl)
 * is never trusted on its own, so nobody gets billing "approval" without a
 * signature-verified server-to-server confirmation from Morning.
 */
export function registerMorningWebhookRoutes(app: Express) {
  app.post("/api/webhooks/morning", async (req: Request, res: Response) => {
    const rawBody: Buffer | undefined = (req as Request & { rawBody?: Buffer }).rawBody;
    const signature = req.header("X-Data-Signature") ?? req.header("x-data-signature");

    if (!rawBody || !verifyMorningWebhookSignature(rawBody, signature)) {
      console.warn("[Morning webhook] Rejected request with invalid or missing signature");
      res.status(401).json({ ok: false, error: "invalid_signature" });
      return;
    }

    const outcome = parseMorningWebhookPayload(req.body);

    if (!outcome.recognized) {
      console.warn("[Morning webhook] Unrecognized payload shape, ignoring", JSON.stringify(req.body).slice(0, 500));
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    if (outcome.eventId && !rememberEvent(outcome.eventId)) {
      res.status(200).json({ ok: true, duplicate: true });
      return;
    }

    if (!outcome.paid) {
      // Failed/declined/refunded/cancelled events: nothing to activate.
      res.status(200).json({ ok: true, paid: false });
      return;
    }

    if (!outcome.userId) {
      console.warn("[Morning webhook] Paid event missing customFields.userId, cannot activate");
      res.status(200).json({ ok: true, error: "missing_user_id" });
      return;
    }

    try {
      const days = PLAN_DURATION_DAYS[outcome.planType ?? "monthly"];
      await activateUserSubscription(outcome.userId, days);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[Morning webhook] Failed to activate subscription:", error);
      // 500 so Morning retries the webhook instead of silently losing the payment confirmation.
      res.status(500).json({ ok: false });
    }
  });
}
