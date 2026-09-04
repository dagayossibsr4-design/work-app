import { ENV } from "./_core/env";

export async function createMorningPaymentForm(params: {
  email: string;
  name: string;
  amount: number;
  description: string;
  userId: number;
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