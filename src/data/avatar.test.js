import assert from "node:assert/strict";
import test from "node:test";
import {
  avatarFor,
  DEFAULT_AVATAR,
  normalizeAvatar,
  randomAvatar,
} from "./avatar.js";

test("saved avatars keep known values and drop unknown ones", () => {
  assert.deepEqual(
    normalizeAvatar({
      body: "#8b6cff",
      head: "crown",
      eyes: "laser",
      outfit: "cape",
      extra: "<script>",
    }),
    { ...DEFAULT_AVATAR, body: "#8b6cff", head: "crown", outfit: "cape" },
  );
  assert.equal(normalizeAvatar(null), null);
  assert.equal(normalizeAvatar("orange"), null);
  assert.equal(normalizeAvatar({ body: "red" }).body, DEFAULT_AVATAR.body);
});

test("players without an avatar get a stable, valid one", () => {
  const first = avatarFor("user-123");
  assert.deepEqual(first, avatarFor("user-123"));
  assert.deepEqual(normalizeAvatar(first), first);
  assert.notDeepEqual(avatarFor("user-123"), avatarFor("user-456"));
  for (let i = 0; i < 20; i += 1) {
    const avatar = randomAvatar();
    assert.deepEqual(normalizeAvatar(avatar), avatar);
  }
});
