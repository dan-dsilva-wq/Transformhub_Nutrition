create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  age integer not null check (age >= 18 and age <= 100),
  sex_for_calories text not null check (sex_for_calories in ('female', 'male')),
  gender_label text,
  units text not null check (units in ('metric', 'imperial')),
  height_cm numeric(5,2) not null check (height_cm between 120 and 230),
  current_weight_kg numeric(6,2) not null check (current_weight_kg between 35 and 300),
  goal_weight_kg numeric(6,2) not null check (goal_weight_kg between 35 and 300),
  activity_level text not null check (activity_level in ('sedentary', 'light', 'moderate', 'active')),
  schedule jsonb not null default '{}'::jsonb,
  dietary_restrictions text[] not null default '{}',
  injuries text[] not null default '{}',
  equipment text not null default 'none' check (equipment in ('none', 'bands', 'dumbbells', 'gym')),
  accountability_style text not null default 'firm' check (accountability_style in ('gentle', 'firm', 'tough')),
  adult_guardrail_accepted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_type text not null default 'weight_loss',
  start_weight_kg numeric(6,2) not null,
  target_weight_kg numeric(6,2) not null,
  target_date date,
  status text not null default 'active' check (status in ('active', 'paused', 'complete')),
  created_at timestamptz not null default now()
);

create table public.daily_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_date date not null,
  calories integer not null,
  protein_g integer not null,
  carbs_g integer not null,
  fat_g integer not null,
  fiber_g integer not null,
  water_ml integer not null,
  steps integer not null,
  workouts_per_week integer not null,
  exercise_minutes_per_week integer not null,
  source text not null default 'calculated',
  created_at timestamptz not null default now(),
  unique (user_id, target_date)
);

create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_at timestamptz not null default now(),
  meal_name text not null default 'Meal',
  photo_path text,
  note text,
  status text not null default 'draft' check (status in ('draft', 'confirmed')),
  ai_confidence numeric(3,2) check (ai_confidence between 0 and 1),
  source text not null default 'photo_ai' check (source in ('photo_ai', 'manual', 'favorite')),
  created_at timestamptz not null default now()
);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references public.meal_logs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  portion text not null,
  calories integer not null default 0,
  protein_g numeric(6,2) not null default 0,
  carbs_g numeric(6,2) not null default 0,
  fat_g numeric(6,2) not null default 0,
  fiber_g numeric(6,2) not null default 0,
  confidence numeric(3,2) check (confidence between 0 and 1)
);

create table public.hydration_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_at timestamptz not null default now(),
  amount_ml integer not null check (amount_ml > 0 and amount_ml <= 3000),
  source text not null default 'manual'
);

create table public.step_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  steps integer not null check (steps >= 0 and steps <= 100000),
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  unique (user_id, log_date, source)
);

create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  weight_kg numeric(6,2) not null check (weight_kg between 35 and 300),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create table public.progress_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  mood text,
  wins text,
  blockers text,
  accountability_note text,
  created_at timestamptz not null default now()
);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid references public.progress_entries(id) on delete cascade,
  photo_path text not null,
  photo_type text not null check (photo_type in ('front', 'side', 'rear')),
  created_at timestamptz not null default now()
);

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  plan jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_plan_id uuid references public.workout_plans(id) on delete set null,
  logged_at timestamptz not null default now(),
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 300),
  completed boolean not null default true,
  note text
);

create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  suggested_actions text[] not null default '{}',
  risk_flag text not null default 'none',
  created_at timestamptz not null default now()
);

create table public.device_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('fitbit', 'apple_health', 'google_health_connect', 'csv')),
  import_type text not null check (import_type in ('steps', 'water', 'activity', 'weight')),
  external_id text,
  payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now()
);

create table public.food_database (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'USDA FoodData Central',
  source_id text not null,
  name text not null,
  brand text,
  category text,
  serving_text text not null default '100 g',
  serving_grams numeric(8,2) not null default 100,
  calories_per_100g numeric(8,2) not null default 0,
  protein_per_100g numeric(8,2) not null default 0,
  carbs_per_100g numeric(8,2) not null default 0,
  fat_per_100g numeric(8,2) not null default 0,
  fiber_per_100g numeric(8,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id)
);

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.daily_targets enable row level security;
alter table public.meal_logs enable row level security;
alter table public.meal_items enable row level security;
alter table public.hydration_logs enable row level security;
alter table public.step_logs enable row level security;
alter table public.weight_logs enable row level security;
alter table public.progress_entries enable row level security;
alter table public.progress_photos enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_logs enable row level security;
alter table public.coach_messages enable row level security;
alter table public.device_imports enable row level security;
alter table public.food_database enable row level security;

create policy "profiles are user owned" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "goals are user owned" on public.goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "daily targets are user owned" on public.daily_targets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "meal logs are user owned" on public.meal_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "meal items are user owned" on public.meal_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "hydration logs are user owned" on public.hydration_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "step logs are user owned" on public.step_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "weight logs are user owned" on public.weight_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "progress entries are user owned" on public.progress_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "progress photos are user owned" on public.progress_photos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "workout plans are user owned" on public.workout_plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "workout logs are user owned" on public.workout_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "coach messages are user owned" on public.coach_messages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "device imports are user owned" on public.device_imports
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "food database is public readable" on public.food_database
  for select using (true);

create index food_database_name_trgm_idx
  on public.food_database using gin (name gin_trgm_ops);

create index food_database_brand_trgm_idx
  on public.food_database using gin (brand gin_trgm_ops);

create index food_database_category_trgm_idx
  on public.food_database using gin (category gin_trgm_ops);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('meal-photos', 'meal-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('progress-photos', 'progress-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false;

create policy "meal photo owner select" on storage.objects
  for select using (bucket_id = 'meal-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "meal photo owner insert" on storage.objects
  for insert with check (bucket_id = 'meal-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "meal photo owner update" on storage.objects
  for update using (bucket_id = 'meal-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "meal photo owner delete" on storage.objects
  for delete using (bucket_id = 'meal-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "progress photo owner select" on storage.objects
  for select using (bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "progress photo owner insert" on storage.objects
  for insert with check (bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "progress photo owner update" on storage.objects
  for update using (bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "progress photo owner delete" on storage.objects
  for delete using (bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1]);
