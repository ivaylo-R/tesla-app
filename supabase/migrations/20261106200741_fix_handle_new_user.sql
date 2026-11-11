-- Keep profile creation safe and idempotent for new Auth users.
-- This replaces only the trigger function; it does not rewrite existing profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(
      pg_catalog.left(pg_catalog.btrim(new.raw_user_meta_data ->> 'display_name'), 80),
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
