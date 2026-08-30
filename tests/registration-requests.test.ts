import { describe, expect, it } from "vitest";

import { REGISTRATION_STATUS_LABELS } from "../lib/registration-requests";

describe("registration requests", () => {
  it("exposes the manual approval lifecycle in Hebrew", () => {
    expect(REGISTRATION_STATUS_LABELS.awaiting_payment).toBe("ממתין לתשלום");
    expect(REGISTRATION_STATUS_LABELS.payment_review).toBe("התשלום בבדיקה");
    expect(REGISTRATION_STATUS_LABELS.approved).toBe("אושר ליצירת חשבון");
    expect(REGISTRATION_STATUS_LABELS.rejected).toBe("נדחה");
  });
});
