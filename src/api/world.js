import { DataApiError, isMissingTable } from "./dataApi.js";
import { toPlayer } from "./presence.js";
import { normalizeAvatar } from "../data/avatar.js";
import { GAME_PROFILE_EMBED, withGameProfiles } from "./userGames.js";

// Players whose position hasn't updated for this long have left.
export const STALE_SECONDS = 15;
// Chat older than this (before you arrived) isn't loaded.
export const CHAT_HISTORY_SECONDS = 120;

const PROFILE_FIELDS =
  "display_name,username,avatar,region,rank,games,comm_styles,roles,availability,bio" +
  GAME_PROFILE_EMBED;

export class WorldUnavailableError extends Error {}

// Missing multiplayer tables or columns mean db/multiplayer.sql isn't applied.
function unavailable(error) {
  return (
    isMissingTable(error) ||
    (error instanceof DataApiError &&
      ["42703", "PGRST204", "PGRST200"].includes(error.code))
  );
}

async function guard(promise) {
  try {
    return await promise;
  } catch (error) {
    if (unavailable(error)) {
      throw new WorldUnavailableError("Multiplayer isn’t set up yet.");
    }
    if (error instanceof DataApiError && error.code === "P0001") {
      throw new DataApiError(
        "You’re sending messages too fast. Slow down a sec.",
        {
          status: 429,
          code: "P0001",
        },
      );
    }
    throw error;
  }
}

const since = (seconds, now) =>
  encodeURIComponent(new Date(now - seconds * 1000).toISOString());
const eq = (value) => `eq.${encodeURIComponent(value)}`;

export function toPeer(row, now = Date.now()) {
  const profile = row.profile ?? {};
  return {
    id: row.user_id,
    room: row.room,
    x: Number(row.x) || 0,
    z: Number(row.z) || 0,
    facing: Number(row.facing) || 0,
    emote: row.emote ?? null,
    emoteAt: row.emote_at ? Date.parse(row.emote_at) : 0,
    avatar: normalizeAvatar(profile.avatar),
    player: toPlayer(
      { ...profile, user_id: row.user_id, last_seen_at: row.updated_at },
      now,
      row.room,
    ),
  };
}

export function createWorldApi(request) {
  const readProfiles = withGameProfiles(request);
  return {
    // Upserts where the signed-in player stands.
    move(userId, { room, x, z, facing, emote, emoteAt }) {
      return guard(
        request("world_positions?on_conflict=user_id", {
          method: "POST",
          body: {
            user_id: userId,
            room,
            x: Math.round(x * 100) / 100,
            z: Math.round(z * 100) / 100,
            facing: Math.round(facing * 100) / 100,
            emote: emote ?? null,
            emote_at: emoteAt ? new Date(emoteAt).toISOString() : null,
          },
          prefer: "resolution=merge-duplicates,return=minimal",
        }),
      );
    },
    leave(userId) {
      return guard(
        request(`world_positions?user_id=${eq(userId)}`, { method: "DELETE" }),
      ).catch(() => {});
    },
    // Everyone else in `room`, with their avatar and profile.
    async peers(room, userId, now = Date.now()) {
      const rows = await guard(
        readProfiles(
          `world_positions?room=${eq(room)}&user_id=neq.${encodeURIComponent(userId)}` +
            `&updated_at=gte.${since(STALE_SECONDS, now)}` +
            `&select=user_id,room,x,z,facing,emote,emote_at,updated_at,profile:profiles(${PROFILE_FIELDS})` +
            `&limit=40`,
        ),
      );
      return (rows ?? []).map((row) => toPeer(row, now));
    },
    // How many players are in each room right now.
    async roomCounts(now = Date.now()) {
      const rows = await guard(
        request(
          `world_positions?updated_at=gte.${since(STALE_SECONDS, now)}&select=room&limit=1000`,
        ),
      );
      const counts = {};
      for (const { room } of rows ?? []) counts[room] = (counts[room] ?? 0) + 1;
      return counts;
    },
    // New messages in `room` after `afterId`, no older than `fromTime`.
    async messages(room, { afterId = 0, fromTime }) {
      const rows = await guard(
        request(
          `chat_messages?room=${eq(room)}&id=gt.${afterId}` +
            `&created_at=gte.${encodeURIComponent(new Date(fromTime).toISOString())}` +
            `&select=id,user_id,body,created_at,author:profiles(display_name,username)` +
            `&order=id.asc&limit=50`,
        ),
      );
      return (rows ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        body: row.body,
        name: row.author?.display_name || row.author?.username || "Player",
        at: Date.parse(row.created_at),
      }));
    },
    say(room, body) {
      const text = body.trim().slice(0, 200);
      if (!text) return Promise.resolve();
      return guard(
        request("chat_messages", {
          method: "POST",
          body: { room, body: text },
          prefer: "return=minimal",
        }),
      );
    },
    // Recent private-room invites you sent or received.
    async invites(now = Date.now()) {
      const rows = await guard(
        request(
          `private_rooms?created_at=gte.${since(300, now)}` +
            `&select=id,created_by,invitee,status,created_at,` +
            `inviter:profiles!private_rooms_created_by_fkey(display_name,username),` +
            `guest:profiles!private_rooms_invitee_fkey(display_name,username)` +
            `&order=created_at.desc&limit=20`,
        ),
      );
      return (rows ?? []).map((row) => ({
        id: row.id,
        from: row.created_by,
        to: row.invitee,
        status: row.status,
        fromName:
          row.inviter?.display_name || row.inviter?.username || "Player",
        toName: row.guest?.display_name || row.guest?.username || "Player",
      }));
    },
    async invite(inviteeId) {
      const rows = await guard(
        request("private_rooms?select=id", {
          method: "POST",
          body: { invitee: inviteeId },
          prefer: "return=representation",
        }),
      );
      return rows?.[0]?.id ?? null;
    },
    async answer(inviteId, status) {
      if (!["accepted", "declined", "cancelled"].includes(status)) {
        throw new DataApiError("That invitation response is not valid.", {
          status: 400,
          code: "INVALID_INVITE_STATUS",
        });
      }
      const rows = await guard(
        request(`private_rooms?id=${eq(inviteId)}&select=id,status`, {
          method: "PATCH",
          body: { status },
          prefer: "return=representation",
        }),
      );
      if (
        rows?.length !== 1 ||
        rows[0].id !== inviteId ||
        rows[0].status !== status
      ) {
        throw new DataApiError(
          "This invitation could not be updated. It may have already been answered.",
          {
            status: 409,
            code: "INVITE_NOT_UPDATED",
          },
        );
      }
      return true;
    },
  };
}
