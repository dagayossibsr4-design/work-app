import { createHmac } from "crypto";
import { describe, expect, it, beforeEach, afterEach } from "vitest";

const ORIGINAL_SECRET = process.env.MORNING_WEBHOOK_SECRET;

describe("Morning webhook security", () => {
  beforeEach(() => {
    process.env.MORNING_WEBHOOK_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.MORNING_WEBHOOK_SECRET = ORIGINAL_SECRET;
  });

  it("rejects a webhook with no signature header", async () => {
    const { verifyMorningWebhookSignature } = await import("../server/morning");
    const body = Buffer.from(JSON.stringify({ status: "paid" }));
    expect(verifyMorningWebhookSignature(body, undefined)).toBe(false);
  });

  it("rejects a webhook with a forged or mismatched signature", async () => {
    const { verifyMorningWebhookSignature } = await import("../server/morning");
    const body = Buffer.from(JSON.stringify({ status: "paid" }));
    expect(verifyMorningWebhookSignature(body, "0".repeat(64))).toBe(false);
  });

  it("accepts a webhook whose signature matches HMAC-SHA256 of the raw body", async () => {
    const { verifyMorningWebhookSignature } = await import("../server/morning");
    const body = Buffer.from(JSON.stringify({ status: "paid", customFields: { userId: 42 } }));
    const signature = createHmac("sha256", "test-secret").update(body).digest("hex");
    expect(verifyMorningWebhookSignature(body, signature)).toBe(true);
  });

  it("rejects when a tampered body no longer matches its original signature", async () => {
    const { verifyMorningWebhookSignature } = await import("../server/morning");
    const original = Buffer.from(JSON.stringify({ status: "paid", customFields: { userId: 42 } }));
    const signature = createHmac("sha256", "test-secret").update(original).digest("hex");
    const tampered = Buffer.from(JSON.stringify({ status: "paid", customFields: { userId: 999 } }));
    expect(verifyMorningWebhookSignature(tampered, signature)).toBe(false);
  });
});

describe("Morning webhook payload parsing", () => {
  it("recognizes a successful payment and extracts the user id and plan", async () => {
    const { parseMorningWebhookPayload } = await import("../server/morning");
    const outcome = parseMorningWebhookPayload({
      status: "paid",
      customFields: { userId: 7, planType: "annual" },
      id: "evt_123",
    });
    expect(outcome).toEqual({ recognized: true, paid: true, userId: "7", planType: "annual", eventId: "evt_123" });
  });

  it("does not treat an unrecognized payload shape as paid", async () => {
    const { parseMorningWebhookPayload } = await import("../server/morning");
    const outcome = parseMorningWebhookPayload({ hello: "world" });
    expect(outcome.recognized).toBe(false);
    expect(outcome.paid).toBe(false);
  });

  it("marks a failed/refunded event as recognized but not paid", async () => {
    const { parseMorningWebhookPayload } = await import("../server/morning");
    const outcome = parseMorningWebhookPayload({ status: "refunded", customFields: { userId: 7 } });
    expect(outcome.recognized).toBe(true);
    expect(outcome.paid).toBe(false);
  });

  it("never marks paid when an explicit paid:false flag is present, even with a paid-like status", async () => {
    const { parseMorningWebhookPayload } = await import("../server/morning");
    const outcome = parseMorningWebhookPayload({ status: "paid", paid: false, customFields: { userId: 7 } });
    expect(outcome.paid).toBe(false);
  });

  it("passes through a Supabase-style UUID user id unchanged", async () => {
    const { parseMorningWebhookPayload } = await import("../server/morning");
    const outcome = parseMorningWebhookPayload({
      status: "paid",
      customFields: { userId: "8f14e45f-ceea-4f6c-8f8e-0d9d1d0f1a2b", planType: "monthly" },
      id: "evt_uuid",
    });
    expect(outcome.userId).toBe("8f14e45f-ceea-4f6c-8f8e-0d9d1d0f1a2b");
  });

  it("reads nested data.* payloads the same way as a flat payload", async () => {
    const { parseMorningWebhookPayload } = await import("../server/morning");
    const outcome = parseMorningWebhookPayload({
      data: { status: "success", customFields: { userId: "12", planType: "monthly" }, transactionId: "tx_9" },
    });
    expect(outcome).toEqual({ recognized: true, paid: true, userId: "12", planType: "monthly", eventId: "tx_9" });
  });
});
