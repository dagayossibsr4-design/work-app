# Garmin Connect Developer Program — בקשת גישה

## מטרת המסמך

המסמך הוא תבנית להעתקה לטופס Garmin Connect Developer Program Access Request. יש להחליף את הסוגריים המרובעים בפרטים האמיתיים בלבד. אין להצהיר על משתמשים, הכנסות, חברה או זמינות מוצר אם הם אינם נכונים.

## פרטים שכדאי להכין מראש

| פרט | מה להכין |
|---|---|
| Applicant / Company | השם החוקי שלך או שם החברה, אתר ופרטי קשר |
| Product name | שם האפליקציה באנגלית |
| Product status | Prototype, beta או production — לפי המצב האמיתי |
| Target platform | Android / Expo React Native |
| APIs | Health API ו־Activity API בשלב הראשון |
| Metrics | Sleep, resting heart rate, stress, Body Battery, steps, calories ופעילות |
| Devices | Garmin Venu X1 ומכשירי Garmin Connect תואמים |
| Users | מספר משתמשים צפוי בבטא ובהשקה, בלי לנפח את המספר |
| Privacy | קישור למדיניות פרטיות, מחיקת נתונים ויצירת קשר |
| Technical contact | שם, תפקיד, אימייל וטלפון זמינים |

## נוסח מומלץ לתיאור המוצר

```text
[Product name] is an Android application for real-time workout logging, training-load analysis, and nutrition management. The application helps users record sets, repetitions, weights, exercise history, recovery indicators, and daily nutrition in Hebrew and RTL.

We are requesting Garmin Connect Developer Program access to combine Garmin health and activity data with user-entered workout data. The goal is to provide a more accurate recovery and training-load view, including sleep duration, resting heart rate, stress, Body Battery, and completed activities.

The initial integration will support Garmin Health API and Activity API. We plan to start with a controlled evaluation group and expand only after validating consent, data accuracy, privacy, and synchronization reliability.
```

## נוסח מומלץ למטרת השימוש ב־API

```text
We intend to use the Health API for user-authorized recovery and all-day health metrics, including sleep, resting heart rate, stress, Body Battery, steps, calories, and respiration where available. We intend to use the Activity API to import completed workout activity summaries and compare them with the user's manually recorded training sessions.

We will request only the permissions required for these features. Garmin data will not be sold, used for advertising, or shared with unrelated third parties. Users will be able to view the connection status, disconnect Garmin, and request deletion of synchronized Garmin data.
```

## נוסח מומלץ לאבטחה ופרטיות

```text
OAuth authorization will be completed through Garmin's official authorization page. The Garmin client secret and user access/refresh tokens will never be stored in the Android application or exposed to the client. They will be handled by our server and encrypted at rest using authenticated encryption with key versioning.

The server will associate each Garmin connection with the authenticated application user, validate OAuth state, prevent authorization-code replay, redact secrets from logs, and enforce ownership checks for all synchronized data. We will provide a privacy policy and a user-controlled disconnect and data-deletion flow.
```

## נוסח מומלץ לגבי סביבת בדיקה

```text
We would like to use the evaluation environment to validate the OAuth flow, consent experience, data synchronization, error handling, token refresh, and data deletion before production release.

Our expected initial test group is approximately [number] users and [number] Garmin devices. The primary device for validation is the Garmin Venu X1, while the application is intended to support other compatible Garmin Connect devices where the requested metrics are available.
```

## בקשה קצרה ל־APIs

```text
Requested APIs:
1. Health API — sleep, resting heart rate, stress, Body Battery, steps, calories, respiration, and other approved recovery metrics available for the user's device.
2. Activity API — completed activity summaries and workout-related activity data.

Training API is not required for the initial release because the first version reads Garmin data into the application. We may request Training API separately in a later phase if we decide to publish structured workouts back to Garmin Connect.
```

## נוסח סיום מקצועי

```text
We would appreciate guidance on the appropriate API permissions, OAuth configuration, evaluation-environment setup, rate limits, and any Garmin-specific branding or privacy requirements. Our technical contact is available for an integration call and can provide additional product, security, or data-flow information upon request.
```

## מה לא לכתוב

אין לכתוב שהאפליקציה כבר מחוברת ל־Garmin אם עדיין אין אישור. אין לבקש את כל ה־APIs ללא צורך. אין להציג מספר משתמשים מנופח, ואין להבטיח שמירה או שימוש בנתוני בריאות מעבר למה שהמוצר באמת מבצע. כדאי להימנע מניסוחים כמו “we need all Garmin data” ולהעדיף רשימת metrics מצומצמת ומנומקת.

## סדר פעולות מומלץ

ראשית יש להשלים את פרטי המוצר, איש הקשר, האתר ומדיניות הפרטיות. לאחר מכן יש לבחור Health API ו־Activity API בלבד ולצרף את הנוסחים לעיל. לבסוף יש לבדוק שכל כתובות האתר פעילות, שהאימייל הטכני נגיש ושהמספרים שנמסרו על משתמשים ומכשירים אמיתיים. Garmin מציינת בתיעוד התוכנית שהגישה מיועדת לשימוש עסקי, שהיא מאשרת את סטטוס הבקשה בדרך כלל בתוך שני ימי עסקים, ושאינטגרציה טיפוסית נמשכת בין שבוע לארבעה שבועות לאחר האישור.

## קישורים רשמיים

- [Garmin Connect Developer Program](https://developer.garmin.com/gc-developer-program/)
- [Program FAQ](https://developer.garmin.com/gc-developer-program/program-faq/)
- [Health API](https://developer.garmin.com/gc-developer-program/health-api/)
- [Access Request Form](https://www.garmin.com/en-US/forms/GarminConnectDeveloperAccess/)
- [Garmin Developer Contact](https://www.garmin.com/en-US/forms/developercontactus/)
