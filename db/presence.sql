-- Online presence for the game rooms.
-- NOT APPLIED YET: review, then run once in the Neon SQL Editor on the branch
-- behind VITE_NEON_DATA_API_URL. Afterwards refresh the Data API schema cache
-- (Neon Console → Data API → Refresh schema cache), or the app keeps showing
-- "online status isn't set up yet".
--
-- How it works: while someone has FinDuo open, the app calls touch_presence()
-- every 30 seconds. A room shows players who share that game and were seen in
-- the last 5 minutes. Rooms read other players' profiles, so the "signed-in
-- players read profiles" policy from db/profiles_access.sql must be in place.

alter table public.profiles
  add column if not exists last_seen_at timestamptz;

create index if not exists profiles_last_seen_at_idx
  on public.profiles (last_seen_at desc);

create index if not exists profiles_games_idx
  on public.profiles using gin (games);

-- Stamps the caller's own row with the database clock, so a client can't fake
-- its time or touch anyone else's row. Runs with the caller's permissions, so
-- the existing row-level security update policy still applies.
create or replace function public.touch_presence()
returns void
language sql
security invoker
set search_path = public
as $$
  update public.profiles
  set last_seen_at = now()
  where user_id = auth.user_id()::uuid;
$$;

revoke all on function public.touch_presence() from public;
grant execute on function public.touch_presence() to authenticated;
