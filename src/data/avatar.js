// Avatar wardrobe. The avatar is saved on the profile (profiles.avatar, jsonb)
// and drawn by src/three/Avatar.jsx.

export const AVATAR_COLORS = [
  "#ff6d00",
  "#ff5a5a",
  "#ff6fa8",
  "#b86cff",
  "#8b6cff",
  "#4d9dff",
  "#2ec4a0",
  "#8fd14f",
  "#ffc53d",
  "#fff3e3",
  "#3a3450",
];

export const AVATAR_PARTS = [
  {
    id: "pattern",
    label: "Pattern",
    options: [
      { id: "none", label: "Plain" },
      { id: "spots", label: "Spots" },
      { id: "stripes", label: "Stripes" },
      { id: "stars", label: "Stars" },
    ],
  },
  {
    id: "eyes",
    label: "Eyes",
    options: [
      { id: "round", label: "Round" },
      { id: "happy", label: "Happy" },
      { id: "sleepy", label: "Sleepy" },
      { id: "sparkle", label: "Sparkle" },
    ],
  },
  {
    id: "face",
    label: "Face",
    options: [
      { id: "none", label: "Nothing" },
      { id: "glasses", label: "Glasses" },
      { id: "shades", label: "Shades" },
      { id: "mustache", label: "Mustache" },
    ],
  },
  {
    id: "head",
    label: "Head",
    options: [
      { id: "none", label: "Nothing" },
      { id: "headset", label: "Headset" },
      { id: "cap", label: "Cap" },
      { id: "antenna", label: "Antenna" },
      { id: "crown", label: "Crown" },
      { id: "beanie", label: "Beanie" },
      { id: "bunny", label: "Bunny ears" },
    ],
  },
  {
    id: "outfit",
    label: "Outfit",
    options: [
      { id: "none", label: "Nothing" },
      { id: "scarf", label: "Scarf" },
      { id: "jersey", label: "Jersey" },
      { id: "cape", label: "Cape" },
    ],
  },
];

export const EMOTES = [
  { id: "jump", label: "Jump", key: "1" },
  { id: "spin", label: "Spin", key: "2" },
  { id: "dance", label: "Dance", key: "3" },
  { id: "heart", label: "Heart", key: "4" },
];

export const DEFAULT_AVATAR = {
  body: "#ff6d00",
  accent: "#8b6cff",
  pattern: "none",
  eyes: "round",
  face: "none",
  head: "headset",
  outfit: "none",
};

const PART_IDS = Object.fromEntries(
  AVATAR_PARTS.map((part) => [part.id, part.options.map((o) => o.id)]),
);

// Keeps only known values, so a bad or outdated saved avatar can't break
// rendering. Returns null for anything that isn't an object.
export function normalizeAvatar(value) {
  if (!value || typeof value !== "object") return null;
  const avatar = { ...DEFAULT_AVATAR };
  for (const key of ["body", "accent"]) {
    if (AVATAR_COLORS.includes(value[key])) avatar[key] = value[key];
  }
  for (const [part, ids] of Object.entries(PART_IDS)) {
    if (ids.includes(value[part])) avatar[part] = value[part];
  }
  return avatar;
}

function hash(text = "") {
  let result = 0;
  for (const char of text) result = (result * 31 + char.charCodeAt(0)) >>> 0;
  return result;
}

// A stable look for players who haven't designed an avatar yet.
export function avatarFor(id = "") {
  const seed = hash(id);
  const pick = (list, shift) => list[(seed >>> shift) % list.length];
  return {
    body: pick(AVATAR_COLORS.slice(0, 9), 0),
    accent: pick(AVATAR_COLORS, 4),
    pattern: pick(PART_IDS.pattern, 8),
    eyes: pick(PART_IDS.eyes, 11),
    face: "none",
    head: pick(PART_IDS.head, 14),
    outfit: pick(PART_IDS.outfit, 18),
  };
}

export function randomAvatar() {
  return avatarFor(String(Math.random()));
}
