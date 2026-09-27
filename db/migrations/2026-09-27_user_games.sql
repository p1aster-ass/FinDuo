-- Additive migration. Run on a disposable Neon production child first.
-- Legacy profile columns and values are retained. No auth schema changes.
begin;
set local lock_timeout = '10s';

create table if not exists public.user_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  game text not null check (game = btrim(game) and char_length(game) between 1 and 80),
  region text check (region = btrim(region) and char_length(region) between 1 and 64),
  rank text check (rank = btrim(rank) and char_length(rank) between 1 and 80),
  roles text[] not null default '{}',
  platform text check (platform = btrim(platform) and char_length(platform) between 1 and 64),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game)
);
-- The unique index also covers loads by user and the foreign key.
create index if not exists user_games_game_region_rank_idx
  on public.user_games(game, region, rank);

-- Serialize migration against legacy writes. Invalid legacy game identifiers
-- abort the transaction instead of being silently discarded or normalized.
lock table public.profiles in share row exclusive mode;
insert into public.user_games(user_id,game,region,rank,roles,created_at,updated_at)
select distinct p.user_id,g.game,p.region,p.rank,p.roles,p.created_at,p.updated_at
from public.profiles p cross join lateral unnest(p.games) as g(game)
on conflict (user_id,game) do nothing;

alter table public.user_games enable row level security;
revoke all on public.user_games from public, anonymous, authenticated;
grant select, delete on public.user_games to authenticated;
grant insert(user_id,game,region,rank,roles,platform), update(region,rank,roles,platform)
  on public.user_games to authenticated;

drop policy if exists "finduo: read public game profiles" on public.user_games;
create policy "finduo: read public game profiles" on public.user_games
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.user_id = user_games.user_id)
  );
drop policy if exists "finduo: create own game profiles" on public.user_games;
create policy "finduo: create own game profiles" on public.user_games
  for insert to authenticated with check (user_id = (select auth.user_id()::uuid));
drop policy if exists "finduo: edit own game profiles" on public.user_games;
create policy "finduo: edit own game profiles" on public.user_games
  for update to authenticated using (user_id = (select auth.user_id()::uuid))
  with check (user_id = (select auth.user_id()::uuid));
drop policy if exists "finduo: remove own game profiles" on public.user_games;
create policy "finduo: remove own game profiles" on public.user_games
  for delete to authenticated using (user_id = (select auth.user_id()::uuid));

create or replace function public.touch_user_game() returns trigger
language plpgsql security invoker set search_path = pg_catalog as $$
begin
  -- Serialize membership changes with profile saves for the same player.
  perform 1 from public.profiles where user_id = coalesce(new.user_id,old.user_id) for update;
  if tg_op = 'UPDATE' then
    new.updated_at := clock_timestamp();
    -- Verification applies to the exact gaming details that were verified.
    if (new.region,new.rank,new.roles,new.platform) is distinct from
       (old.region,old.rank,old.roles,old.platform) then new.verified := false; end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create or replace trigger user_games_touch before insert or update or delete
  on public.user_games for each row execute function public.touch_user_game();

-- Old clients may still change game membership. Seed only NEW games from the
-- legacy defaults: a global rank/region/roles edit never overwrites a game.
create or replace function public.sync_legacy_profile_games() returns trigger
language plpgsql security invoker set search_path = pg_catalog as $$
begin
  if pg_trigger_depth() > 1 then return new; end if;
  delete from public.user_games where user_id = new.user_id
    and not (game = any(new.games));
  insert into public.user_games(user_id,game,region,rank,roles)
    select distinct new.user_id,g,new.region,new.rank,new.roles from unnest(new.games) g
    on conflict(user_id,game) do nothing;
  return new;
end $$;
create or replace trigger profiles_sync_games after insert or update of games
  on public.profiles for each row execute function public.sync_legacy_profile_games();

create or replace function public.sync_user_games_membership() returns trigger
language plpgsql security invoker set search_path = pg_catalog as $$
declare owner_id uuid := coalesce(new.user_id,old.user_id);
begin
  if pg_trigger_depth() > 1 then return null; end if;
  update public.profiles p set games = coalesce((
    select array_agg(g.game order by array_position(p.games,g.game),g.created_at,g.game)
    from public.user_games g where g.user_id = owner_id
  ),'{}') where p.user_id = owner_id;
  return null;
end $$;
create or replace trigger user_games_sync_membership after insert or delete
  on public.user_games for each row execute function public.sync_user_games_membership();

-- One Data API call = one transaction for profile + complete game selection.
-- SECURITY INVOKER keeps RLS/column grants in force, including a forged user ID.
-- Legacy scalar gaming fields are retained on existing profiles.
create or replace function public.save_player_profile(
  p_user_id uuid, p_profile jsonb, p_games jsonb
) returns void language plpgsql security invoker set search_path = pg_catalog as $$
declare entry jsonb;
begin
  if jsonb_typeof(p_profile) is distinct from 'object'
     or jsonb_typeof(p_games) is distinct from 'array' then
    raise exception 'Expected profile object and game array' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_games) g
    where jsonb_typeof(g) <> 'object' or jsonb_typeof(g->'game') is distinct from 'string'
      or (g ? 'roles' and (jsonb_typeof(g->'roles') <> 'array'
        or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(g->'roles')='array' then g->'roles' else '[]' end) r where jsonb_typeof(r)<>'string')))
      or exists(select 1 from jsonb_each(g) kv where kv.key in ('region','rank','platform') and jsonb_typeof(kv.value) not in ('string','null')))
    or (select count(*) <> count(distinct g->>'game') from jsonb_array_elements(p_games) g) then
    raise exception 'Invalid or duplicate game details' using errcode = '22023';
  end if;
  insert into public.profiles(user_id,username,display_name,bio,comm_styles,availability,avatar)
    values(p_user_id,p_profile->>'username',p_profile->>'display_name',p_profile->>'bio',
      array(select jsonb_array_elements_text(coalesce(p_profile->'comm_styles','[]'))),
      array(select jsonb_array_elements_text(coalesce(p_profile->'availability','[]'))),p_profile->'avatar')
    on conflict(user_id) do update set
      username = excluded.username, display_name = excluded.display_name,
      bio = case when p_profile ? 'bio' then excluded.bio else profiles.bio end,
      comm_styles = case when p_profile ? 'comm_styles' then excluded.comm_styles else profiles.comm_styles end,
      availability = case when p_profile ? 'availability' then excluded.availability else profiles.availability end,
      avatar = case when p_profile ? 'avatar' then excluded.avatar else profiles.avatar end;
  for entry in select value from jsonb_array_elements(p_games) loop
    insert into public.user_games(user_id,game,region,rank,roles,platform)
    values(p_user_id,entry->>'game',entry->>'region',entry->>'rank',
      array(select jsonb_array_elements_text(coalesce(entry->'roles','[]'))),entry->>'platform')
    on conflict(user_id,game) do update set region=excluded.region,rank=excluded.rank,
      roles=excluded.roles,platform=excluded.platform
    where (user_games.region,user_games.rank,user_games.roles,user_games.platform)
      is distinct from (excluded.region,excluded.rank,excluded.roles,excluded.platform);
  end loop;
  delete from public.user_games where user_id=p_user_id
    and game not in (select value->>'game' from jsonb_array_elements(p_games));
end $$;

revoke all on function public.touch_user_game(),public.sync_legacy_profile_games(),
  public.sync_user_games_membership(),public.save_player_profile(uuid,jsonb,jsonb)
  from public,anonymous,authenticated;
grant execute on function public.save_player_profile(uuid,jsonb,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
