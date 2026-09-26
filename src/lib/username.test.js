import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeUsername,
  suggestUsername,
  usernameError,
} from "./username.js";

test("usernames are trimmed and lowercased", () => {
  assert.equal(normalizeUsername("  Ember_99 "), "ember_99");
});

test("usernames must be 3–20 letters, numbers, or underscores", () => {
  assert.equal(usernameError("ember_99"), "");
  assert.match(usernameError(""), /Choose a username/);
  assert.match(usernameError("ab"), /at least 3/);
  assert.match(usernameError("a".repeat(21)), /20 characters or fewer/);
  assert.match(usernameError("ember!"), /letters, numbers, and underscores/);
  assert.match(usernameError("em ber"), /letters, numbers, and underscores/);
});

test("suggestions come from the display name and are always valid or empty", () => {
  assert.equal(suggestUsername("Ember Fox"), "ember_fox");
  assert.equal(suggestUsername("  Zoë!! Quinn "), "zoe_quinn");
  assert.equal(suggestUsername("Al"), "");
  assert.equal(suggestUsername("李"), "");
  assert.equal(suggestUsername("a".repeat(30)).length, 20);
});
