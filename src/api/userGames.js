import { DataApiError } from "./dataApi.js";

export const USER_GAME_COLUMNS =
  "id,user_id,game,region,rank,roles,platform,verified,created_at,updated_at";
export const GAME_PROFILE_EMBED =
  ",gameProfiles:user_games(game,region,rank,roles,platform,verified)";

// Only a missing game table/relationship permits a legacy read. Authorization
// failures and connectivity errors must surface rather than hide new data.
export function withGameProfiles(request) {
  let available = true;
  return async (path) => {
    try {
      return await request(
        available ? path : path.replace(GAME_PROFILE_EMBED, ""),
      );
    } catch (error) {
      if (
        !available ||
        !(error instanceof DataApiError) ||
        !["PGRST200", "PGRST205", "42P01"].includes(error.code) ||
        !/user_games/.test(error.detail?.message ?? "")
      )
        throw error;
      available = false;
      return request(path.replace(GAME_PROFILE_EMBED, ""));
    }
  };
}
const EDITABLE = ["region", "rank", "roles", "platform"];
const byUser = (userId) => `user_id=eq.${encodeURIComponent(userId)}`;
const byId = (userId, id) =>
  `${byUser(userId)}&id=eq.${encodeURIComponent(id)}`;

export function gameInput(input, withGame = true) {
  return Object.fromEntries(
    (withGame ? ["game", ...EDITABLE] : EDITABLE)
      .filter((key) => input[key] !== undefined)
      .map((key) => [key, input[key] === "" ? null : input[key]]),
  );
}

function changed(rows) {
  if (!rows?.length)
    throw new DataApiError(
      "This game could not be saved. Reload your profile and try again.",
      { status: 403, code: "NO_ROWS_UPDATED" },
    );
  return rows[0];
}

export function createUserGamesApi(request) {
  return {
    async load(userId) {
      return (
        (await request(
          `user_games?${byUser(userId)}&select=${USER_GAME_COLUMNS}&order=created_at.asc,game.asc`,
        )) ?? []
      );
    },
    async add(userId, input) {
      return changed(
        await request("user_games", {
          method: "POST",
          body: { ...gameInput(input), user_id: userId },
          prefer: "return=representation",
        }),
      );
    },
    async update(userId, id, input) {
      return changed(
        await request(`user_games?${byId(userId, id)}`, {
          method: "PATCH",
          body: gameInput(input, false),
          prefer: "return=representation",
        }),
      );
    },
    async remove(userId, id) {
      return changed(
        await request(`user_games?${byId(userId, id)}`, {
          method: "DELETE",
          prefer: "return=representation",
        }),
      );
    },
  };
}
