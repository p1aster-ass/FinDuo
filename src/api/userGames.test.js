import test from "node:test";
import assert from "node:assert/strict";
import { createUserGamesApi } from "./userGames.js";
import { DataApiError } from "./dataApi.js";
import { gameProfilesFor, projectGameProfile } from "../lib/gameProfiles.js";

test("a missing requested game never borrows a different game's rank", () => {
  const projected = projectGameProfile({ gameProfiles: [{ game: "valorant", rank: "Diamond", region: "eu", roles: ["Controller"] }] }, "cs2");
  assert.equal(projected.rank, "");
  assert.equal(projected.region, "");
  assert.deepEqual(projected.roles, []);
});

test("legacy games inherit preferences without mutating the profile", () => {
  const legacy = {
    games: ["valorant", "lol", "valorant"],
    rank: "Gold",
    region: "eu",
    roles: ["Support"],
  };
  const games = gameProfilesFor(legacy);
  assert.equal(games.length, 2);
  assert.deepEqual(games[1], {
    game: "lol",
    rank: "Gold",
    region: "eu",
    roles: ["Support"],
    platform: null,
    verified: false,
  });
  games[1].roles.push("Flex");
  assert.deepEqual(legacy.roles, ["Support"]);
});

test("empty migrated games stay empty and game projection uses the selected game", () => {
  assert.deepEqual(gameProfilesFor({ games: ["lol"], gameProfiles: [] }), []);
  const profile = {
    games: ["lol"],
    rank: "Gold",
    gameProfiles: [
      { game: "lol", rank: "Silver", region: "eu", roles: ["Support"] },
      { game: "cs2", rank: "12000", region: "na-east", roles: [] },
    ],
  };
  assert.equal(projectGameProfile(profile, "cs2").rank, "12000");
  assert.deepEqual(projectGameProfile(profile).games, ["lol", "cs2"]);
  assert.equal(profile.rank, "Gold");
});

test("game API loads a user and whitelists editable fields", async () => {
  const calls = [];
  const api = createUserGamesApi(async (path, options) => {
    calls.push({ path, ...options });
    return [{ id: "g1", game: "lol" }];
  });
  assert.equal((await api.load("u1"))[0].game, "lol");
  await api.add("u1", {
    game: "lol",
    rank: "Gold",
    verified: true,
    user_id: "u2",
    id: "forged",
  });
  assert.match(calls[0].path, /user_id=eq.u1/);
  assert.equal(calls[1].body.user_id, "u1");
  assert.equal(calls[1].body.verified, undefined);
  assert.equal(calls[1].body.id, undefined);
  await api.update("u1", "g1", { rank: "Silver", game: "cs2", verified: true });
  assert.deepEqual(calls[2].body, { rank: "Silver" });
  assert.match(calls[2].path, /user_id=eq.u1&id=eq.g1/);
  await api.remove("u1", "g1");
  assert.equal(calls[3].method, "DELETE");
});

test("zero-row writes fail, and network/auth errors are never legacy fallbacks", async () => {
  const api = createUserGamesApi(async () => []);
  await assert.rejects(api.update("u1", "g1", { rank: "Gold" }), {
    code: "NO_ROWS_UPDATED",
  });
  await assert.rejects(api.remove("u1", "g1"), { code: "NO_ROWS_UPDATED" });
  const error = new DataApiError("denied", { status: 403 });
  await assert.rejects(
    createUserGamesApi(async () => {
      throw error;
    }).load("u1"),
    error,
  );
});
