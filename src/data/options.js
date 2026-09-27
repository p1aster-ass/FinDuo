// `color` is each game's signature: its onboarding card, lobby door, and room.
export const GAMES = [
  {
    id: "valorant",
    name: "Valorant",
    tag: "VAL",
    genre: "Tactical shooter",
    color: "#ff6fa8",
  },
  {
    id: "cs2",
    name: "Counter-Strike 2",
    tag: "CS2",
    genre: "Tactical shooter",
    color: "#ffc53d",
  },
  {
    id: "lol",
    name: "League of Legends",
    tag: "LoL",
    genre: "MOBA",
    color: "#8b6cff",
  },
  {
    id: "overwatch2",
    name: "Overwatch 2",
    tag: "OW2",
    genre: "Hero shooter",
    color: "#ff6d00",
  },
  {
    id: "apex",
    name: "Apex Legends",
    tag: "APX",
    genre: "Battle royale",
    color: "#ff5a5a",
  },
  {
    id: "r6siege",
    name: "Rainbow Six Siege",
    tag: "R6S",
    genre: "Tactical shooter",
    color: "#4d9dff",
  },
  {
    id: "rocketleague",
    name: "Rocket League",
    tag: "RL",
    genre: "Vehicle soccer",
    color: "#2ec4a0",
  },
  {
    id: "fortnite",
    name: "Fortnite",
    tag: "FN",
    genre: "Battle royale",
    color: "#b86cff",
  },
];

export const REGIONS = [
  { id: "eu", label: "EU", detail: "Europe" },
  { id: "na-east", label: "NA East", detail: "North America East" },
  { id: "na-west", label: "NA West", detail: "North America West" },
  { id: "ap", label: "AP", detail: "Asia-Pacific" },
  { id: "oce", label: "OCE", detail: "Oceania" },
];

export const RANKS = [
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Ascendant",
  "Immortal",
];

// Per-game form options. RANKS above is retained only for legacy profile
// compatibility. Games without a configured ladder use a free-text rank.
export const GAME_PROFILE_OPTIONS = {
  valorant: {
    rankType: "select",
    ranks: [
      "Iron",
      "Bronze",
      "Silver",
      "Gold",
      "Platinum",
      "Diamond",
      "Ascendant",
      "Immortal",
      "Radiant",
      "Unranked",
    ],
    regions: REGIONS,
    rolesPlaceholder: "Controller, Duelist, Initiator, Sentinel",
  },
  lol: {
    rankType: "select",
    ranks: [
      "Iron",
      "Bronze",
      "Silver",
      "Gold",
      "Platinum",
      "Emerald",
      "Diamond",
      "Master",
      "Grandmaster",
      "Challenger",
      "Unranked",
    ],
    regions: [
      { id: "euw", label: "EUW" },
      { id: "eune", label: "EUNE" },
      { id: "na", label: "NA" },
      { id: "kr", label: "KR" },
      { id: "jp", label: "JP" },
      { id: "br", label: "BR" },
      { id: "lan", label: "LAN" },
      { id: "las", label: "LAS" },
      { id: "oce", label: "OCE" },
    ],
    rolesPlaceholder: "Top, Jungle, Mid, ADC, Support",
  },
  cs2: {
    rankType: "rating",
    rankLabel: "Premier rating",
    rankPlaceholder: "15000 or Unranked",
    regions: REGIONS,
    rolesPlaceholder: "AWPer, Entry fragger, Support, IGL, Lurker",
  },
};

// Unsupported ladders deliberately accept game-specific text, never Valorant
// tiers. Extend GAME_PROFILE_OPTIONS when a game's ladder is configured.
export const DEFAULT_GAME_PROFILE_OPTIONS = {
  rankType: "text",
  rankLabel: "Rank / rating",
  regions: REGIONS,
};

// Opposing styles can't both be picked; choosing one drops the other.
export const COMM_STYLES = [
  { id: "mic", label: "Mic Required", icon: "mic", excludes: "ping" },
  { id: "ping", label: "Ping Only", icon: "ping", excludes: "mic" },
  {
    id: "chill",
    label: "Chill / Casual",
    icon: "chill",
    excludes: "competitive",
  },
  {
    id: "competitive",
    label: "Highly Competitive",
    icon: "flame",
    excludes: "chill",
  },
];

export const ROLES = [
  "Entry fragger",
  "Support",
  "Shotcaller (IGL)",
  "Flex",
  "Anchor",
  "Lurker",
];

export const AVAILABILITY = [
  { id: "weekday-evenings", label: "Weekday evenings" },
  { id: "late-nights", label: "Late nights" },
  { id: "weekend-days", label: "Weekend days" },
  { id: "weekend-nights", label: "Weekend nights" },
];

const byId = (list) => Object.fromEntries(list.map((item) => [item.id, item]));
export const GAME_BY_ID = byId(GAMES);
export const REGION_BY_ID = byId(REGIONS);
export const COMM_BY_ID = byId(COMM_STYLES);
export const AVAILABILITY_BY_ID = byId(AVAILABILITY);
