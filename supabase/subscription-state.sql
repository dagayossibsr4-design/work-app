-- מקור אמת חדש (ב-Supabase) לסטטוס מנוי/ניסיון, כחלק מהמעבר מהמסד MySQL
-- הישן. להריץ ב-Supabase SQL Editor אחרי production-hardening.sql (משתמש
-- באותה מוסכמת אבטחה: RLS מכריחה, קריאה בלבד למשתמש על השורה של עצמו,
-- וכל כתיבה מתבצעת רק דרך service_role בצד השרת).

create table if not exists public.subscription_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing', 'active', 'expired', 'cancelled')),
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscription_state enable row level security;
alter table public.subscription_state force row level security;

revoke all on public.subscription_state from anon, authenticated;
grant select on public.subscription_state to authenticated;

drop policy if exists "users can read own subscription state" on public.subscription_state;
create policy "users can read own subscription state"
on public.subscription_state for select
to authenticated
using (user_id = auth.uid());

-- אין מדיניות insert/update/delete למשתמש מחובר בכוונה: כתיבה מתבצעת רק
-- דרך ה-service role (webhook תשלומים, לוח בקרה, הענקת ניסיון ראשוני),
-- בדיוק כמו public.user_roles - כדי שמשתמש לא יוכל להעניק לעצמו מנוי.

create or replace function public.set_subscription_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscription_state_updated_at on public.subscription_state;
create trigger subscription_state_updated_at
before update on public.subscription_state
for each row execute function public.set_subscription_state_updated_at();

alter function public.set_subscription_state_updated_at() set search_path = public, pg_temp;
