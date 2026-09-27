import { DataApiError, isMissingTable } from "./dataApi.js";
import { normalizeAvatar } from "../data/avatar.js";
import { normalizeGameProfile } from "../lib/gameProfiles.js";
import { gameInput } from "./userGames.js";

// App field -> column in the live public.profiles table (user_id uuid,
// display_name, username, avatar_url, region, bio, games, rank, comm_styles,
// roles, availability, avatar, created_at, updated_at). `avatar` (jsonb) comes
// from db/multiplayer.sql; until it exists the avatar lives in memory only.
const COLUMNS = {
  username: "username",
  region: "region",
  bio: "bio",
  games: "games",
  rank: "rank",
  commStyles: "comm_styles",
  roles: "roles",
  availability: "availability",
};
const SELECT = Object.values(COLUMNS).join(",");
const LISTS = new Set(["games", "commStyles", "roles", "availability"]);

function fromRow(row) {
  const profile = {};
  for (const [field, column] of Object.entries(COLUMNS)) {
    profile[field] = row[column] ?? (LISTS.has(field) ? [] : "");
  }
  profile.avatar = normalizeAvatar(row.avatar);
  return profile;
}

function toRow(displayName, profile, withAvatar) {
  const row = { display_name: displayName };
  if (withAvatar && profile.avatar) row.avatar = profile.avatar;
  for (const [field, column] of Object.entries(COLUMNS)) {
    const value = profile[field];
    if (value === undefined) continue;
    // Empty strings become NULL so optional checks (like rank) accept them.
    row[column] = value === "" && field !== "bio" ? null : value;
  }
  return row;
}

const byUser = (userId) => `user_id=eq.${encodeURIComponent(userId)}`;

// A unique-constraint violation on username means another player has it.
function explain(error) {
  if (
    error instanceof DataApiError &&
    error.code === "23505" &&
    /username/i.test(error.detail?.message ?? "")
  ) {
    return new DataApiError("That username is taken. Try another one.", {
      status: 409,
      code: error.code,
      field: "username",
    });
  }
  return error;
}

// The avatar column is missing (42703 on read, PGRST204 on write).
function isMissingAvatar(error) {
  return (
    error instanceof DataApiError &&
    ["42703", "PGRST204"].includes(error.code) &&
    /avatar/i.test(error.detail?.message ?? "")
  );
}

// `stored` is false when the profiles table doesn't exist on this branch;
// `exists` says whether the signed-in user already has a row;
// `avatarStored` is false until the avatar column exists.
export function createProfileApi(request, { gameApi = null } = {}) {
  let avatarColumn = true;

  // Runs `attempt(withAvatar)`, retrying once without the avatar column if
  // the database doesn't have it yet.
  async function withAvatarFallback(attempt) {
    try {
      return await attempt(avatarColumn);
    } catch (error) {
      if (!avatarColumn || !isMissingAvatar(error)) throw error;
      avatarColumn = false;
      return attempt(false);
    }
  }

  return {
    async load(userId) {
      try {
        const rows = await withAvatarFallback((withAvatar) =>
          request(
            `profiles?${byUser(userId)}&select=${SELECT}${withAvatar ? ",avatar" : ""}`,
          ),
        );
        const base = { stored: true, avatarStored: avatarColumn };
        let gameProfiles;
        if (gameApi) {
          try {
            gameProfiles = await gameApi.load(userId);
            base.gameProfilesStored = true;
          } catch (error) {
            if (!isMissingTable(error)) throw error;
            base.gameProfilesStored = false;
          }
        }
        const profile = rows?.[0] ? fromRow(rows[0]) : null;
        return rows?.[0]
          ? {
              ...base,
              exists: true,
              profile:
                gameProfiles === undefined
                  ? profile
                  : normalizeGameProfile({ ...profile, gameProfiles }),
            }
          : { ...base, exists: false, profile: null };
      } catch (error) {
        if (isMissingTable(error)) {
          return {
            stored: false,
            avatarStored: false,
            exists: false,
            profile: null,
          };
        }
        throw error;
      }
    },
    // A plain insert needs only INSERT permission: no read-back, no upsert.
    // Optional fields get empty values in case their columns are NOT NULL.
    // display_name mirrors the Neon Auth name so other players can see it.
    async create(userId, displayName, profile) {
      if (gameApi && Array.isArray(profile.gameProfiles)) {
        return saveGames(userId, displayName, profile);
      }
      await withAvatarFallback((withAvatar) =>
        request("profiles", {
          method: "POST",
          body: {
            user_id: userId,
            ...toRow(
              displayName,
              { bio: "", roles: [], availability: [], ...profile },
              withAvatar,
            ),
          },
          prefer: "return=minimal",
        }),
      ).catch((error) => {
        throw explain(error);
      });
    },
    // Reads back the row so an update that row-level security silently
    // filtered out (0 rows changed) is reported instead of looking saved.
    async update(userId, displayName, profile) {
      if (gameApi && Array.isArray(profile.gameProfiles)) {
        return saveGames(userId, displayName, profile);
      }
      const rows = await withAvatarFallback((withAvatar) =>
        request(`profiles?${byUser(userId)}&select=user_id`, {
          method: "PATCH",
          body: toRow(displayName, profile, withAvatar),
          prefer: "return=representation",
        }),
      ).catch((error) => {
        throw explain(error);
      });
      if (!rows?.length) {
        throw new DataApiError(
          "The database didn’t allow this change. Please contact the site owner.",
          { status: 403, code: "NO_ROWS_UPDATED" },
        );
      }
    },
  };

  async function saveGames(userId, displayName, profile) {
    try {
      const row = toRow(displayName, normalizeGameProfile(profile), true);
      // Membership is maintained transactionally by user_games, not a second
      // writable copy of the game's fields in p_profile.
      delete row.games;
      await request("rpc/save_player_profile", {
        method: "POST",
        body: {
          p_user_id: userId,
          p_profile: row,
          p_games: profile.gameProfiles.map((entry) => gameInput(entry)),
        },
      });
    } catch (error) {
      // A failed atomic save must never fall back to a partial legacy save.
      throw explain(error);
    }
  }
}
