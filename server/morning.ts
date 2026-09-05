import { createHmac, timingSafeEqual } from "crypto";
import { ENV } from "./_core/env";

export async function createMorningPaymentForm(params: {
  email: string;
  name: string;
  amount: number;
  description: string;
  userId: string;
  planType: "monthly" | "annual";
}) {
  if (!ENV.morningApiKey || !ENV.morningApiSecret) {
    throw new Error("Morning API keys are not configured in environment variables");
  }

  // 1. הפקת טוקן גישה זמני מול מורנינג
  const authResponse = await fetch("https://api.greeninvoice.co.il/api/v1/account/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: ENV.morningApiKey,
      secret: ENV.morningApiSecret,
    }),
  });

  if (!authResponse.ok) {
    throw new Error("Failed to authenticate with Morning API");
  }

  const authData = (await authResponse.json()) as { token: string };
  const accessToken = authData.token;

  // 2. יצירת דף סליקה מאובטח
  const formResponse = await fetch("https://api.greeninvoice.co.il/api/v1/payments/form", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      description: params.description,
      amount: params.amount,
      currency: "ILS",
      maxPayments: 1,
      client: {
        email: params.email,
        name: params.name,
      },
      successUrl: "https://prolifto.co.il/payment-success",
      failureUrl: "https://prolifto.co.il/subscription",
      customFields: {
        userId: params.userId,
        planType: params.planType,
      },
    }),
  });

  if (!formResponse.ok) {
    const errText = await formResponse.text();
    throw new Error(`Failed to create Morning payment form: ${errText}`);
  }

  const formData = (await formResponse.json()) as { url: string };
  return formData.url;
}

/**
 * Verifies the `X-Data-Signature` header Morning/Green Invoice sends with
 * webhook calls: HMAC-SHA256 of the raw request body, keyed with the account
 * secret. A webhook must never be trusted before this check passes.
 */
export function verifyMorningWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | string[] | undefined,
): boolean {
  if (!ENV.morningWebhookSecret || !signatureHeader || Array.isArray(signatureHeader)) return false;

  const expectedHex = createHmac("sha256", ENV.morningWebhookSecret).update(rawBody).digest("hex");
  const expected = Buffer.from(expectedHex, "utf8");
  const provided = Buffer.from(signatureHeader.trim(), "utf8");
  if (expected.length !== provided.length) return false;

  return timingSafeEqual(expected, provided);
}

export type MorningWebhookOutcome = {
  recognized: boolean;
  paid: boolean;
  userId: string | null;
  planType: "monthly" | "annual" | null;
  eventId: string | null;
};

const PAID_STATUSES = new Set(["paid", "success", "succeeded", "completed", "approved"]);
const FAILED_STATUSES = new Set(["failed", "declined", "cancelled", "canceled", "refunded", "chargeback"]);

/**
 * Morning does not publish a fixed webhook payload schema, so this reads
 * defensively across the field names seen in their docs/support answers
 * (top-level or nested under "data"; "status" or "type"/"event") rather than
 * assuming one exact shape. An unrecognized payload is never treated as paid.
 */
export function parseMorningWebhookPayload(body: unknown): MorningWebhookOutcome {
  const record = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const data = (record.data && typeof record.data === "object" ? record.data : record) as Record<string, unknown>;
  const customFields = (data.customFields && typeof data.customFields === "object"
    ? data.customFields
    : {}) as Record<string, unknown>;

  const rawStatus = String(data.status ?? data.event ?? data.type ?? "").toLowerCase();
  const explicitlyPaid = data.paid === true;
  const explicitlyFailed = data.paid === false;

  const paid = explicitlyPaid || (!explicitlyFailed && PAID_STATUSES.has(rawStatus));
  const recognized = paid || explicitlyFailed || FAILED_STATUSES.has(rawStatus);

  // The checkout link embeds whichever id shape was current when it was
  // created: a legacy MySQL numeric id (stringified), or a Supabase Auth
  // UUID once SUBSCRIPTION_SOURCE=supabase. Either way it round-trips back
  // here as a plain string - the activation step below decides how to use it.
  const userIdRaw = customFields.userId;
  const userId =
    typeof userIdRaw === "number"
      ? String(userIdRaw)
      : typeof userIdRaw === "string" && userIdRaw.length > 0
        ? userIdRaw
        : null;

  const planTypeRaw = customFields.planType;
  const planType = planTypeRaw === "monthly" || planTypeRaw === "annual" ? planTypeRaw : null;

  const eventIdRaw = data.id ?? data.transactionId ?? data.paymentId ?? record.id;
  const eventId = typeof eventIdRaw === "string" || typeof eventIdRaw === "number" ? String(eventIdRaw) : null;

  return { recognized, paid, userId, planType, eventId };
}