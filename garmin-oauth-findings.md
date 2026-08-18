# Garmin OAuth research findings

## Official overview
Source: https://developer.garmin.com/gc-developer-program/overview/
- Garmin Connect Developer Program provides cloud-to-cloud APIs.
- Data APIs: Health API, Activity API, Women's Health API.
- Partner-to-device APIs: Training API and Courses API.
- Garmin explicitly distinguishes cloud-to-cloud APIs from direct real-time mobile-to-device integration; direct integration is covered by Garmin Health SDKs.

## Official Health API
Source: https://developer.garmin.com/gc-developer-program/health-api/
- Health API returns JSON summaries of data uploaded to Garmin Connect from supported devices.
- Data listed includes steps, heart rate, sleep, calories, respiration, body composition, stress, pulse-ox, and epoch summaries for all-day activities.
- Users first provide consent, then sync their device with Garmin Connect; data becomes accessible through the API.
- Garmin states that after approval, an evaluation environment is available for testing.

## Implication for this app
- The planned workout tracker should use Garmin Connect cloud-to-cloud integration for sleep/recovery/health sync, not assume a direct Bluetooth connection to Venu X1.
- The developer must obtain Garmin program approval before production integration and testing against the evaluation environment.
- Exact OAuth endpoint names, redirect URI fields, scopes, and token behavior must be confirmed from Garmin's approved developer documentation or the credentials/onboarding materials, not inferred from third-party examples.

Collected: 2026-08-16

## Official Program FAQ
Source: https://developer.garmin.com/gc-developer-program/program-faq/
- The program is for enterprise/business use.
- Applicant requests access; Garmin reviews the application.
- Garmin says it confirms application status within two business days; if approved, the applicant receives access to the Developer Portal and an integration call.
- Garmin describes a typical integration as taking 1–4 weeks.
- All APIs in the Developer Program use OAuth 2.0.
- Multiple APIs may be used in one application.
- There are no licensing or maintenance fees for access, but some metrics may require a license fee or minimum device order quantity for commercial use.

## Access request page
Source: https://www.garmin.com/en-US/forms/GarminConnectDeveloperAccess/
- Official access-request page exists, but the public extraction currently renders only the page title and a "Stay tuned" message; the actual form fields were not exposed in the fetched page.
- Do not invent exact field names. Prepare business/product description, intended APIs/metrics, expected users/devices, contact details, and privacy/security information for the request.
