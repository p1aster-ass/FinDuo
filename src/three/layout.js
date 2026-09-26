import * as THREE from "three";

// Scene layout shared by the 3D scenes and the camera. Units are meters-ish.

// The Gameboy stands on the attic's low table, leaning back a little.
export const GAMEBOY = {
  position: [0, 0.93, 0.5],
  rotation: [-0.28, 0, 0],
  scale: 0.55,
  // Screen center and facing direction in the Gameboy's own space.
  screenCenter: [0, 0.37, 0.17],
};

function gameboyScreenShot(distance) {
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...GAMEBOY.position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...GAMEBOY.rotation)),
    new THREE.Vector3(GAMEBOY.scale, GAMEBOY.scale, GAMEBOY.scale),
  );
  const center = new THREE.Vector3(...GAMEBOY.screenCenter).applyMatrix4(
    matrix,
  );
  const normal = new THREE.Vector3(0, 0, 1)
    .applyEuler(new THREE.Euler(...GAMEBOY.rotation))
    .normalize();
  const position = center.clone().addScaledVector(normal, distance);
  return { position: position.toArray(), target: center.toArray() };
}

// Camera shots: where the camera sits and what it looks at.
export const SHOTS = {
  attic: { position: [0, 2.05, 5.6], target: [0, 1.05, 0] },
  gameboy: gameboyScreenShot(1.05),
  // Pushed right into the screen when entering the lobby.
  gameboyEnter: gameboyScreenShot(0.28),
  // The studio is shifted so the avatar sits left of the wardrobe panel.
  studio: {
    position: [1.4, 1.55, 5.6],
    target: [1.4, 0.9, 0],
    parallax: 0.15,
  },
  // Phones: the wardrobe sits below, so the avatar goes up top.
  studioNarrow: {
    position: [0, 1, 7.2],
    target: [0, -0.6, 0],
    parallax: 0.1,
  },
  lobby: { position: [0, 2.3, 5.4], target: [0, 1.35, -2] },
  // Shifted left so the room sits right of the player list.
  room: { position: [-1.5, 3.4, 7.4], target: [-0.7, 0.7, -0.9] },
};

export {
  clampLobby,
  clampRoom,
  doorPlacements,
  doorZones,
  followShot,
  lobbySpawn,
  ROOM_BOUNDS,
  ROOM_EXIT,
  ROOM_SPAWN,
} from "./spawns.js";
