// Usernames are unique handles (public.profiles.username is required).
// 3–20 characters: lowercase letters, numbers, and underscores.
export const USERNAME_MAX = 20;

export function normalizeUsername(value = "") {
  return value.trim().toLowerCase();
}

export function usernameError(value) {
  const name = normalizeUsername(value);
  if (!name) return "Choose a username.";
  if (name.length < 3) return "Use at least 3 characters.";
  if (name.length > USERNAME_MAX) {
    return `Use ${USERNAME_MAX} characters or fewer.`;
  }
  if (!/^[a-z0-9_]+$/.test(name)) {
    return "Use only letters, numbers, and underscores.";
  }
  return "";
}

// A starting suggestion from the display name; empty if it can't make a valid one.
export function suggestUsername(displayName = "") {
  const base = displayName
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, USERNAME_MAX);
  return usernameError(base) ? "" : base;
}
