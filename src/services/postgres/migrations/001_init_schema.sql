-- Harvard Plate core schema for PostgreSQL
-- Safe for repeated execution.

create table if not exists public.users (
  telegram_id bigint primary key,
  username text,
  email text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_ingredients (
  id uuid primary key,
  telegram_id bigint not null references public.users(telegram_id) on delete cascade,
  name text not null,
  category text not null check (category in ('vegetable', 'grain', 'protein', 'fat')),
  created_at timestamptz not null default now(),
  unique (telegram_id, name)
);

create table if not exists public.saved_plates (
  id uuid primary key,
  telegram_id bigint not null references public.users(telegram_id) on delete cascade,
  name text,
  ingredients jsonb not null default '[]'::jsonb,
  recipe_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.recipe_history (
  id uuid primary key,
  telegram_id bigint not null references public.users(telegram_id) on delete cascade,
  request_data jsonb not null,
  response_data jsonb,
  gigachat_usage jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_ingredients_user_id
  on public.user_ingredients(telegram_id);

create index if not exists idx_saved_plates_user_id
  on public.saved_plates(telegram_id);

create index if not exists idx_recipe_history_user_id
  on public.recipe_history(telegram_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();
