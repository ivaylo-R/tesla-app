begin;

create extension if not exists pgtap with schema extensions;
select plan(23);
select hasnt_table('public', 'tesla_credentials', 'this stage creates no Tesla credentials table');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.profiles'::regclass), 'RLS is enabled for profiles');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.vehicles'::regclass), 'RLS is enabled for vehicles');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.vehicle_memberships'::regclass), 'RLS is enabled for vehicle memberships');

-- Two test accounts. The second carries a deliberately misleading global admin
-- claim; policies must still rely only on explicit vehicle membership rows.
insert into auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
) values
  (
    '10000000-0000-4000-8000-000000000001', 'owner@example.test', 'not-a-real-password', now(),
    '{"provider":"email","providers":["email"]}', '{"display_name":"Owner"}', now(), now(), 'authenticated', 'authenticated'
  ),
  (
    '20000000-0000-4000-8000-000000000002', 'viewer@example.test', 'not-a-real-password', now(),
    '{"provider":"email","providers":["email"],"role":"admin"}', '{"display_name":"Viewer"}', now(), now(), 'authenticated', 'authenticated'
  );

select ok(
  exists (select 1 from public.profiles where id = '10000000-0000-4000-8000-000000000001'),
  'new Supabase users receive a profile row'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{}}', true);

insert into public.vehicles (created_by, nickname, model_name, model_year, vin)
values ('10000000-0000-4000-8000-000000000001', 'Owner car', 'Model Y', 2023, '5YJSA1E26HF000001');
select is(
  (select count(*) from public.vehicles where nickname = 'Owner car'), 1::bigint,
  'a signed-in user can create their own vehicle'
);

select ok(
  exists (
    select 1 from public.vehicle_memberships
    where vehicle_id = (select id from public.vehicles where nickname = 'Owner car')
      and user_id = '10000000-0000-4000-8000-000000000001'
      and role = 'owner'
  ),
  'vehicle creator is automatically the explicit owner'
);

select is(
  (select count(*) from public.vehicles), 1::bigint,
  'owner sees their own vehicle'
);
select is(
  (select count(*) from public.profiles where id = '20000000-0000-4000-8000-000000000002'), 0::bigint,
  'owner cannot read another user profile'
);

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{"role":"admin"}}', true);

insert into public.vehicles (created_by, nickname, model_name, model_year, vin)
values ('20000000-0000-4000-8000-000000000002', 'Viewer car', 'Model 3', 2024, '5YJ3E1EA1RF000002');
select is(
  (select count(*) from public.vehicles where nickname = 'Viewer car'), 1::bigint,
  'a second signed-in user can create their own vehicle'
);

select is(
  (select count(*) from public.vehicles), 1::bigint,
  'a global admin claim does not grant access to another user vehicle'
);
select is(
  (select count(*) from public.vehicle_memberships where role = 'owner'), 1::bigint,
  'a user can only see their own membership row'
);
select is_empty(
  $$update public.vehicles set nickname = 'stolen' where nickname = 'Owner car' returning id$$,
  'a user cannot update a vehicle they do not own'
);
select throws_ok(
  $$insert into public.vehicle_memberships (vehicle_id, user_id, role)
    select id, '20000000-0000-4000-8000-000000000002', 'owner'
    from public.vehicles where nickname = 'Owner car'$$,
  '42501', null,
  'a user cannot insert or promote memberships directly'
);
select throws_ok(
  $$update public.vehicle_memberships set role = 'owner' where user_id = '20000000-0000-4000-8000-000000000002'$$,
  '42501', null,
  'a user cannot change their own membership role'
);
select throws_ok(
  $$select public.grant_vehicle_access(
    (select id from public.vehicles where nickname = 'Owner car'),
    '20000000-0000-4000-8000-000000000002', 'viewer'
  )$$,
  '42501', null,
  'a non-owner cannot grant access to another user vehicle'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{}}', true);
select lives_ok(
  $$select public.grant_vehicle_access(
    (select id from public.vehicles where nickname = 'Owner car'),
    '20000000-0000-4000-8000-000000000002', 'viewer'
  )$$,
  'vehicle owner can explicitly share a vehicle as viewer'
);

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select is(
  (select count(*) from public.vehicles), 2::bigint,
  'viewer sees their own and explicitly shared vehicle'
);
select is(
  (select role::text from public.vehicle_memberships where vehicle_id = (select id from public.vehicles where nickname = 'Owner car')),
  'viewer',
  'shared access remains viewer scoped to that vehicle'
);
select is_empty(
  $$update public.vehicles set nickname = 'stolen' where nickname = 'Owner car' returning id$$,
  'viewer cannot modify a shared vehicle'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{}}', true);
select is(
  public.revoke_vehicle_access(
    (select id from public.vehicles where nickname = 'Owner car'),
    '20000000-0000-4000-8000-000000000002'
  ),
  true,
  'owner can revoke a viewer membership'
);

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select is(
  (select count(*) from public.vehicles), 1::bigint,
  'revoked viewer no longer sees the shared vehicle'
);

set local role anon;
select throws_ok(
  $$select * from public.vehicles$$,
  '42501', null,
  'anonymous users have no vehicle table grant'
);

select * from finish();
rollback;
