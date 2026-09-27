import assert from "node:assert/strict";
import test from "node:test";
import {
  createGameDrafts,
  editGameDraft,
  toggleGameDraft,
  gameDraftPayload,
  gameRankError,
} from "./gameProfiles.js";
import { GAME_PROFILE_OPTIONS } from "../data/options.js";
import { createProfileApi } from "../api/profiles.js";

test("CS2 validates a Premier rating, not an inherited Valorant tier", () => {
  assert.equal(gameRankError({ game: "cs2", rank: "15000" }), "");
  assert.equal(gameRankError({ game: "cs2", rank: "Unranked" }), "");
  for (const rank of ["Ascendant", "-100", "1.5", ""]) {
    assert.ok(gameRankError({ game: "cs2", rank }));
  }
  assert.equal(gameDraftPayload([{game: "cs2", rank: "15,000", region: "eu", roles: [], platform: "PC"}])[0].rank, "15000");
});

const saved = {
  games: ["cs2"],
  rank: "Iron",
  region: "ap",
  roles: ["Global"],
  gameProfiles: [
    {
      id: "v",
      game: "valorant",
      rank: "Diamond",
      region: "eu",
      roles: ["Controller"],
      platform: "PC",
      verified: false,
    },
    {
      id: "l",
      game: "lol",
      rank: "Gold",
      region: "euw",
      roles: ["Jungle"],
      platform: "PC",
      verified: true,
    },
  ],
};

test("existing user_games rows populate independent drafts, ignoring global fields", () => {
  const drafts = createGameDrafts(saved);
  assert.deepEqual(
    drafts.map((g) => g.game),
    ["valorant", "lol"],
  );
  assert.equal(drafts[0].rank, "Diamond");
  assert.equal(drafts[1].rank, "Gold");
  assert.equal(drafts[1].region, "euw");
  assert.deepEqual(drafts[1].roles, ["Jungle"]);
  assert.equal(drafts[1].platform, "PC");
  drafts[0].roles.push("Initiator");
  assert.deepEqual(saved.gameProfiles[0].roles, ["Controller"]);
});

for (const [field, value] of [
  ["rank", "Radiant"],
  ["region", "na-east"],
  ["roles", ["Duelist"]],
  ["platform", "Xbox"],
]) {
  test(`editing Valorant ${field} does not change League or the saved row`, () => {
    const before = createGameDrafts(saved);
    const after = editGameDraft(before, "valorant", { [field]: value });
    assert.deepEqual(after[0][field], value);
    assert.deepEqual(after[1], before[1]);
    assert.deepEqual(before, createGameDrafts(saved));
  });
}

test("adding creates a blank game and removing only removes that game locally", () => {
  const before = createGameDrafts(saved);
  const added = toggleGameDraft(before, "cs2");
  assert.deepEqual(added[2], {
    game: "cs2",
    rank: "",
    region: "",
    roles: [],
    platform: "",
  });
  const changed = editGameDraft(added, "cs2", {
    rank: "15,000",
    region: "eu",
    roles: ["AWPer"],
    platform: "PC",
  });
  const removed = toggleGameDraft(changed, "valorant");
  assert.deepEqual(
    removed.map((g) => g.game),
    ["lol", "cs2"],
  );
  assert.equal(removed[1].rank, "15,000");
  assert.deepEqual(
    saved.gameProfiles.map((g) => g.game),
    ["valorant", "lol"],
  );
  assert.equal(toggleGameDraft(removed, "valorant")[2].rank, "");
});

test("empty migrated rows stay empty despite legacy game membership", () => {
  assert.deepEqual(createGameDrafts({ ...saved, gameProfiles: [] }), []);
});

test("rank options are specific to Valorant and League; CS2 uses Premier rating", () => {
  assert.ok(GAME_PROFILE_OPTIONS.valorant.ranks.includes("Radiant"));
  assert.ok(!GAME_PROFILE_OPTIONS.valorant.ranks.includes("Emerald"));
  assert.ok(GAME_PROFILE_OPTIONS.lol.ranks.includes("Emerald"));
  assert.ok(GAME_PROFILE_OPTIONS.lol.ranks.includes("Challenger"));
  assert.ok(!GAME_PROFILE_OPTIONS.lol.ranks.includes("Ascendant"));
  assert.ok(!GAME_PROFILE_OPTIONS.lol.ranks.includes("Radiant"));
  assert.equal(GAME_PROFILE_OPTIONS.cs2.rankLabel, "Premier rating");
  assert.equal(GAME_PROFILE_OPTIONS.cs2.ranks, undefined);
  assert.ok(GAME_PROFILE_OPTIONS.lol.regions.some((r) => r.id === "euw"));
});

test("save sends separate values in one atomic call and omits locally removed games", async () => {
  let drafts = createGameDrafts(saved);
  drafts = toggleGameDraft(drafts, "cs2");
  drafts = editGameDraft(drafts, "cs2", {
    rank: "15,000",
    region: "eu",
    roles: [" AWPer "],
    platform: "PC",
  });
  const payload = gameDraftPayload(drafts);
  assert.deepEqual(
    payload.map((g) => g.rank),
    ["Diamond", "Gold", "15000"],
  );
  assert.deepEqual(
    payload.map((g) => g.roles),
    [["Controller"], ["Jungle"], ["AWPer"]],
  );
  const calls = [];
  const api = createProfileApi(
    async (path, options) => {
      calls.push({ path, ...options });
    },
    { gameApi: {} },
  );
  await api.update("u1", "Player", {
    username: "player",
    gameProfiles: gameDraftPayload(toggleGameDraft(drafts, "cs2")),
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "rpc/save_player_profile");
  assert.deepEqual(calls[0].body.p_games, payload.slice(0, 2));
  assert.equal(payload[0].id, undefined);
  assert.equal(payload[1].verified, undefined);
});
