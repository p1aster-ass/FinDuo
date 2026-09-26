import assert from "node:assert/strict";
import test from "node:test";
import { DataApiError } from "./dataApi.js";
import { createWorldApi, toPeer, WorldUnavailableError } from "./world.js";

const NOW = Date.parse("2026-09-26T12:00:00Z");

test("moving upserts your own position, rounded, with the room", async () => {
  let call;
  const api = createWorldApi(async (path, options) => {
    call = { path, options };
    return null;
  });
  await api.move("u1", {
    room: "valorant",
    x: 1.23456,
    z: -2.5,
    facing: 3.14159,
  });
  assert.equal(call.path, "world_positions?on_conflict=user_id");
  assert.match(call.options.prefer, /merge-duplicates/);
  assert.deepEqual(call.options.body, {
    user_id: "u1",
    room: "valorant",
    x: 1.23,
    z: -2.5,
    facing: 3.14,
    emote: null,
    emote_at: null,
  });
});

test("peers are fresh players in the room, excluding you, with profiles", async () => {
  let path;
  const api = createWorldApi(async (p) => {
    path = p;
    return [
      {
        user_id: "u2",
        room: "lobby",
        x: 2,
        z: 1,
        facing: 0.5,
        emote: "jump",
        emote_at: "2026-09-26T11:59:59Z",
        updated_at: "2026-09-26T11:59:58Z",
        profile: {
          display_name: "Kestrel",
          avatar: { body: "#8b6cff", head: "crown" },
          games: ["cs2"],
        },
      },
    ];
  });
  const [peer] = await api.peers("lobby", "u1", NOW);
  assert.match(path, /room=eq\.lobby/);
  assert.match(path, /user_id=neq\.u1/);
  assert.match(path, /updated_at=gte\.2026-09-26T11%3A59%3A45\.000Z/);
  assert.match(path, /profile:profiles\(/);
  assert.equal(peer.player.name, "Kestrel");
  assert.equal(peer.avatar.head, "crown");
  assert.equal(peer.emote, "jump");
  assert.equal(peer.player.online, true);
});

test("room counts tally fresh positions per room", async () => {
  const api = createWorldApi(async () => [
    { room: "lobby" },
    { room: "valorant" },
    { room: "valorant" },
  ]);
  assert.deepEqual(await api.roomCounts(NOW), { lobby: 1, valorant: 2 });
});

test("chat trims and caps messages, and maps authors", async () => {
  const calls = [];
  const api = createWorldApi(async (path, options) => {
    calls.push({ path, options });
    if (options?.method === "POST") return null;
    return [
      {
        id: 7,
        user_id: "u2",
        body: "gg",
        created_at: "2026-09-26T11:59:00Z",
        author: { username: "rook" },
      },
    ];
  });
  await api.say("lobby", `  ${"a".repeat(250)}  `);
  assert.equal(calls[0].options.body.body.length, 200);
  await api.say("lobby", "   ");
  assert.equal(calls.length, 1, "blank messages aren't sent");
  const messages = await api.messages("lobby", {
    afterId: 5,
    fromTime: NOW - 60_000,
  });
  assert.match(calls[1].path, /id=gt\.5/);
  assert.deepEqual(messages[0], {
    id: 7,
    userId: "u2",
    body: "gg",
    name: "rook",
    at: Date.parse("2026-09-26T11:59:00Z"),
  });
});

test("missing tables mean multiplayer is unavailable; rate limits read clearly", async () => {
  const missing = createWorldApi(async () => {
    throw new DataApiError("x", { status: 404, code: "PGRST205" });
  });
  await assert.rejects(missing.peers("lobby", "u1"), WorldUnavailableError);
  const limited = createWorldApi(async () => {
    throw new DataApiError("x", { status: 400, code: "P0001" });
  });
  await assert.rejects(limited.say("lobby", "hi"), /too fast/);
});

test("invites: send, list with names, and answer", async () => {
  const calls = [];
  const api = createWorldApi(async (path, options) => {
    calls.push({ path, options });
    if (options?.method === "POST") return [{ id: "room-1" }];
    if (options?.method === "PATCH") return [{ id: "room-1", status: "accepted" }];
    return [
      {
        id: "room-1",
        created_by: "u1",
        invitee: "u2",
        status: "pending",
        inviter: { display_name: "Ember" },
        guest: { username: "rook" },
      },
    ];
  });
  assert.equal(await api.invite("u2"), "room-1");
  assert.deepEqual(calls[0].options.body, { invitee: "u2" });
  const [invite] = await api.invites(NOW);
  assert.match(calls[1].path, /private_rooms_created_by_fkey/);
  assert.equal(invite.fromName, "Ember");
  assert.equal(invite.toName, "rook");
  assert.equal(await api.answer("room-1", "accepted"), true);
  assert.equal(calls[2].path, "private_rooms?id=eq.room-1&select=id,status");
  assert.equal(calls[2].options.prefer, "return=representation");
  assert.deepEqual(calls[2].options.body, { status: "accepted" });
});

test("peer rows without a saved avatar get null (drawn from their id later)", () => {
  const peer = toPeer({ user_id: "u3", room: "lobby", profile: {} }, NOW);
  assert.equal(peer.avatar, null);
  assert.equal(peer.player.name, "Player");
});
