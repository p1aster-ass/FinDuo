import { DataApiError } from "./dataApi.js";
import { projectGameProfile } from "../lib/gameProfiles.js";
import { GAME_PROFILE_EMBED, withGameProfiles } from "./userGames.js";

// A player counts as online if seen within this window (see db/presence.sql).
export const ONLINE_WINDOW_MINUTES = 5;

const COLUMNS =
  "user_id,display_name,username,region,rank,games,comm_styles,roles,availability,bio" +
  GAME_PROFILE_EMBED;

// 42703: the last_seen_at column doesn't exist yet. PGRST202: the
// touch_presence function doesn't exist yet. Both mean db/presence.sql
// hasn't been applied (or the schema cache hasn't been refreshed).
function isPresenceMissing(error) {
  return (
    error instanceof DataApiError &&
    ["42703", "PGRST202", "PGRST204"].includes(error.code)
  );
}

export function toPlayer(row, now = Date.now(), game) {
  const seen = row.last_seen_at ? Date.parse(row.last_seen_at) : null;
  const minutes =
    seen === null ? null : Math.max(0, Math.round((now - seen) / 60_000));
  const player = {
    id: row.user_id,
    name: row.display_name || row.username || "Player",
    username: row.username || "",
    games: row.games ?? [],
    region: row.region ?? "",
    rank: row.rank ?? "",
    comms: row.comm_styles ?? [],
    roles: row.roles ?? [],
    availability: row.availability ?? [],
    bio: row.bio ?? "",
    online: minutes !== null && minutes <= ONLINE_WINDOW_MINUTES,
    lastSeen: minutes,
  };
  return Array.isArray(row.gameProfiles)
    ? projectGameProfile({ ...player, gameProfiles: row.gameProfiles }, game)
    : player;
}

const inList = (values) => `{${values.map(encodeURIComponent).join(",")}}`;

export function createPresenceApi(request) {
  const readProfiles = withGameProfiles(request);
  return {
    // Marks the signed-in player as online. Returns false (instead of
    // throwing) when presence isn't set up in the database yet.
    async touch() {
      try {
        await request("rpc/touch_presence", { method: "POST", body: {} });
        return true;
      } catch (error) {
        if (isPresenceMissing(error)) return false;
        throw error;
      }
    },
    // Other players who share any of `games`. With presence set up, only
    // those seen in the last few minutes (`presence: true`); otherwise
    // everyone who plays them (`presence: false`).
    async players({ games, excludeUserId, now = Date.now() }) {
      if (!games.length) return { presence: true, players: [] };
      const base =
        `profiles?games=ov.${inList(games)}` +
        `&user_id=neq.${encodeURIComponent(excludeUserId)}&limit=60`;
      const since = new Date(
        now - ONLINE_WINDOW_MINUTES * 60_000,
      ).toISOString();
      try {
        const rows = await readProfiles(
          `${base}&select=${COLUMNS},last_seen_at` +
            `&last_seen_at=gte.${encodeURIComponent(since)}` +
            `&order=last_seen_at.desc`,
        );
        return {
          presence: true,
          players: (rows ?? []).map((row) => toPlayer(row, now)),
        };
      } catch (error) {
        if (!isPresenceMissing(error)) throw error;
        const rows = await readProfiles(
          `${base}&select=${COLUMNS}&order=updated_at.desc`,
        );
        return {
          presence: false,
          players: (rows ?? []).map((row) => toPlayer(row, now)),
        };
      }
    },
  };
}
