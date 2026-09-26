import assert from "node:assert/strict";
import test from "node:test";
import { latestBubbles, wrapText } from "./chat.js";

test("short messages stay on one line", () => {
  assert.deepEqual(wrapText("gg wp"), ["gg wp"]);
});

test("long messages wrap between words and cap at three lines", () => {
  assert.deepEqual(wrapText("anyone want to duo ranked tonight after nine"), [
    "anyone want to duo",
    "ranked tonight after",
    "nine",
  ]);
  const lines = wrapText("word ".repeat(40));
  assert.equal(lines.length, 3);
  assert.match(lines[2], /…$/);
});

test("very long words are split", () => {
  assert.deepEqual(wrapText("a".repeat(30), 22), ["a".repeat(22), "a".repeat(8)]);
});

test("bubbles show each person's newest recent message", () => {
  const now = 100_000;
  const bubbles = latestBubbles(
    [
      { userId: "u1", body: "old", seenAt: now - 9000 },
      { userId: "u2", body: "hi", seenAt: now - 2000 },
      { userId: "u2", body: "gg", seenAt: now - 1000 },
    ],
    now,
  );
  assert.deepEqual(bubbles, { u2: "gg" });
});
