-- Harvard Plate core schema
-- Safe for repeated execution.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique,
  username text,
  email text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  category text not null check (category in ('vegetable', 'grain', 'protein', 'fat')),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.saved_plates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text,
  ingredients jsonb not null default '[]'::jsonb,
  recipe_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.recipe_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  request_data jsonb not null,
  response_data jsonb,
  gigachat_usage jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_ingredients_user_id
  on public.user_ingredients(user_id);

create index if not exists idx_saved_plates_user_id
  on public.saved_plates(user_id);

create index if not exists idx_recipe_history_user_id
  on public.recipe_history(user_id);

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

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

alter default privileges in schema public
grant select, insert, update, delete on tables to anon, authenticated, service_role;

alter default privileges in schema public
grant usage, select on sequences to anon, authenticated, service_role;
