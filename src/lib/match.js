import { COMM_BY_ID, GAME_BY_ID, RANKS } from "../data/options.js";

// Scores out of 100: games 40, region 25, rank 20, comm style 15.
export function scoreMatch(profile, player) {
  const sharedGames = player.games.filter((game) =>
    profile.games.includes(game),
  );
  const gameScore = sharedGames.length
    ? 25 + Math.min(sharedGames.length - 1, 2) * 7.5
    : 0;
  const sameRegion = player.region === profile.region;
  const rankGap = Math.abs(
    RANKS.indexOf(player.rank) - RANKS.indexOf(profile.rank),
  );
  const rankScore = Math.max(0, 20 - rankGap * 7);
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
        ? `Plays ${GAME_BY_ID[sharedGames[0]].name}`
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
      done: profile.roles?.length > 0,
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
  return Boolean(
    profile?.username &&
    profile.games?.length &&
    profile.region &&
    profile.rank &&
    profile.commStyles?.length,
  );
}
