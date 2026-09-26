// Walking geometry: lobby doors, walls, trigger zones, and spawn points.
// No three.js import, so the page UI can use it without the 3D bundle.

// Doors spread along an arc facing the lobby's center.
export function doorPlacements(count) {
  const radius = 5.4;
  const center = [0, 0, 1.2];
  const step = count > 1 ? Math.min(0.42, 2.5 / (count - 1)) : 0;
  return Array.from({ length: count }, (_, index) => {
    const angle = (index - (count - 1) / 2) * step;
    return {
      position: [
        center[0] + Math.sin(angle) * radius,
        0,
        center[2] - Math.cos(angle) * radius,
      ],
      rotationY: -angle,
    };
  });
}

// Walking: walls, door zones, and spawn points ------------------------------

const LOBBY_CENTER = [0, 1.2];
const LOBBY_RADIUS = 6.3;

export function clampLobby(x, z) {
  const dx = x - LOBBY_CENTER[0];
  const dz = z - LOBBY_CENTER[1];
  const distance = Math.hypot(dx, dz);
  if (distance <= LOBBY_RADIUS) return [x, z];
  const scale = LOBBY_RADIUS / distance;
  return [LOBBY_CENTER[0] + dx * scale, LOBBY_CENTER[1] + dz * scale];
}

// A point `distance` in front of a door, toward the lobby's center.
function inFront(placement, distance) {
  const [x, , z] = placement.position;
  const dx = LOBBY_CENTER[0] - x;
  const dz = LOBBY_CENTER[1] - z;
  const length = Math.hypot(dx, dz);
  return { x: x + (dx / length) * distance, z: z + (dz / length) * distance };
}

// Walking into these zones enters the door's room.
export function doorZones(gameIds) {
  const placements = doorPlacements(gameIds.length);
  return gameIds.map((id, index) => ({
    id,
    radius: 0.75,
    ...inFront(placements[index], 0.8),
  }));
}

// Where you appear in the lobby: in front of the door you came out of, or
// near the entrance.
export function lobbySpawn(gameIds, fromRoom) {
  const index = gameIds.indexOf(fromRoom);
  if (index === -1) return { x: 0, z: 3.4, facing: Math.PI };
  const placement = doorPlacements(gameIds.length)[index];
  const spot = inFront(placement, 2.2);
  const facing = Math.atan2(
    spot.x - placement.position[0],
    spot.z - placement.position[2],
  );
  return { ...spot, facing };
}

export const ROOM_BOUNDS = { minX: -5.7, maxX: 5.7, minZ: -3.3, maxZ: 3.6 };

export function clampRoom(x, z) {
  return [
    Math.min(ROOM_BOUNDS.maxX, Math.max(ROOM_BOUNDS.minX, x)),
    Math.min(ROOM_BOUNDS.maxZ, Math.max(ROOM_BOUNDS.minZ, z)),
  ];
}

// The doorway back to the lobby, on the room's left wall.
export const ROOM_EXIT = { id: "exit", x: -5.55, z: 1.2, radius: 0.6 };
export const ROOM_SPAWN = { x: -4.4, z: 1.2, facing: Math.PI / 2 };

// Rooms follow the player with this camera offset.
export function followShot(x, z) {
  return {
    position: [x * 0.85, 4.4, z + 7],
    target: [x * 0.9, 0.9, z - 1.4],
  };
}
