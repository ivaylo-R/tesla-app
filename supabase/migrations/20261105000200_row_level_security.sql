alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_memberships enable row level security;

revoke all on public.profiles, public.vehicles, public.vehicle_memberships from public, anon, authenticated;
revoke all on type public.vehicle_role from public, anon, authenticated;

grant usage on schema public to authenticated;
grant usage on type public.vehicle_role to authenticated;
grant select, update (display_name) on public.profiles to authenticated;
grant select, insert (created_by, nickname, model_name, model_year, vin),
  update (nickname, model_name, model_year, vin), delete on public.vehicles to authenticated;
grant select on public.vehicle_memberships to authenticated;

create policy profiles_select_self
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_self
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy vehicles_select_by_explicit_membership
  on public.vehicles for select to authenticated
  using (
    exists (
      select 1
      from public.vehicle_memberships membership
      where membership.vehicle_id = vehicles.id
        and membership.user_id = (select auth.uid())
    )
  );

create policy vehicles_insert_as_creator
  on public.vehicles for insert to authenticated
  with check ((select auth.uid()) = created_by);

create policy vehicles_update_by_owner
  on public.vehicles for update to authenticated
  using (
    exists (
      select 1
      from public.vehicle_memberships membership
      where membership.vehicle_id = vehicles.id
        and membership.user_id = (select auth.uid())
        and membership.role = 'owner'
    )
  )
  with check (
    exists (
      select 1
      from public.vehicle_memberships membership
      where membership.vehicle_id = vehicles.id
        and membership.user_id = (select auth.uid())
        and membership.role = 'owner'
    )
  );

create policy vehicles_delete_by_owner
  on public.vehicles for delete to authenticated
  using (
    exists (
      select 1
      from public.vehicle_memberships membership
      where membership.vehicle_id = vehicles.id
        and membership.user_id = (select auth.uid())
        and membership.role = 'owner'
    )
  );

create policy memberships_select_self
  on public.vehicle_memberships for select to authenticated
  using ((select auth.uid()) = user_id);

-- There are deliberately no client INSERT, UPDATE, or DELETE grants/policies on
-- vehicle_memberships. The only membership changes go through owner-checked RPCs.
create function public.grant_vehicle_access(
  p_vehicle_id uuid,
  p_user_id uuid,
  p_role public.vehicle_role default 'viewer'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_role is distinct from 'viewer'::public.vehicle_role then
    raise exception 'Only viewer access can be granted' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.vehicle_memberships membership
    where membership.vehicle_id = p_vehicle_id
      and membership.user_id = (select auth.uid())
      and membership.role = 'owner'
  ) then
    raise exception 'Only a vehicle owner can share this vehicle' using errcode = '42501';
  end if;

  insert into public.vehicle_memberships (vehicle_id, user_id, role, granted_by)
  values (p_vehicle_id, p_user_id, 'viewer', (select auth.uid()));
end;
$$;

create function public.revoke_vehicle_access(
  p_vehicle_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.vehicle_memberships membership
    where membership.vehicle_id = p_vehicle_id
      and membership.user_id = (select auth.uid())
      and membership.role = 'owner'
  ) then
    raise exception 'Only a vehicle owner can revoke access' using errcode = '42501';
  end if;

  delete from public.vehicle_memberships
  where vehicle_id = p_vehicle_id
    and user_id = p_user_id
    and role = 'viewer';

  get diagnostics removed_count = row_count;
  return removed_count = 1;
end;
$$;

revoke all on function public.grant_vehicle_access(uuid, uuid, public.vehicle_role) from public, anon, authenticated;
revoke all on function public.revoke_vehicle_access(uuid, uuid) from public, anon, authenticated;
grant execute on function public.grant_vehicle_access(uuid, uuid, public.vehicle_role) to authenticated;
grant execute on function public.revoke_vehicle_access(uuid, uuid) to authenticated;
