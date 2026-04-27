create extension if not exists pg_trgm;

create table if not exists public.food_database (
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

alter table public.food_database enable row level security;

create policy "food database is public readable" on public.food_database
  for select using (true);

create index if not exists food_database_name_trgm_idx
  on public.food_database using gin (name gin_trgm_ops);

create index if not exists food_database_brand_trgm_idx
  on public.food_database using gin (brand gin_trgm_ops);

create index if not exists food_database_category_trgm_idx
  on public.food_database using gin (category gin_trgm_ops);
