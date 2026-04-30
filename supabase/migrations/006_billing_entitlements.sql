-- Launch-gated subscription records. Client state may cache this, but the
-- server/provider record is the source of truth once billing goes live.

create table if not exists public.billing_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'revenuecat',
  provider_app_user_id text,
  entitlement_id text not null default 'premium',
  product_id text,
  store text,
  environment text,
  status text not null default 'none'
    check (status in ('none', 'trial', 'active', 'expired', 'cancelled', 'billing_issue')),
  will_renew boolean,
  transaction_id text,
  original_transaction_id text,
  purchased_at timestamptz,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  raw jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists billing_subscriptions_provider_user_idx
  on public.billing_subscriptions (provider, provider_app_user_id);

create index if not exists billing_subscriptions_status_idx
  on public.billing_subscriptions (status, current_period_ends_at desc);

create table if not exists public.billing_events (
  id text primary key,
  provider text not null default 'revenuecat',
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  event_timestamp timestamptz,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists billing_events_user_created_idx
  on public.billing_events (user_id, created_at desc);

alter table public.billing_subscriptions enable row level security;
alter table public.billing_events enable row level security;

drop policy if exists "subscriber can read own billing subscription"
  on public.billing_subscriptions;
create policy "subscriber can read own billing subscription"
  on public.billing_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "subscriber can read own billing events"
  on public.billing_events;
create policy "subscriber can read own billing events"
  on public.billing_events for select
  using (auth.uid() = user_id);
