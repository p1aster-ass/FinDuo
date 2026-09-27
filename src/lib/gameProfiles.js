import { GAME_PROFILE_OPTIONS } from "../data/options.js";

// An explicit empty array is authoritative; never resurrect deleted games.
export function gameProfilesFor(profile) {
  if (Array.isArray(profile?.gameProfiles)) return profile.gameProfiles;
  return [...new Set(profile?.games ?? [])].filter(Boolean).map((game) => ({
    game,
    region: profile.region || null,
    rank: profile.rank || null,
    roles: [...(profile.roles ?? [])],
    platform: null,
    verified: false,
  }));
}

// Migrated application state has no global gaming details. Membership is a
// derived convenience for room navigation; user_games owns every other field.
export function normalizeGameProfile(profile) {
  if (!Array.isArray(profile?.gameProfiles)) return profile;
  const next = { ...profile, games: profile.gameProfiles.map((entry) => entry.game) };
  for (const field of ["rank", "region", "roles", "platform"]) delete next[field];
  return next;
}

// Scalar compatibility is confined to a single-game view, never profile state.
export function projectGameProfile(profile, game) {
  const gameProfiles = gameProfilesFor(profile);
  const selected = game === undefined
    ? gameProfiles[0]
    : gameProfiles.find((entry) => entry.game === game);
  return {
    ...profile,
    gameProfiles,
    selectedGame: selected?.game ?? null,
    games: gameProfiles.map((entry) => entry.game),
    rank: selected?.rank ?? "",
    region: selected?.region ?? "",
    roles: selected?.roles ?? [],
    platform: selected?.platform ?? null,
  };
}

// Form drafts own their arrays and derive membership from user_games, not the
// legacy games list. New memberships start blank instead of inheriting rank.
export function createGameDrafts(profile) {
  return gameProfilesFor(profile).map((entry) => ({
    game: entry.game,
    rank: entry.rank ?? "",
    region: entry.region ?? "",
    roles: [...(entry.roles ?? [])],
    platform: entry.platform ?? "",
  }));
}

export function editGameDraft(drafts, game, changes) {
  return drafts.map((entry) =>
    entry.game === game
      ? {
          ...entry,
          ...changes,
          game,
          roles: [...(changes.roles ?? entry.roles)],
        }
      : entry,
  );
}

export function toggleGameDraft(drafts, game) {
  return drafts.some((entry) => entry.game === game)
    ? drafts.filter((entry) => entry.game !== game)
    : [...drafts, { game, rank: "", region: "", roles: [], platform: "" }];
}

export function gameDraftPayload(drafts) {
  return drafts.map((entry) => ({
    game: entry.game,
    rank: GAME_PROFILE_OPTIONS[entry.game]?.rankType === "rating"
      ? entry.rank.trim().replaceAll(",", "") || null
      : entry.rank.trim() || null,
    region: entry.region.trim() || null,
    roles: entry.roles.map((role) => role.trim()).filter(Boolean),
    platform: entry.platform.trim() || null,
  }));
}

export function gameRankError({ game, rank }) {
  const value = rank?.trim() ?? "";
  if (!value) return "Choose a rank or rating.";
  if (GAME_PROFILE_OPTIONS[game]?.rankType === "rating" &&
      value !== "Unranked" && !/^(\d+|\d{1,3}(,\d{3})+)$/.test(value))
    return "Enter a non-negative whole-number Premier rating, or Unranked.";
  return "";
}
