// Players you've blocked, remembered per account on this device. Their
// avatars, messages, and invites are hidden from you.
const storageKey = (userId) => `finduo-blocked-${userId}`;

export function loadBlocked(userId) {
  try {
    return new Set(
      JSON.parse(localStorage.getItem(storageKey(userId)) ?? "[]"),
    );
  } catch {
    return new Set();
  }
}

export function saveBlocked(userId, blocked) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...blocked]));
  } catch {
    // Storage can be unavailable (private mode); blocking still works this session.
  }
}
