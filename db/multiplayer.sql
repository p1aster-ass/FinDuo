-- Multiplayer: avatars, live positions, room chat, and private rooms.
-- NOT APPLIED YET: review, then run once in the Neon SQL Editor on the branch
-- behind VITE_NEON_DATA_API_URL, after db/profiles_access.sql and
-- db/presence.sql. Then refresh the Data API schema cache (Neon Console →
-- Data API → Refresh schema cache). Until then the app still lets players
-- walk around and customize their avatar, but alone and without chat.
--
-- Transport: the app polls these tables through the Data API (about once a
-- second). Rooms are "lobby", a game id (e.g. "valorant"), or "p:<uuid>" for
-- a private room.

-- 1. Avatar -------------------------------------------------------------------
alter table public.profiles add column if not exists avatar jsonb;

-- 2. Positions ----------------------------------------------------------------
-- One row per player: where they are right now. Rows older than ~15 seconds
-- are treated as gone by the app.
create table if not exists public.world_positions (
  user_id uuid primary key default auth.user_id()::uuid
    constraint world_positions_user_id_fkey
    references public.profiles (user_id) on delete cascade,
  room text not null check (room ~ '^(lobby|[a-z0-9]{2,20}|p:[0-9a-f-]{36})$'),
  x real not null default 0,
  z real not null default 0,
  facing real not null default 0,
  emote text check (emote in ('jump', 'spin', 'dance', 'heart')),
  emote_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists world_positions_room_idx
  on public.world_positions (room, updated_at desc);

-- Timestamps come from the database clock, not the browser.
-- A new emote is signalled by sending a new emote_at; the database then stamps
-- it with its own clock.
create or replace function public.touch_world_position()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.emote is null then
    new.emote_at = null;
  elsif tg_op = 'INSERT' or new.emote_at is distinct from old.emote_at then
    new.emote_at = now();
  end if;
  return new;
end;
$$;
drop trigger if exists world_positions_touch on public.world_positions;
create trigger world_positions_touch
  before insert or update on public.world_positions
  for each row execute function public.touch_world_position();

alter table public.world_positions enable row level security;
drop policy if exists "finduo: see players in the world" on public.world_positions;
create policy "finduo: see players in the world"
  on public.world_positions for select to authenticated using (true);
drop policy if exists "finduo: place yourself" on public.world_positions;
create policy "finduo: place yourself"
  on public.world_positions for insert to authenticated
  with check (user_id = auth.user_id()::uuid);
drop policy if exists "finduo: move yourself" on public.world_positions;
create policy "finduo: move yourself"
  on public.world_positions for update to authenticated
  using (user_id = auth.user_id()::uuid)
  with check (user_id = auth.user_id()::uuid);
drop policy if exists "finduo: leave the world" on public.world_positions;
create policy "finduo: leave the world"
  on public.world_positions for delete to authenticated
  using (user_id = auth.user_id()::uuid);
grant select, insert, update, delete on public.world_positions to authenticated;

-- 3. Private rooms (invite → accept) ------------------------------------------
create table if not exists public.private_rooms (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.user_id()::uuid
    constraint private_rooms_created_by_fkey
    references public.profiles (user_id) on delete cascade,
  invitee uuid not null
    constraint private_rooms_invitee_fkey
    references public.profiles (user_id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  check (created_by <> invitee)
);
create index if not exists private_rooms_invitee_idx
  on public.private_rooms (invitee, created_at desc);
create index if not exists private_rooms_created_by_idx
  on public.private_rooms (created_by, created_at desc);

alter table public.private_rooms enable row level security;
drop policy if exists "finduo: see your private rooms" on public.private_rooms;
create policy "finduo: see your private rooms"
  on public.private_rooms for select to authenticated
  using (auth.user_id()::uuid in (created_by, invitee));
drop policy if exists "finduo: invite someone" on public.private_rooms;
create policy "finduo: invite someone"
  on public.private_rooms for insert to authenticated
  with check (created_by = auth.user_id()::uuid and status = 'pending');
-- The invitee accepts or declines; the inviter can cancel.
drop policy if exists "finduo: answer an invite" on public.private_rooms;
create policy "finduo: answer an invite"
  on public.private_rooms for update to authenticated
  using (auth.user_id()::uuid in (created_by, invitee))
  with check (
    (invitee = auth.user_id()::uuid and status in ('accepted', 'declined'))
    or (created_by = auth.user_id()::uuid and status = 'cancelled')
  );
grant select, insert, update on public.private_rooms to authenticated;

-- 4. Chat ---------------------------------------------------------------------
create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  room text not null check (room ~ '^(lobby|[a-z0-9]{2,20}|p:[0-9a-f-]{36})$'),
  user_id uuid not null default auth.user_id()::uuid
    constraint chat_messages_user_id_fkey
    references public.profiles (user_id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 200),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_room_idx
  on public.chat_messages (room, id desc);

-- True when the caller is a member of an accepted private room.
create or replace function public.in_private_room(room_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.private_rooms
    where room_key = 'p:' || id::text
      and status = 'accepted'
      and auth.user_id()::uuid in (created_by, invitee)
  );
$$;
revoke all on function public.in_private_room(text) from public;
grant execute on function public.in_private_room(text) to authenticated;

alter table public.chat_messages enable row level security;
drop policy if exists "finduo: read room chat" on public.chat_messages;
create policy "finduo: read room chat"
  on public.chat_messages for select to authenticated
  using (room not like 'p:%' or public.in_private_room(room));
drop policy if exists "finduo: talk in rooms" on public.chat_messages;
create policy "finduo: talk in rooms"
  on public.chat_messages for insert to authenticated
  with check (
    user_id = auth.user_id()::uuid
    and (room not like 'p:%' or public.in_private_room(room))
  );
grant select, insert on public.chat_messages to authenticated;

-- At most 5 messages per 10 seconds per player (the app shows "slow down").
create or replace function public.limit_chat_rate()
returns trigger language plpgsql as $$
begin
  new.created_at = now();
  if (
    select count(*) from public.chat_messages
    where user_id = new.user_id and created_at > now() - interval '10 seconds'
  ) >= 5 then
    raise exception 'chat rate limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists chat_messages_rate on public.chat_messages;
create trigger chat_messages_rate
  before insert on public.chat_messages
  for each row execute function public.limit_chat_rate();

-- Housekeeping (optional, e.g. from a scheduled job): chat older than a day
-- and positions older than an hour are never shown by the app.
--   delete from public.chat_messages where created_at < now() - interval '1 day';
--   delete from public.world_positions where updated_at < now() - interval '1 hour';
