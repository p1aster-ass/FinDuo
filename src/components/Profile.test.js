import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const rows = [
  { game: "valorant", rank: "Diamond", region: "eu", roles: ["Controller"], platform: "PC" },
  { game: "lol", rank: "Gold", region: "euw", roles: ["Jungle"], platform: "PC" },
  { game: "cs2", rank: "15000", region: "na-east", roles: ["AWPer"], platform: "PC" },
  { game: "fortnite", rank: "Elite", region: "oce", roles: ["Builder"], platform: "Xbox" },
  { game: "rocketleague", rank: "Champion", region: "na-west", roles: ["Defender"], platform: "PlayStation" },
];

test("actual Profile renders five independent rows and ignores every legacy global field", async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: "custom" });
  try {
    const { default: Profile } = await server.ssrLoadModule("/src/components/Profile.jsx");
    const html = renderToStaticMarkup(createElement(Profile, {
      user: { displayName: "Player" },
      profile: { username: "player", games: ["apex"], rank: "Ascendant", region: "legacy-region", roles: ["Legacy role"], commStyles: ["mic"], gameProfiles: rows },
    }));
    const rendered = [...html.matchAll(/<li[^>]*data-game="([^"]+)"[\s\S]*?<\/li>/g)];
    assert.equal(rendered.length, 5);
    for (const row of rows) {
      const card = rendered.find((entry) => entry[1] === row.game)?.[0];
      assert.ok(card, row.game);
      for (const value of [row.rank, row.roles[0], row.platform]) assert.ok(card.includes(value), value);
      for (const other of rows.filter((entry) => entry.game !== row.game)) assert.ok(!card.includes(other.rank));
    }
    assert.doesNotMatch(html, /Ascendant|legacy-region|Legacy role|Apex Legends/);
    assert.match(html, /Premier rating/);
    assert.match(html, /Europe/);
    assert.match(html, /EUW/);
  } finally { await server.close(); }
});

test("lobby PlayerCard displays each game's rows instead of an unlabeled global rank", async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: "custom" });
  try {
    const { default: PlayerCard } = await server.ssrLoadModule("/src/components/world/PlayerCard.jsx");
    const html = renderToStaticMarkup(createElement(PlayerCard, {
      player: { name: "Player", games: ["apex"], rank: "Ascendant", region: "legacy-region", roles: ["Legacy role"], comms: [], gameProfiles: rows },
      match: { score: 50, sharedGames: [], reasons: [] },
    }));
    for (const row of rows) assert.ok(html.includes(row.rank));
    assert.doesNotMatch(html, /Ascendant|legacy-region|Apex Legends/);
  } finally { await server.close(); }
});
