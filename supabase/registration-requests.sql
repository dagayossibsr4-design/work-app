-- בקשות הרשמה לפני יצירת משתמש ב־Supabase.
-- להריץ ב־Supabase SQL Editor בלבד.

create table if not exists public.registration_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null check (length(trim(email)) between 5 and 320),
  plan_id text not null check (plan_id in ('monthly', 'annual')),
  amount_ils integer not null check (amount_ils > 0),
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'payment_review', 'approved', 'rejected')),
  payment_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

create index if not exists registration_requests_status_created_idx
  on public.registration_requests(status, created_at desc);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  registration_request_id uuid references public.registration_requests(id) on delete set null,
  plan_id text not null check (plan_id in ('monthly', 'annual')),
  amount_ils integer not null check (amount_ils > 0),
  status text not null default 'active'
    check (status in ('active', 'past_due', 'cancelled', 'expired')),
  current_period_end timestamptz,
  provider text not null default 'hyp',
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_one_active_per_user_idx
  on public.subscriptions(user_id)
  where status = 'active';

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'hyp',
  provider_event_id text not null,
  registration_request_id uuid references public.registration_requests(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(provider, provider_event_id)
);

alter table public.registration_requests enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_events enable row level security;

-- משתמש לא מחובר רשאי רק לפתוח בקשת הרשמה במצב awaiting_payment.
drop policy if exists "public can create awaiting registration" on public.registration_requests;
create policy "public can create awaiting registration"
on public.registration_requests for insert
to anon, authenticated
with check (
  status = 'awaiting_payment'
  and reviewed_at is null
  and reviewed_by is null
);

-- רק מנהל קורא ומעדכן בקשות. אין חשיפה של בקשות למשתמש רגיל.
drop policy if exists "admins can read registration requests" on public.registration_requests;
create policy "admins can read registration requests"
on public.registration_requests for select
to authenticated
using (public.is_admin());

drop policy if exists "admins can update registration requests" on public.registration_requests;
create policy "admins can update registration requests"
on public.registration_requests for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- מנויים: המשתמש קורא רק את שלו, ומנהל קורא ומעדכן הכול.
drop policy if exists "users can read own subscriptions" on public.subscriptions;
create policy "users can read own subscriptions"
on public.subscriptions for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "admins can manage subscriptions" on public.subscriptions;
create policy "admins can manage subscriptions"
on public.subscriptions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- אירועי תשלום אינם נקראים מהלקוח; Webhook server-side ישתמש ב־service role.
drop policy if exists "admins can read payment events" on public.payment_events;
create policy "admins can read payment events"
on public.payment_events for select
to authenticated
using (public.is_admin());

create or replace function public.set_registration_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists registration_requests_updated_at on public.registration_requests;
create trigger registration_requests_updated_at
before update on public.registration_requests
for each row execute function public.set_registration_requests_updated_at();
