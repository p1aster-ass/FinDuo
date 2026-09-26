// Small world helpers with no three.js dependency, so the page UI can use
// them without pulling the 3D bundle into the first download.

// Toy colors for buddies (match src/index.css and three/palette.js).
export const BUDDY_COLORS = [
  "#ff6d00",
  "#8b6cff",
  "#2ec4a0",
  "#ff6fa8",
  "#4d9dff",
  "#ffc53d",
];

// A stable buddy color for a player id.
export function colorFor(id = "") {
  const sum = [...id].reduce((total, char) => total + char.charCodeAt(0), 0);
  return BUDDY_COLORS[sum % BUDDY_COLORS.length];
}

// How many players stand in a 3D room; the room list shows everyone.
export const ROOM_CAPACITY = 12;
