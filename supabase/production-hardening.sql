-- הקשחת אבטחה כללית ל-Supabase לפני עלייה לפרודקשן.
-- להריץ ב-Supabase SQL Editor לפני supabase/registration-requests.sql
-- (הקובץ ההוא משתמש בפונקציה public.is_admin() המוגדרת כאן).
--
-- מכסה שתי טבלאות שכבר בשימוש בפועל מהאפליקציה ללא הגנת RLS:
--   * public.user_roles   - תפקידי משתמשים (admin/user), נקרא מ-lib/admin-role.ts
--   * public.account_state - גיבוי ענן פרטי למשתמש, נקרא/נכתב מ-components/account-sync.tsx

-- ---------------------------------------------------------------------------
-- 1. user_roles: מקור האמת להרשאות admin. חובה RLS הדוקה כדי שמשתמש לא יוכל
--    להעניק לעצמו הרשאת admin או לקרוא תפקידים של אחרים.
-- ---------------------------------------------------------------------------
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;

-- אין הרשאות ברירת מחדל בכלל; רק המדיניות המפורשת למטה פותחת גישה.
revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;

-- כל משתמש מחובר רשאי לקרוא רק את השורה של עצמו (בדיקת "האם אני admin?").
drop policy if exists "users can read own role" on public.user_roles;
create policy "users can read own role"
on public.user_roles for select
to authenticated
using (user_id = auth.uid());

-- אין למשתמש רגיל שום הרשאת insert/update/delete על הטבלה הזו: שינוי
-- תפקידים מתבצע רק דרך service_role (Supabase Dashboard / סקריפט שרת),
-- כדי למנוע הסלמת הרשאות עצמית (privilege escalation).

create or replace function public.set_user_roles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_roles_updated_at on public.user_roles;
create trigger user_roles_updated_at
before update on public.user_roles
for each row execute function public.set_user_roles_updated_at();

-- ---------------------------------------------------------------------------
-- 2. is_admin(): פונקציה אחת ומרכזית שכל שאר המדיניות (וקובץ
--    registration-requests.sql) מסתמכים עליה. SECURITY DEFINER + search_path
--    קבוע כדי למנוע התקפת "search path hijacking".
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. account_state: גיבוי ענן פרטי לכל משתמש (אימונים/תזונה/הגדרות).
--    חייב להיות נעול לחלוטין לבעלים של השורה בלבד.
-- ---------------------------------------------------------------------------
create table if not exists public.account_state (
  account_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.account_state enable row level security;
alter table public.account_state force row level security;

revoke all on public.account_state from anon, authenticated;
grant select, insert, update, delete on public.account_state to authenticated;

drop policy if exists "users manage only their own account state" on public.account_state;
create policy "users manage only their own account state"
on public.account_state for all
to authenticated
using (account_id = auth.uid())
with check (account_id = auth.uid());

create or replace function public.set_account_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists account_state_updated_at on public.account_state;
create trigger account_state_updated_at
before update on public.account_state
for each row execute function public.set_account_state_updated_at();

-- ---------------------------------------------------------------------------
-- 4. הקשחות כלליות לכל הפונקציות SECURITY DEFINER הקיימות כדי למנוע
--    "search path hijacking" (CVE-class ידועה בפונקציות PL/pgSQL/SQL).
-- ---------------------------------------------------------------------------
alter function public.set_user_roles_updated_at() set search_path = public, pg_temp;
alter function public.set_account_state_updated_at() set search_path = public, pg_temp;
