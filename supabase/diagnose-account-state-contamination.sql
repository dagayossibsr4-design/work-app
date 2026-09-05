-- אבחון בלבד - לא מוחק ולא משנה שום דבר. להריץ ב-Supabase SQL Editor.
--
-- מטרה: מכיוון שרוב המשתמשים הרשומים הם חברים שמנסים את האפליקציה במכשיר/
-- דפדפן שלהם (לא דרך הדפדפן של dagayossi), אסור למחוק את כולם בעיוורון -
-- מי שנרשם במכשיר שלו מעולם לא נחשף לבאג הדליפה. השאילתה הזו משווה את
-- הנתונים של כל משתמש מול הנתונים של dagayossi (האדמין) ומסמנת רק את
-- מי שהנתונים שלו זהים ל-100% לנתוני האדמין - סימן כמעט ודאי שהם הועתקו
-- על ידי הבאג, ולא נתונים אמיתיים שהמשתמש הזין בעצמו (שני משתמשים שונים
-- לא מייצרים בטעות מערך sessions/personalPrograms זהה ל-100%).

with admin_account as (
  select id from auth.users where email = 'dagayossi@gmail.com'
),
admin_state as (
  select payload from public.account_state, admin_account where account_id = admin_account.id
)
select
  u.email,
  s.account_id,
  s.updated_at,
  jsonb_array_length(coalesce(s.payload->'sessions', '[]'::jsonb)) as session_count,
  jsonb_array_length(coalesce(s.payload->'personalPrograms', '[]'::jsonb)) as personal_program_count,
  jsonb_array_length(coalesce(s.payload->'templates', '[]'::jsonb)) as template_count,
  (s.payload->'sessions' = (select payload->'sessions' from admin_state)) as sessions_identical_to_admin,
  (s.payload->'personalPrograms' = (select payload->'personalPrograms' from admin_state)) as personal_programs_identical_to_admin,
  (s.payload->'templates' = (select payload->'templates' from admin_state)) as templates_identical_to_admin
from public.account_state s
join auth.users u on u.id = s.account_id
where s.account_id != (select id from admin_account)
order by s.updated_at desc;

-- קריאת התוצאה:
--   * session_count/personal_program_count = 0 ואין התאמה -> משתמש שעדיין
--     לא הזין כלום. אין מה לנקות (כבר נקי).
--   * sessions_identical_to_admin / personal_programs_identical_to_admin /
--     templates_identical_to_admin = true -> כמעט בוודאות זוהם על ידי הבאג
--     (זהות מלאה למערך של dagayossi אינה קורית באקראי). מועמד לאיפוס.
--   * יש לו session_count/personal_program_count אמיתיים אבל שונים
--     מהאדמין (כמו אלירן, שיש לו ניסיון פעיל אמיתי) -> נתונים אמיתיים
--     שלו - אסור לגעת, בלי קשר לתוצאה של השאילתה הזו.
