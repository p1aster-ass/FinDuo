-- Lets signed-in players (Neon Auth JWT role `authenticated`) use public.profiles
-- through the Data API: read profiles, create their own row, and update only
-- their own row. Safe to re-run. Review, then run in the Neon SQL Editor.
--
-- auth.user_id() is the `sub` claim of the caller's Neon Auth JWT (text), so it
-- is cast to uuid to compare with user_id.

-- 1. Check what's there now (read-only). The 403 on "Complete Profile" means one
--    of these is missing: an INSERT/UPDATE grant, or an INSERT/UPDATE policy.
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'profiles';

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'profiles'
  and grantee in ('authenticated', 'anonymous');

-- 2. Grants: signed-in players only. Anonymous visitors get nothing.
grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;

-- 3. Row-level security policies.
alter table public.profiles enable row level security;

-- Every signed-in player can read profiles (Find players needs this).
-- Change `true` to `user_id = (select auth.user_id()::uuid)` to keep profiles private.
drop policy if exists "finduo: signed-in players read profiles" on public.profiles;
create policy "finduo: signed-in players read profiles"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "finduo: players create their own profile" on public.profiles;
create policy "finduo: players create their own profile"
  on public.profiles for insert
  to authenticated
  with check (user_id = (select auth.user_id()::uuid));

drop policy if exists "finduo: players update their own profile" on public.profiles;
create policy "finduo: players update their own profile"
  on public.profiles for update
  to authenticated
  using (user_id = (select auth.user_id()::uuid))
  with check (user_id = (select auth.user_id()::uuid));
