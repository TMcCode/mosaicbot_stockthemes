import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import {
  dayReturnMatchesLastCompletedMove,
  extendCompositionIndexedWithLiveDayReturns,
  extendCompositionSeriesWithLiveDayReturn,
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
