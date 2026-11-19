import assert from "node:assert/strict";
import test from "node:test";

import {
  blendThemeCompareReturnsByWeight,
  membershipWeightFraction,
  overlayStockThemesWithLiveCompare,
  withLiveThemeIndexCompare,
  // @ts-expect-error Node's type-stripping test runner requires the source extension.
} from "./stockThemeLiveBlend.ts";

const cr = (metrics: Record<string, number | null>) => ({ metrics, columns: Object.keys(metrics) });

test("membershipWeightFraction handles percent points and fractions", () => {
  assert.equal(membershipWeightFraction(15), 0.15);
  assert.equal(membershipWeightFraction(0.15), 0.15);
  assert.equal(membershipWeightFraction(1), 1);
  assert.equal(membershipWeightFraction(0), null);
  assert.equal(membershipWeightFraction(-3), null);
  assert.equal(membershipWeightFraction(null), null);
  assert.equal(membershipWeightFraction("20"), 0.2);
  assert.equal(membershipWeightFraction(Number.NaN), null);
});

test("blend is weight-normalized per horizon and skips missing values", () => {
  const out = blendThemeCompareReturnsByWeight([
    { slug: "a", weight: 60, compare_returns: cr({ "1D": 2, "1M": 10 }) },
    { slug: "b", weight: 40, compare_returns: cr({ "1D": -1, "1M": null }) },
    { slug: "c", weight: null, compare_returns: cr({ "1D": 100 }) },
    { slug: "d", weight: 10 },
  ]);
  assert.ok(out);
  // 1D: (0.6*2 + 0.4*-1) / 1.0 = 0.8
  assert.equal(out.metrics?.["1D"], 0.8);
  // 1M: only theme a has it -> its own value
  assert.equal(out.metrics?.["1M"], 10);
  assert.deepEqual(out.columns, ["1D", "1M"]);
});

test("blend returns null when nothing is usable", () => {
  assert.equal(blendThemeCompareReturnsByWeight([]), null);
  assert.equal(
    blendThemeCompareReturnsByWeight([{ slug: "a", weight: 50, compare_returns: cr({}) }]),
    null,
  );
});

test("overlay swaps in live rows case-insensitively and keeps unmatched themes", () => {
  const themes = [
    { slug: "alpha", weight: 50, compare_returns: cr({ "1D": 1 }) },
    { slug: "Beta", weight: 50, compare_returns: cr({ "1D": 2 }) },
  ];
  const live = [
    { slug: "ALPHA", compare_returns: cr({ "1D": 5 }) },
    { slug: "other", compare_returns: cr({ "1D": 9 }) },
  ];
  const out = overlayStockThemesWithLiveCompare(themes, live);
  assert.equal(out[0].compare_returns?.metrics?.["1D"], 5);
  assert.equal(out[1], themes[1]);
  assert.equal(overlayStockThemesWithLiveCompare(themes, []), themes);
  assert.equal(overlayStockThemesWithLiveCompare(themes, null), themes);
});

test("withLiveThemeIndexCompare keeps chart and note, replaces compare_returns", () => {
  const chart = { performance: {} };
  const out = withLiveThemeIndexCompare(
    { note: "keep me", chart: chart as never, compare_returns: cr({ "1D": 0 }) },
    [{ slug: "a", weight: 100, compare_returns: cr({ "1D": 3 }) }],
  );
  assert.ok(out);
  assert.equal(out.note, "keep me");
  assert.equal(out.chart, chart);
  assert.equal(out.compare_returns?.metrics?.["1D"], 3);
  const unchanged = { note: "x" };
  assert.equal(withLiveThemeIndexCompare(unchanged, []), unchanged);
  assert.equal(withLiveThemeIndexCompare(null, []), null);
});
