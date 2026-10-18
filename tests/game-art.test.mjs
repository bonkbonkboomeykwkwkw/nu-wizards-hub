import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { getGameArt } from "../lib/game-art.js";

test("supported games resolve to bundled artwork, including Roblox", () => {
  for (const [name, expected] of [
    ["Roblox", "/roblox-arena.webp"],
    ["ROBLOX tournament", "/roblox-arena.webp"],
    ["Valorant", "/valorant-arena.jpg"],
    ["Mobile Legends", "/mobile-legends-arena.jpg"],
    ["MLBB", "/mobile-legends-arena.jpg"],
  ]) {
    assert.equal(getGameArt(name), expected);
    assert.ok(existsSync(new URL(`../public${expected}`, import.meta.url)));
  }
});

test("unrecognized games do not show unrelated artwork", () => {
  assert.equal(getGameArt("Chess"), null);
  assert.equal(getGameArt(), null);
});
