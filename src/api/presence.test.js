import assert from "node:assert/strict";
import test from "node:test";
import { DataApiError } from "./dataApi.js";
import { createPresenceApi, toPlayer } from "./presence.js";

const NOW = Date.parse("2026-09-26T12:00:00Z");

test("touch calls the presence function and reports when it's missing", async () => {
  let call;
  const api = createPresenceApi(async (path, options) => {
    call = { path, options };
    return null;
  });
  assert.equal(await api.touch(), true);
  assert.equal(call.path, "rpc/touch_presence");
  assert.equal(call.options.method, "POST");

  const missing = createPresenceApi(async () => {
    throw new DataApiError("x", { status: 404, code: "PGRST202" });
  });
  assert.equal(await missing.touch(), false);

  const offline = createPresenceApi(async () => {
    throw new DataApiError("offline");
  });
  await assert.rejects(offline.touch(), /offline/);
});

test("online players share a game, exclude me, and were seen recently", async () => {
  let path;
  const api = createPresenceApi(async (p) => {
    path = p;
    return [
      {
        user_id: "u2",
        display_name: "Kestrel",
        username: "kestrel",
        games: ["valorant"],
        comm_styles: ["mic"],
        last_seen_at: "2026-09-26T11:58:00Z",
      },
    ];
  });
  const result = await api.players({
    games: ["valorant", "cs2"],
    excludeUserId: "u1",
    now: NOW,
  });
  assert.match(path, /games=ov\.\{valorant,cs2\}/);
  assert.match(path, /user_id=neq\.u1/);
  assert.match(path, /last_seen_at=gte\.2026-09-26T11%3A55%3A00\.000Z/);
  assert.match(path, /order=last_seen_at\.desc/);
  assert.equal(result.presence, true);
  assert.equal(result.players[0].name, "Kestrel");
  assert.equal(result.players[0].online, true);
  assert.equal(result.players[0].lastSeen, 2);
  assert.deepEqual(result.players[0].comms, ["mic"]);
});

test("without presence set up, rooms fall back to everyone who plays", async () => {
  const paths = [];
  const api = createPresenceApi(async (p) => {
    paths.push(p);
    if (p.includes("last_seen_at")) {
      throw new DataApiError("x", { status: 400, code: "42703" });
    }
    return [{ user_id: "u3", username: "rook", games: ["cs2"] }];
  });
  const result = await api.players({ games: ["cs2"], excludeUserId: "u1" });
  assert.equal(result.presence, false);
  assert.equal(paths.length, 2);
  assert.doesNotMatch(paths[1], /last_seen_at/);
  assert.equal(result.players[0].name, "rook");
  assert.equal(result.players[0].online, false);
});

test("no games means no query", async () => {
  const api = createPresenceApi(async () => assert.fail("no request"));
  assert.deepEqual(await api.players({ games: [], excludeUserId: "u1" }), {
    presence: true,
    players: [],
  });
});

test("rows map to the player shape used by match scoring", () => {
  const player = toPlayer(
    { user_id: "u9", username: "vex", last_seen_at: null },
    NOW,
  );
  assert.equal(player.name, "vex");
  assert.equal(player.online, false);
  assert.equal(player.lastSeen, null);
  assert.deepEqual(player.games, []);
});
