// Where the signed-in player is and what they're doing. It changes every
// frame, so it lives outside React: the 3D controller writes it, and the
// avatar, camera, and multiplayer sync read it.
export const localPlayer = {
  x: 0,
  z: 3.4,
  facing: Math.PI,
  moving: false,
  emote: null,
  emoteAt: 0,
  target: null,
};

// Facing: 0 looks toward the camera (+z); Math.PI looks into the room (-z).
export function placePlayer(x, z, facing = Math.PI) {
  Object.assign(localPlayer, { x, z, facing, moving: false, target: null });
}

export function walkTo(x, z) {
  localPlayer.target = { x, z };
}

export function triggerEmote(id) {
  localPlayer.emote = id;
  localPlayer.emoteAt = Date.now();
}

// Where to appear in the next scene. Applied when that scene mounts (see
// World.jsx), so you don't jump while the old scene is still fading out.
let queuedSpawn = null;

export function queueSpawn(spawn) {
  queuedSpawn = spawn;
}

export function applyQueuedSpawn() {
  if (!queuedSpawn) return;
  placePlayer(queuedSpawn.x, queuedSpawn.z, queuedSpawn.facing);
  queuedSpawn = null;
}
