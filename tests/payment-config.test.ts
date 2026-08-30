import { existsSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";


import { HYP_PAYMENT_URL, PAYMENT_FLOW_STATUS, PAYMENT_PROVIDER_LABEL } from "../lib/payment-config";

describe("payment configuration", () => {
  it("uses the configured Hyp payment page without exposing card data", () => {
    expect(HYP_PAYMENT_URL).toMatch(/^https:\/\/pay\.hyp\.co\.il\//);
    expect(HYP_PAYMENT_URL).not.toMatch(/cardNo|cvv|password/i);
    expect(PAYMENT_PROVIDER_LABEL).toBe("Hyp");
  });

  it("keeps the current link explicitly in manual pending-notify mode", () => {
    expect(PAYMENT_FLOW_STATUS).toBe("manual_pending_notify");
  });

  it("ships a non-empty QR image for the configured payment link", () => {
    const qrPath = "assets/images/hyp-payment-qr.png";
    expect(existsSync(qrPath)).toBe(true);
    expect(statSync(qrPath).size).toBeGreaterThan(0);
  });
});
