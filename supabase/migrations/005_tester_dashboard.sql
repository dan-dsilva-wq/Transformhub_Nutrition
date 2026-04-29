-- Tester roster + activity events to make beta testing visible in Supabase.
-- We can't easily query auth.users from a view (different schema, RLS-locked),
-- so we mirror the bits we care about into public.testers via a trigger and
-- record interesting actions in public.tester_events. A summary view ties it
-- all together so the dashboard's table editor is the only place I need to look.

-- 1. Tester roster (1:1 with auth.users)
create table if not exists public.testers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  signed_up_at timestamptz not null default now(),
  last_seen_at timestamptz,
  onboarding_completed_at timestamptz,
  app_version text,
  user_agent text
);

create index if not exists testers_signed_up_at_idx on public.testers (signed_up_at desc);
create index if not exists testers_last_seen_at_idx on public.testers (last_seen_at desc);

-- 2. Auto-populate on auth.users insert (covers Play Store + web sign-ups)
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.testers (id, email, signed_up_at)
  values (new.id, new.email, coalesce(new.created_at, now()))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- 3. Backfill anyone who signed up before this migration ran
insert into public.testers (id, email, signed_up_at)
select id, email, created_at from auth.users
on conflict (id) do nothing;

-- 4. Activity events
create table if not exists public.tester_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  payload jsonb,
  app_version text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists tester_events_user_idx
  on public.tester_events (user_id, created_at desc);
create index if not exists tester_events_type_idx
  on public.tester_events (event_type, created_at desc);

-- 5. RLS — testers can read their own row and their own events. Writes go
-- through the service-role API route, so no INSERT policies are needed.
alter table public.testers enable row level security;
alter table public.tester_events enable row level security;

drop policy if exists "tester sees own row" on public.testers;
create policy "tester sees own row" on public.testers
  for select using (auth.uid() = id);

drop policy if exists "tester sees own events" on public.tester_events;
create policy "tester sees own events" on public.tester_events
  for select using (auth.uid() = user_id);

-- 6. Summary view — one row per tester, with counts of the things they've
-- done. Read this from the Supabase Table editor (it lives under "Views").
create or replace view public.tester_overview as
select
  t.id,
  t.email,
  t.signed_up_at,
  t.last_seen_at,
  t.onboarding_completed_at,
  coalesce((
    select count(*) from public.tester_events e
    where e.user_id = t.id and e.event_type = 'meal_logged'
  ), 0) as meals_logged,
  coalesce((
    select count(*) from public.tester_events e
    where e.user_id = t.id and e.event_type = 'weight_logged'
  ), 0) as weights_logged,
  coalesce((
    select count(*) from public.tester_events e
    where e.user_id = t.id and e.event_type = 'week_generated'
  ), 0) as weeks_generated,
  coalesce((
    select count(*) from public.tester_events e
    where e.user_id = t.id and e.event_type = 'app_open'
  ), 0) as opens,
  coalesce((
    select count(*) from public.tester_reviews r
    where r.user_id = t.id
  ), 0) as reviews_submitted,
  (
    select max(e.created_at) from public.tester_events e
    where e.user_id = t.id
  ) as last_event_at,
  (
    select array_agg(distinct e.event_type) from public.tester_events e
    where e.user_id = t.id
  ) as event_types
from public.testers t
order by t.signed_up_at desc;
