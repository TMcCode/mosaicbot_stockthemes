import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import {
  chartTailDisagreesWithThemeDayReturn,
  dayReturnMatchesLastCompletedMove,
  extendCompositionIndexedWithLiveDayReturns,
  extendCompositionSeriesWithLiveDayReturn,
  lastCompletedDayReturnPct,
  maybeExtendIndexedPerformanceFromLiveDayReturn,
} from "./extendCompositionLiveTail.ts";

test("appends session day from prior close using 1D %", () => {
  const next = extendCompositionSeriesWithLiveDayReturn(
    {
      ticker: "AAL",
      name: "American Airlines",
      dates: ["2026-07-22", "2026-07-23"],
      values: [129.06, 118.32],
    },
    "2026-07-24",
    5.4,
  );
  assert.deepEqual(next.dates, ["2026-07-22", "2026-07-23", "2026-07-24"]);
  assert.equal(next.values?.[2], Math.round(118.32 * 1.054 * 10_000) / 10_000);
});

test("refreshes same-day point from prior close instead of compounding", () => {
  const first = extendCompositionSeriesWithLiveDayReturn(
    {
      ticker: "DAL",
      dates: ["2026-07-23", "2026-07-24"],
      values: [100, 101],
    },
    "2026-07-24",
    2,
  );
  assert.equal(first.values?.[1], 102);
  const second = extendCompositionSeriesWithLiveDayReturn(first, "2026-07-24", 3);
  assert.equal(second.values?.[1], 103);
  assert.deepEqual(second.dates, ["2026-07-23", "2026-07-24"]);
});

test("extends each composition series from a ticker 1D map", () => {
  const chart = extendCompositionIndexedWithLiveDayReturns(
    {
      performance: {
        dates: ["2026-07-23", "2026-07-24"],
        values: [100, 101],
      },
      composition_indexed: {
        series: [
          { ticker: "AAL", dates: ["2026-07-23"], values: [100] },
          { ticker: "DAL", dates: ["2026-07-23"], values: [200] },
        ],
      },
    },
    { AAL: 10, DAL: -5 },
    "2026-07-24",
  );
  assert.deepEqual(chart?.composition_indexed?.series?.[0]?.dates, ["2026-07-23", "2026-07-24"]);
  assert.equal(chart?.composition_indexed?.series?.[0]?.values?.[1], 110);
  assert.equal(chart?.composition_indexed?.series?.[1]?.values?.[1], 190);
});

test("detects when 1D is just the last completed day move", () => {
  const perf = {
    dates: ["2026-07-28", "2026-07-29"],
    values: [180.7705, 177.9889],
  };
  const lastMove = (177.9889 / 180.7705 - 1) * 100;
  assert.equal(dayReturnMatchesLastCompletedMove(perf, lastMove), true);
  assert.equal(dayReturnMatchesLastCompletedMove(perf, -0.5), false);
});

test("skips inventing today from a stale completed-day 1D", () => {
  const perf = {
    dates: ["2026-07-28", "2026-07-29"],
    values: [180.7705, 177.9889],
  };
  const lastMove = (177.9889 / 180.7705 - 1) * 100;
  const next = maybeExtendIndexedPerformanceFromLiveDayReturn(perf, "2026-07-30", lastMove);
  assert.equal(next, perf);
});

test("appends today when 1D differs from the last completed move", () => {
  const perf = {
    dates: ["2026-07-28", "2026-07-29"],
    values: [100, 102],
  };
  const next = maybeExtendIndexedPerformanceFromLiveDayReturn(perf, "2026-07-30", -1.5);
  assert.deepEqual(next?.dates, ["2026-07-28", "2026-07-29", "2026-07-30"]);
  assert.equal(next?.values?.[2], Math.round(102 * 0.985 * 10_000) / 10_000);
});

test("refreshes flat same-day CDN tail from live 1D (stale chart sidecar)", () => {
  // Slim chart wrote today as a copy of Friday close; price_returns 1D is live.
  const perf = {
    dates: ["2026-09-11", "2026-09-12", "2026-09-13", "2026-09-14"],
    values: [257.5654, 257.5654, 257.5654, 257.5654],
  };
  const next = maybeExtendIndexedPerformanceFromLiveDayReturn(perf, "2026-09-14", -3.1414);
  assert.deepEqual(next?.dates, perf.dates);
  assert.equal(
    next?.values?.[3],
    Math.round(257.5654 * (1 - 0.031414) * 10_000) / 10_000,
  );
});

test("lastCompletedDayReturnPct reads the final indexed segment", () => {
  assert.equal(
    lastCompletedDayReturnPct({ dates: ["2026-11-11", "2026-11-12"], values: [100, 89] }),
    -11,
  );
});

test("chartTailDisagreesWithThemeDayReturn flags corrupt matrix tails vs Theme 1D", () => {
  const cliff = { dates: ["2026-11-11", "2026-11-12"], values: [95, 84] };
  // Theme row (weighted blend of fine cells) says ~-0.4%; chart tail says ~-11.6%.
  assert.equal(chartTailDisagreesWithThemeDayReturn(cliff, -0.4), true);
  assert.equal(chartTailDisagreesWithThemeDayReturn(cliff, -11.5), false);
});

test("Theme 1D repairs a bad same-day chart point without inventing a peer aggregate", () => {
  const perf = {
    dates: ["2026-11-11", "2026-11-12"],
    values: [95, 84],
  };
  const theme1d = -0.4; // same number the Theme return row shows
  assert.equal(chartTailDisagreesWithThemeDayReturn(perf, theme1d), true);
  const next = maybeExtendIndexedPerformanceFromLiveDayReturn(perf, "2026-11-12", theme1d);
  assert.deepEqual(next?.dates, perf.dates);
  assert.equal(next?.values?.[1], Math.round(95 * 0.996 * 10_000) / 10_000);
});
