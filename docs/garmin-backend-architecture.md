# ארכיטקטורת backend מאובטחת ל־Garmin OAuth 2.0

## מטרת התכנון

המטרה היא לאפשר למשתמש לחבר חשבון Garmin Connect לאפליקציית האימון, לקבל נתוני אימון, שינה והתאוששות, ולשלב אותם בניתוח העומס. Garmin Connect Developer Program מספקת APIs ענניים לנתוני Health ו־Activity, וכל ה־APIs בתוכנית משתמשים ב־OAuth 2.0. השעון מסתנכרן תחילה עם Garmin Connect, ולאחר מכן השרת ניגש לנתונים המאושרים. [1] [2]

הארכיטקטורה המומלצת היא **שרת־מתווך**: אפליקציית Android לעולם אינה מקבלת את Client Secret, אינה מחליפה authorization code בטוקן ואינה פונה ישירות ל־Garmin עם סודות. היא פותחת סשן הרשאה מאובטח ומקבלת מהשרת רק את מצב החיבור והנתונים המעובדים.

## גבולות האינטגרציה

בשלב הראשון יש לשלב את Health API ואת Activity API. Health API מתאים לשינה, דופק, Stress, Body Battery, צעדים, קלוריות ונשימה; Activity API מתאים לפרטי אימונים. Training API יתווסף רק אם בעתיד נרצה לשלוח תוכניות או אימונים בחזרה ל־Garmin Connect. Garmin מציינת שניתן להשתמש בכמה APIs באותה אפליקציה, אך נדרש אישור לתוכנית המפתחים. [1] [2]

| רכיב | אחריות |
|---|---|
| אפליקציית Expo/Android | הצגת חיבור, פתיחת authorization, הצגת סטטוס, הפעלת סנכרון וניתוק |
| שרת Express/tRPC | יצירת authorization URL, אימות callback, החלפת code בטוקנים, רענון, שליפת Garmin וסינון נתונים |
| מסד הנתונים | משתמשים, חיבורי Garmin, הרשאות, ריצות סנכרון, נתוני Health ו־Activity, audit log |
| מנהל מפתחות | שמירת מפתח הצפנה מחוץ למסד הנתונים ורוטציה מבוקרת |
| Garmin Connect | מקור הנתונים לאחר שהמשתמש נתן consent וסנכרן את השעון |

## סכמת מסד הנתונים המוצעת

הסכמה מתאימה ל־MySQL ול־Drizzle הקיימים בפרויקט. מפתחות זרים צריכים להפנות ל־`users.id`, וכל הטבלאות עם נתוני משתמש צריכות לכלול `userId` או להיות נגישות רק דרך קשר לחיבור של משתמש.

### `garmin_connections`

טבלה זו מייצגת חיבור Garmin אחד למשתמש. אין לשמור כאן את הטוקנים עצמם.

| שדה | סוג מומלץ | הערה |
|---|---|---|
| `id` | `int` PK | מזהה פנימי |
| `userId` | `int` FK | בעל החיבור |
| `provider` | `varchar(32)` | ערך קבוע `garmin` |
| `garminUserIdHash` | `char(64)` nullable | HMAC של מזהה Garmin לצורך deduplication בלי לשמור מזהה גולמי |
| `status` | enum | `pending`, `active`, `expired`, `revoked`, `error` |
| `scopes` | `json` או `text` | הרשאות שאושרו בפועל |
| `connectedAt` | timestamp | מועד החיבור הראשון |
| `lastSyncAt` | timestamp nullable | סנכרון מוצלח אחרון |
| `lastErrorCode` | varchar nullable | קוד פנימי שאינו מכיל token או response מלא |
| `lastErrorAt` | timestamp nullable | מועד שגיאה אחרון |
| `revokedAt` | timestamp nullable | מועד ניתוק או ביטול |
| `createdAt`, `updatedAt` | timestamp | audit בסיסי |

יש להוסיף unique composite index על `(userId, provider)` כדי למנוע חיבורי Garmin כפולים לאותו משתמש. אם Garmin מאפשרת חשבון חיצוני יחיד לכל משתמש, ניתן להוסיף גם unique על `garminUserIdHash`.

### `garmin_credentials`

טבלה נפרדת, עם הרשאות גישה מצומצמות, עבור החומר הסודי. כל עמודת token נשמרת רק כ־ciphertext.

| שדה | סוג מומלץ | הערה |
|---|---|---|
| `connectionId` | `int` PK/FK | קשר אחד־לאחד לחיבור |
| `accessTokenCiphertext` | `text` | ערך מוצפן AEAD |
| `refreshTokenCiphertext` | `text` nullable | ערך מוצפן AEAD, אם Garmin מחזירה refresh token |
| `accessTokenExpiresAt` | timestamp nullable | תאריך תפוגה |
| `refreshTokenExpiresAt` | timestamp nullable | אם נמסר |
| `keyVersion` | varchar(32) | גרסת מפתח ההצפנה ששימשה להצפנה |
| `tokenFingerprint` | char(64) | HMAC לצורכי איתור כפילות/איתור אירוע, אינו מאפשר שחזור token |
| `rotatedAt` | timestamp | מועד החלפת credentials אחרון |
| `createdAt`, `updatedAt` | timestamp | audit טכני |

אין לשמור access token או refresh token ב־logs, ב־analytics, ב־client response, ב־AsyncStorage או בשדה plaintext במסד הנתונים.

### `garmin_oauth_states`

טבלה קצרה־חיים עבור מניעת CSRF וקשירת callback לסשן שהתחיל במכשיר.

| שדה | סוג מומלץ | הערה |
|---|---|---|
| `id` | `bigint` PK | מזהה פנימי |
| `userId` | `int` FK | המשתמש שהתחיל חיבור |
| `stateHash` | `char(64)` unique | HMAC של state חד־פעמי |
| `codeVerifierCiphertext` | `text` | PKCE verifier מוצפן, אם משתמשים ב־PKCE |
| `returnUri` | varchar | יעד חזרה מאושר מראש בלבד |
| `expiresAt` | timestamp | תפוגה קצרה, למשל 10 דקות |
| `consumedAt` | timestamp nullable | מונע שימוש חוזר |
| `createdAt` | timestamp | audit |

ה־state עצמו נוצר אקראית, נשלח ל־Garmin, ונשמר רק כ־hash. ה־callback חייב לבצע lookup לפי hash, לוודא שלא פג תוקף ושלא נעשה שימוש קודם, ואז לסמן אותו כ־consumed בתוך transaction.

### `garmin_sync_runs`

טבלת בקרה לכל ניסיון סנכרון.

| שדה | סוג מומלץ | הערה |
|---|---|---|
| `id` | bigint PK | מזהה ריצה |
| `connectionId` | int FK | החיבור שסונכרן |
| `requestedBy` | enum | `user`, `scheduled`, `retry` |
| `status` | enum | `queued`, `running`, `success`, `partial`, `failed` |
| `windowStart`, `windowEnd` | timestamp | חלון הנתונים |
| `recordsRead`, `recordsWritten` | int | מדדי תוצאה |
| `cursor` | varchar nullable | cursor או marker אם ה־API מספק |
| `errorCode` | varchar nullable | קוד פנימי בלבד |
| `startedAt`, `finishedAt` | timestamp nullable | זמני ביצוע |
| `createdAt` | timestamp | audit |

יש להוסיף unique key ל־`(connectionId, sourceType, sourceExternalId)` בטבלאות הנתונים כדי לאפשר retry ללא שכפול.

### טבלאות נתוני Health ו־Activity

מומלץ להתחיל בטבלאות מנורמלות־למחצה עם שדות מדדים עיקריים ו־`rawPayloadCiphertext` אופציונלי לזמן קצר בלבד. אין לשמור raw payload לצמיתות אם אין צורך עסקי.

`garmin_daily_health` תכיל `connectionId`, `metricDate`, `sleepSeconds`, `restingHeartRate`, `stressScore`, `bodyBattery`, `steps`, `calories`, `respiration`, `sourceUpdatedAt` ו־`sourceExternalId`. `garmin_activities` תכיל `connectionId`, `sourceActivityId`, `activityType`, `startedAt`, `durationSeconds`, `distanceMeters`, `calories`, `averageHeartRate`, `maxHeartRate`, `trainingLoad` ו־`sourceUpdatedAt`.

נתוני שינה והתאוששות צריכים להיות ניתנים למחיקה לפי משתמש ולפי טווח תאריכים. אין להסתמך רק על מחיקת החיבור, משום שייתכן שהאפליקציה שמרה נתונים היסטוריים לצורך הגרפים.

### `garmin_audit_events`

טבלה זו שומרת אירועים ללא סודות: `userId`, `connectionId`, `eventType`, `requestId`, `ipHash` אופציונלי, `metadataJson` מצומצם ו־`createdAt`. אירועים לדוגמה הם `oauth_started`, `oauth_succeeded`, `oauth_failed`, `token_refreshed`, `sync_started`, `sync_failed`, `connection_revoked` ו־`data_deleted`.

## הצפנת הטוקנים

ההמלצה היא להשתמש בהצפנה סימטרית מודרנית מסוג **AES-256-GCM** או **ChaCha20-Poly1305**, עם nonce אקראי חדש לכל הצפנה ועם authenticated data הכולל לפחות `garmin`, `connectionId`, שם השדה וגרסת המפתח. פורמט אחסון אפשרי הוא:

```text
v1:kms-key-alias:base64(nonce):base64(ciphertext):base64(authTag)
```

ב־Node.js ניתן לממש זאת באמצעות `node:crypto` עם `aes-256-gcm`, אך מפתח ההצפנה הראשי לא יישמר במסד הנתונים ולא בקוד. בתחילת הדרך ניתן להזריק `GARMIN_TOKEN_ENCRYPTION_KEY` כ־secret של סביבת השרת, בתנאי שהוא באורך 32 bytes אקראיים לפחות ונפרד מ־`JWT_SECRET`. עבור Production עדיף להשתמש ב־KMS/Secret Manager, כאשר השרת מקבל הרשאה לפענח או לקבל מפתח data-encryption בלבד.

הפרדת שכבות מומלצת היא envelope encryption. מפתח ראשי מנוהל על ידי KMS, ומפתח נתונים ייעודי מוצפן באמצעותו. הטוקנים מוצפנים עם מפתח הנתונים. בעת רוטציה, מפענחים רק בעת הצורך ומצפינים מחדש תחת `keyVersion` חדש; לא משנים את כל השורות בצורה לא מבוקרת.

השרת צריך לכלול מודול יחיד, למשל `server/integrations/garmin/token-vault.ts`, שמייצא רק `encryptToken`, `decryptToken`, `fingerprintToken` ו־`rotateEncryptedToken`. קוד routers, sync ו־database לא יקרא ישירות ל־`process.env` ולא יממש הצפנה מחדש.

## זרימת OAuth

### התחלת חיבור

הלקוח קורא ל־`garmin.beginConnection`. השרת יוצר state אקראי, code verifier אם Garmin מאפשרת PKCE בתצורה שאושרה, שומר hash של state ו־verifier מוצפן, ומחזיר לאפליקציה authorization URL שנבנה מהערכים שאושרו ב־Garmin Portal. יש להגביל את `returnUri` לרשימת ערכים קבועה מראש כדי למנוע open redirect.

האפליקציה פותחת את ה־URL באמצעות browser authentication session. אין להעביר client secret לאפליקציה.

### Callback

ה־callback הוא endpoint HTTP ציבורי ייעודי, למשל `GET /api/integrations/garmin/callback`. הוא אינו צריך להיות mutation רגיל של tRPC, משום ש־Garmin מפנה אליו ישירות. השרת בודק שגיאת authorization, מאמת state, בודק תפוגה ושימוש קודם, ומחליף את ה־authorization code מול Garmin באמצעות client credentials שבשרת.

לאחר הצלחה, השרת שומר את `garmin_connections` ואת `garmin_credentials` בתוך transaction. אם נשמר חיבור קודם, יש לבצע update idempotent ולא ליצור שורה נוספת. השרת מפנה את הדפדפן ל־deep link קבוע של האפליקציה עם `status=success` ו־connection reference לא רגיש בלבד. אין לשים token ב־URL.

### רענון token

לפני כל קריאת Garmin, adapter בודק אם access token עומד לפוג בתוך חלון בטיחות, למשל חמש דקות. אם כן, הוא משתמש ב־refresh token, שומר את הטוקנים החדשים בתוך transaction ומעדכן `keyVersion`, תאריכי תפוגה ו־`rotatedAt`.

יש למנוע race condition: אם שתי בקשות רענון מתרחשות במקביל, משתמשים ב־row lock קצר, advisory lock או מנגנון compare-and-swap. במקרה של `invalid_grant` או תגובת revoke, מסמנים את החיבור כ־`expired` או `revoked`, מוחקים את ה־credentials המוצפנים ומציגים למשתמש «נדרש חיבור מחדש».

### ניתוק ומחיקה

`garmin.disconnect` צריך לבטל הרשאה מול Garmin אם קיים endpoint מתאים במסמכי הפורטל, למחוק את שורת credentials, לסמן connection כ־revoked ולרשום audit event. בנוסף, יש להציע מחיקת נתוני Garmin ההיסטוריים. מחיקת נתונים צריכה להתבצע ב־transaction או בתהליך מחיקה מדורג עם audit, ולא להסתפק בהסתרתם מה־UI.

## API פנימי מוצע

| Endpoint / procedure | סוג | תפקיד |
|---|---|---|
| `garmin.beginConnection` | protected query/mutation | יצירת authorization URL ו־state |
| `GET /api/integrations/garmin/callback` | public callback | אימות code והשלמת חיבור |
| `garmin.getStatus` | protected query | מצב חיבור, הרשאות, sync אחרון ושגיאה ידידותית |
| `garmin.syncNow` | protected mutation | יצירת sync run והפעלת adapter |
| `garmin.disconnect` | protected mutation | ביטול חיבור ומחיקת credentials |
| `garmin.deleteData` | protected mutation | מחיקת נתוני Garmin לפי משתמש/טווח |
| `garmin.retrySync` | protected mutation | ניסיון חוזר רק לריצה שנכשלה |

כל procedure חייב להסתמך על `ctx.user.id` ולא לקבל `userId` מהלקוח. לכל query של נתוני Garmin יש להוסיף תנאי ownership על `userId` דרך `garmin_connections`.

## סנכרון ו־idempotency

Garmin מציינת שהנתונים זמינים לאחר שהמכשיר מסתנכרן עם Garmin Connect. לכן כפתור «סנכרן עכשיו» צריך לבצע pull מהשרת, לא לנסות להתחבר ישירות לשעון. יש להציג למשתמש מצב «השעון טרם העלה נתונים ל־Garmin Connect» כאשר אין רשומות חדשות. [3]

כל ריצה תקבל `syncRunId`. ה־adapter ישמור את חלון הזמן ואת cursor אם ה־API מספק אותו. כתיבת נתונים תשתמש ב־upsert לפי מזהה מקור ויום מדידה. Retry אחרי timeout לא ייצור אימונים או ימי שינה כפולים. יש להגביל concurrency לחיבור יחיד, להוסיף backoff לשגיאות זמניות, ולהבדיל בין שגיאת הרשאה, rate limit, נתונים חסרים ושגיאת שרת.

בשלב ראשון עדיף סנכרון יזום על ידי המשתמש. רק לאחר אימות שה־API והתוכנית המאושרת תומכים במנגנון מתאים, ניתן להוסיף job תקופתי. אין להניח שקיים webhook ללא אישור מפורש במסמכי Garmin שניתנו לחשבון.

## מודל אבטחה ואיומים

| איום | הגנה |
|---|---|
| דליפת Client Secret | שמירה ב־server secrets בלבד; אין bundle או response |
| דליפת access token | AEAD, logs redaction, הרשאות DB נפרדות, TTL ו־rotation |
| CSRF ב־callback | state חד־פעמי, hash, expiry ו־consumed flag |
| authorization code replay | state חד־פעמי, PKCE אם נתמך, callback חד־פעמי |
| open redirect | return URI מתוך allowlist בלבד |
| כפילות בסנכרון | unique source IDs ו־upsert |
| גישה של משתמש לנתוני אחר | protected procedures ו־ownership predicates |
| חשיפת מידע רפואי | מינימום scopes, הצפנת נתונים רגישים, retention ומחיקה |
| רענון מקביל | lock או compare-and-swap על credentials |
| שגיאה חושפת סודות | error mapping פנימי והודעות כלליות למשתמש |

## משתני סביבה

המשתנים הבאים צריכים לעבור דרך מנגנון secrets של הפרויקט ולא להיכתב בקוד:

```text
GARMIN_CLIENT_ID
GARMIN_CLIENT_SECRET
GARMIN_AUTHORIZATION_URL
GARMIN_TOKEN_URL
GARMIN_API_BASE_URL
GARMIN_REDIRECT_URI
GARMIN_SCOPES
GARMIN_TOKEN_ENCRYPTION_KEY או KMS configuration
GARMIN_KEY_VERSION
GARMIN_ENABLED=false/true
```

ב־development אפשר להשתמש בסביבת evaluation של Garmin, אך ה־redirect URI, credentials, בסיס הנתונים ומפתח ההצפנה צריכים להיות מופרדים מ־Production. אין להעתיק token אמיתי מסביבת Production לסביבת development.

## סדר מימוש מומלץ

תחילה להוסיף את הטבלאות ואת מודול ההצפנה, עם בדיקות יחידה ל־encrypt/decrypt, nonce שונה בכל הצפנה, failure כאשר ciphertext שונה ו־key rotation. לאחר מכן להוסיף OAuth state ו־callback ללא סנכרון נתונים. בשלב הבא להוסיף status, disconnect ו־refresh. רק לאחר שהחיבור יציב יש להוסיף sync run, Health API ו־Activity API. לבסוף לשלב את נתוני השינה וההתאוששות בניתוח העומס ולבצע בדיקות פרטיות ומחיקה.

## החלטות שדורשות אישור Garmin לפני קידוד סופי

ה־Portal וה־onboarding של Garmin צריכים להיות המקור הסופי לשמות ה־authorization endpoint, token endpoint, scopes, צורת ה־refresh, מגבלות rate limit, מדיניות retention ואפשרות revoke. הדף הציבורי של Garmin מאשר OAuth 2.0, Health API, Activity API וסביבת evaluation לאחר אישור, אך אינו מציג את כל פרטי ה־tenant וה־scopes הספציפיים. [1] [2] [3]

### מקורות

[1]: https://developer.garmin.com/gc-developer-program/overview/ — Garmin Connect Developer Program, Overview  
[2]: https://developer.garmin.com/gc-developer-program/program-faq/ — Garmin Connect Developer Program, Program FAQ  
[3]: https://developer.garmin.com/gc-developer-program/health-api/ — Garmin Health API  
[4]: https://www.garmin.com/en-US/forms/GarminConnectDeveloperAccess/ — Garmin Connect Developer Program Access Request Form
