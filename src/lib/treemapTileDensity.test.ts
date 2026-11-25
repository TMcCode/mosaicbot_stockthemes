import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import { densityForMarketHeatmapTile, densityForTile } from "./treemapTileDensity.ts";

test("narrow theme tiles hide return and clamp to one line", () => {
  const d = densityForTile(6, 40, true);
  assert.equal(d.lines, 1);
  assert.equal(d.showReturn, false);
  assert.ok(d.titlePx <= 8);
});

test("large theme tiles show return and allow multi-line", () => {
  const d = densityForTile(30, 30, true);
  assert.equal(d.showReturn, true);
  assert.ok(d.lines >= 2);
  assert.ok(d.titlePx >= 9);
});

test("market heatmap keeps return on mid-size cells hero would skip", () => {
  const hero = densityForTile(8, 12, true);
  const market = densityForMarketHeatmapTile(8, 12);
  assert.equal(hero.showReturn, false);
  assert.equal(market.showReturn, true);
});
