import test from "node:test";
import assert from "node:assert/strict";
import { createProfileApi } from "./profiles.js";
import {
  createUserGamesApi,
  GAME_PROFILE_EMBED,
  withGameProfiles,
} from "./userGames.js";
import { DataApiError } from "./dataApi.js";
import { toPeer } from "./world.js";
import { isProfileComplete, scoreMatch } from "../lib/match.js";

const legacy = {
  username: "player",
  games: ["lol", "cs2"],
  rank: "Gold",
  region: "eu",
  comm_styles: ["mic"],
  roles: ["Support"],
};
const entries = [
  { game: "lol", rank: "Silver", region: "eu", roles: ["Jungle"] },
  { game: "cs2", rank: "12000", region: "na-east", roles: ["AWPer"] },
];

test("profile load uses independent game rows without global gaming fields", async () => {
  const request = async (path) =>
    path.startsWith("user_games") ? entries : [legacy];
  const result = await createProfileApi(request, {
    gameApi: createUserGamesApi(request),
  }).load("u1");
  assert.equal(result.gameProfilesStored, true);
  for (const field of ["rank", "region", "roles", "platform"])
    assert.equal(Object.hasOwn(result.profile, field), false);
  assert.deepEqual(result.profile.gameProfiles, entries);
  assert.equal(isProfileComplete(result.profile), true);
  assert.equal(
    isProfileComplete({
      ...result.profile,
      gameProfiles: [entries[0], { game: "cs2" }],
    }),
    false,
  );
});

test("legacy fallback only applies to missing game table, never failed reads", async () => {
  const missing = new DataApiError("missing", { code: "PGRST205" });
  const api = createProfileApi(async () => [legacy], {
    gameApi: {
      load: async () => {
        throw missing;
      },
    },
  });
  const result = await api.load("u1");
  assert.equal(result.gameProfilesStored, false);
  assert.equal(result.profile.rank, "Gold");
  assert.equal(result.profile.gameProfiles, undefined);
  for (const error of [
    new DataApiError("offline"),
    new DataApiError("denied", { status: 403 }),
  ]) {
    await assert.rejects(
      createProfileApi(async () => [legacy], {
        gameApi: {
          load: async () => {
            throw error;
          },
        },
      }).load("u1"),
      error,
    );
  }
});

test("empty migrated profile does not fall back to legacy membership", async () => {
  const result = await createProfileApi(async () => [legacy], {
    gameApi: { load: async () => [] },
  }).load("u1");
  assert.deepEqual(result.profile.games, []);
  assert.equal(isProfileComplete(result.profile), false);
});

test("new account detects migrated schema before onboarding", async () => {
  const result = await createProfileApi(async () => [], {
    gameApi: { load: async () => [] },
  }).load("u1");
  assert.equal(result.exists, false);
  assert.equal(result.gameProfilesStored, true);
});

test("create and edit use one atomic RPC and omit protected game fields", async () => {
  const calls = [];
  const api = createProfileApi(
    async (path, options) => {
      calls.push({ path, ...options });
    },
    { gameApi: {} },
  );
  const profile = {
    username: "player",
    gameProfiles: [
      { ...entries[0], verified: true, user_id: "u2", id: "forged" },
    ],
  };
  await api.create("u1", "Player", profile);
  await api.update("u1", "Player", profile);
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.path, "rpc/save_player_profile");
    assert.equal(call.body.p_user_id, "u1");
    assert.deepEqual(call.body.p_games, [entries[0]]);
    for (const field of ["games", "rank", "region", "roles"])
      assert.equal(Object.hasOwn(call.body.p_profile, field), false);
  }
});

test("failed atomic RPC cannot fall back to a legacy save", async () => {
  let calls = 0;
  const api = createProfileApi(
    async () => {
      calls++;
      throw new DataApiError("missing", { code: "PGRST202" });
    },
    { gameApi: {} },
  );
  await assert.rejects(api.update("u1", "Player", { gameProfiles: entries }));
  assert.equal(calls, 1);
});

test("multiplayer card uses the rank and region for its room", () => {
  const peer = toPeer({
    user_id: "u1",
    room: "cs2",
    profile: { ...legacy, gameProfiles: entries },
  });
  assert.equal(peer.player.rank, "12000");
  assert.equal(peer.player.region, "na-east");
});

test("embedded game reads can use old schema without hiding auth failures", async () => {
  const paths = [];
  const read = withGameProfiles(async (path) => {
    paths.push(path);
    if (path.includes("user_games"))
      throw new DataApiError("missing", {
        code: "PGRST200",
        detail: { message: "No relationship to user_games" },
      });
    return [legacy];
  });
  assert.deepEqual(await read(`profiles?select=rank${GAME_PROFILE_EMBED}`), [
    legacy,
  ]);
  assert.equal(paths.length, 2);
  assert.equal(paths[1], "profiles?select=rank");
  const denied = withGameProfiles(async () => {
    throw new DataApiError("denied", { status: 403 });
  });
  await assert.rejects(
    denied(`profiles?select=rank${GAME_PROFILE_EMBED}`),
    /denied/,
  );
});

test("match comparisons use the same game and do not treat unknown ranks as equal", () => {
  const profile = {
    games: ["lol", "cs2"],
    gameProfiles: entries,
    commStyles: ["mic"],
  };
  const player = {
    games: ["cs2"],
    gameProfiles: [{ ...entries[1], rank: "18000" }],
    comms: ["mic"],
  };
  const result = scoreMatch(profile, player, "cs2");
  assert.equal(result.sameRegion, true);
  assert.equal(result.rankGap, null);
  assert.ok(!result.reasons.includes("Same rank"));
});

test("League matchmaking uses Emerald between Platinum and Diamond and ignores legacy membership", () => {
  const profile = { ...legacy, commStyles: ["mic"], games: ["cs2"], gameProfiles: [{ game: "lol", rank: "Emerald", region: "euw" }] };
  const player = { games: ["cs2"], comms: ["mic"], gameProfiles: [{ game: "lol", rank: "Diamond", region: "euw" }] };
  const match = scoreMatch(profile, player, "lol");
  assert.deepEqual(match.sharedGames, ["lol"]);
  assert.equal(match.rankGap, 1);
});
