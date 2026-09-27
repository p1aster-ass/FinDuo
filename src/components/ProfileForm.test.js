import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("rendered profile form shows one complete editable card per user_games row", async () => {
  const server = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  try {
    const { default: ProfileForm } = await server.ssrLoadModule(
      "/src/components/ProfileForm.jsx",
    );
    const html = renderToStaticMarkup(
      createElement(ProfileForm, {
        initialProfile: {
          username: "player",
          games: ["apex"],
          rank: "Iron",
          region: "ap",
          commStyles: ["mic"],
          gameProfiles: [
            {
              game: "valorant",
              rank: "Diamond",
              region: "eu",
              roles: ["Controller"],
              platform: "PC",
            },
            {
              game: "lol",
              rank: "Gold",
              region: "euw",
              roles: ["Jungle"],
              platform: "PC",
            },
            {
              game: "cs2",
              rank: "15,000",
              region: "eu",
              roles: ["AWPer"],
              platform: "PC",
            },
          ],
        },
        submitLabel: "Save",
        onSubmit: () => {},
      }),
    );
    const cards = [
      ...html.matchAll(
        /<fieldset[^>]*id="game-profile-([^"]+)"[\s\S]*?<\/fieldset>/g,
      ),
    ];
    assert.deepEqual(
      cards.map((c) => c[1]),
      ["valorant", "lol", "cs2"],
    );
    for (const card of cards) {
      for (const field of ["rank", "region", "roles", "platform"])
        assert.ok(card[0].includes(`name="${card[1]}.${field}"`));
    }
    assert.match(cards[0][0], /value="Diamond" selected=""/);
    assert.match(cards[1][0], /value="Gold" selected=""/);
    assert.match(cards[1][0], /value="euw"/);
    assert.match(cards[1][0], /value="Jungle"/);
    assert.match(cards[2][0], /value="15,000"/);
    assert.doesNotMatch(cards[1][0], /Ascendant|Radiant/);
    assert.doesNotMatch(cards[2][0], /<select|Ascendant|Radiant/);
    assert.doesNotMatch(html, /ob-active-game|name="rank"|name="region"/);
    assert.equal((html.match(/aria-label="Remove /g) ?? []).length, 3);
  } finally {
    await server.close();
  }
});
