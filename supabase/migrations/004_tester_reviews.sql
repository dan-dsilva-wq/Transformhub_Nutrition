-- Daily tester reviews collected from beta testers at the start of each day.
-- Inserted via the /api/tester-review route using the service-role client, so
-- RLS does not need an INSERT policy. We expose a tight SELECT policy so users
-- can see their own history if we ever surface it; admins read in the Supabase
-- dashboard or via the service-role key.

create table if not exists public.tester_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  user_email text,
  day_reviewed date not null,
  ratings jsonb not null,
  comment text,
  app_version text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists tester_reviews_user_day_idx
  on public.tester_reviews (user_id, day_reviewed desc);

create index if not exists tester_reviews_created_at_idx
  on public.tester_reviews (created_at desc);

alter table public.tester_reviews enable row level security;

create policy "tester can read own reviews"
  on public.tester_reviews for select
  using (auth.uid() = user_id);
