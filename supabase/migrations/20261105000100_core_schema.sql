create type public.vehicle_role as enum ('owner', 'viewer');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) <= 80)
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete cascade,
  nickname text not null default 'My Tesla',
  model_name text not null default 'Model Y',
  model_year smallint,
  vin text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicles_nickname_length check (char_length(nickname) between 1 and 80),
  constraint vehicles_model_name_length check (char_length(model_name) between 1 and 80),
  constraint vehicles_model_year_range check (model_year is null or model_year between 2008 and 2100),
  constraint vehicles_vin_format check (vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{17}$')
);

create table public.vehicle_memberships (
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.vehicle_role not null default 'viewer',
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (vehicle_id, user_id)
);

create index vehicle_memberships_user_id_idx on public.vehicle_memberships (user_id, vehicle_id);
create index vehicles_created_by_idx on public.vehicles (created_by);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    pg_catalog.nullif(pg_catalog.left(pg_catalog.btrim(new.raw_user_meta_data ->> 'display_name'), 80), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.assign_vehicle_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.vehicle_memberships (vehicle_id, user_id, role, granted_by)
  values (new.id, new.created_by, 'owner', new.created_by);
  return new;
end;
$$;

revoke all on function public.assign_vehicle_creator_as_owner() from public, anon, authenticated;

create trigger on_vehicle_created_assign_owner
  after insert on public.vehicles
  for each row execute function public.assign_vehicle_creator_as_owner();

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();
