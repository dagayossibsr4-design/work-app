import { existsSync, statSync } from "node:fs";

import { describe, expect, it } from "vitest";





import { HYP\_PAYMENT\_URL, PAYMENT\_FLOW\_STATUS, PAYMENT\_PROVIDER\_LABEL } from "../lib/payment-config";



describe("payment configuration", () => {

&#x20; it("uses the configured Hyp payment page without exposing card data", () => {

&#x20;   expect(HYP\_PAYMENT\_URL).toMatch(/^https:\\/\\/pay\\.hyp\\.co\\.il\\//);

&#x20;   expect(HYP\_PAYMENT\_URL).not.toMatch(/cardNo|cvv|password/i);

&#x20;   expect(PAYMENT\_PROVIDER\_LABEL).toBe("Hyp");

&#x20; });



&#x20; it("keeps the current link explicitly in manual pending-notify mode", () => {

&#x20;   expect(PAYMENT\_FLOW\_STATUS).toBe("manual\_pending\_notify");

&#x20; });



&#x20; it("ships a non-empty QR image for the configured payment link", () => {

&#x20;   const qrPath = "assets/images/hyp-payment-qr.png";

&#x20;   expect(existsSync(qrPath)).toBe(true);

&#x20;   expect(statSync(qrPath).size).toBeGreaterThan(0);

&#x20; });

});
