import { COMM_BY_ID, GAME_BY_ID, GAME_PROFILE_OPTIONS, RANKS } from "../data/options.js";
import { gameProfilesFor, projectGameProfile } from "./gameProfiles.js";

// Scores out of 100: games 40, region 25, rank 20, comm style 15.
export function scoreMatch(profile, player, game) {
  const myGames = gameProfilesFor(profile).map((entry) => entry.game);
  const sharedGames = gameProfilesFor(player).map((entry) => entry.game)
    .filter((game) => myGames.includes(game));
  const gameScore = sharedGames.length
    ? 25 + Math.min(sharedGames.length - 1, 2) * 7.5
    : 0;
  const comparedGame = sharedGames.includes(game) ? game : sharedGames[0];
  const mine = projectGameProfile(profile, comparedGame);
  const theirs = projectGameProfile(player, comparedGame);
  const sameRegion = Boolean(
    comparedGame && mine.region && mine.region === theirs.region,
  );
  const ranks = GAME_PROFILE_OPTIONS[comparedGame]?.ranks ??
    (!profile.gameProfiles && !player.gameProfiles ? RANKS : []);
  const mineIndex = ranks.indexOf(mine.rank),
    theirIndex = ranks.indexOf(theirs.rank);
  // Unknown game ratings are not ordered on the old shared tier ladder.
  const rankGap =
    !comparedGame || !mine.rank || !theirs.rank
      ? null
      : mine.rank === theirs.rank
        ? 0
        : mineIndex >= 0 && theirIndex >= 0
          ? Math.abs(mineIndex - theirIndex)
          : null;
  const rankScore = rankGap === null ? 0 : Math.max(0, 20 - rankGap * 7);
  const sharedComms = player.comms.filter((style) =>
    profile.commStyles.includes(style),
  );
  const clashes = player.comms.filter((style) =>
    profile.commStyles.some((mine) => COMM_BY_ID[mine].excludes === style),
  );
  const commScore = Math.max(
    0,
    Math.min(15, 4 + sharedComms.length * 8 - clashes.length * 8),
  );

  const reasons = [];
  if (sharedGames.length) {
    reasons.push(
      sharedGames.length === 1
        ? `Plays ${GAME_BY_ID[sharedGames[0]]?.name ?? sharedGames[0]}`
        : `${sharedGames.length} games in common`,
    );
  }
  if (sameRegion) reasons.push("Same region");
  if (rankGap === 0) reasons.push("Same rank");
  else if (rankGap === 1) reasons.push("1 tier apart");
  sharedComms.forEach((style) => reasons.push(COMM_BY_ID[style].label));

  return {
    score: Math.round(
      gameScore + (sameRegion ? 25 : 0) + rankScore + commScore,
    ),
    sharedGames,
    rankGap,
    sameRegion,
    reasons,
  };
}

export function formatLastSeen(minutes) {
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

export function initials(name) {
  return (name || "P").trim().charAt(0).toUpperCase();
}

// Required onboarding fields make up 60%; the optional "About you" fields fill the rest.
export function profileStrength(profile) {
  const extras = [
    { done: Boolean(profile.bio?.trim()), weight: 15, tip: "Add a short bio" },
    {
      done: gameProfilesFor(profile).some((entry) => entry.roles?.length > 0),
      weight: 15,
      tip: "Pick your favorite roles",
    },
    {
      done: profile.availability?.length > 0,
      weight: 10,
      tip: "Share when you play",
    },
  ];
  return {
    percent:
      60 +
      extras.reduce((total, item) => total + (item.done ? item.weight : 0), 0),
    tips: extras.filter((item) => !item.done).map((item) => item.tip),
  };
}

// Onboarding is done once the username and four required sections are filled in.
export function isProfileComplete(profile) {
  const games = gameProfilesFor(profile);
  return Boolean(
    profile?.username &&
    games.length &&
    games.every((entry) => entry.region && entry.rank) &&
    profile.commStyles?.length,
  );
}
