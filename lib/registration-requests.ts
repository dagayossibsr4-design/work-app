import type { SupabaseClient } from "@supabase/supabase-js";

export type RegistrationRequestInput = {
  email: string;
  planId: "monthly" | "annual";
  amountIls: number;
};

export type RegistrationRequest = {
  id: string;
  email: string;
  plan_id: string;
  amount_ils: number;
  status: "awaiting_payment" | "payment_review" | "approved" | "rejected";
  created_at: string;
};

function createRequestId(): string {
  const runtimeUuid = globalThis.crypto?.randomUUID?.();
  if (runtimeUuid) return runtimeUuid;
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export async function createRegistrationRequest(
  client: SupabaseClient | null,
  input: RegistrationRequestInput,
): Promise<{ request: RegistrationRequest | null; error: string | null }> {
  if (!client) return { request: null, error: "Supabase אינו מוגדר כרגע." };
  const id = createRequestId();
  const email = input.email.trim().toLowerCase();
  const { error } = await client
    .from("registration_requests")
    .insert({ id, email, plan_id: input.planId, amount_ils: input.amountIls });
  if (error) return { request: null, error: error.message };
  return {
    request: { id, email, plan_id: input.planId, amount_ils: input.amountIls, status: "awaiting_payment", created_at: new Date().toISOString() },
    error: null,
  };
}

export const REGISTRATION_STATUS_LABELS: Record<RegistrationRequest["status"], string> = {
  awaiting_payment: "ממתין לתשלום",
  payment_review: "התשלום בבדיקה",
  approved: "אושר ליצירת חשבון",
  rejected: "נדחה",
};
