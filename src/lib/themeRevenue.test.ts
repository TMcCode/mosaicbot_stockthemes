import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import {
  filterRevenueColumns,
  REVENUE_GROWTH_COLUMNS,
  REVENUE_VALUATION_COLUMNS,
} from "./themeRevenue.ts";

test("growth columns are sequential quarters then years", () => {
  const ids = REVENUE_GROWTH_COLUMNS.map((col) => col.id);
  assert.deepEqual(ids.slice(0, 12), [
    "l5q",
    "l4q",
    "l3q",
    "l2q",
    "lq",
    "cq",
    "nq",
    "l2y",
    "ly",
    "cy",
    "ny",
    "n2y",
  ]);
  assert.equal(ids.includes("n2q"), false);
  assert.equal(ids.includes("lq_py"), false);
  assert.equal(ids.includes("ps_ntm"), false);
});

test("sequential lags L2Q through L5Q and L2Y stay out of accel mode", () => {
  const accelIds = filterRevenueColumns("accel").map((col) => col.id);
  assert.equal(accelIds.includes("l5q"), false);
  assert.equal(accelIds.includes("l4q"), false);
  assert.equal(accelIds.includes("l3q"), false);
  assert.equal(accelIds.includes("l2q"), false);
  assert.equal(accelIds.includes("l2y"), false);
  const growthIds = filterRevenueColumns("growth").map((col) => col.id);
  assert.equal(growthIds.includes("l5q"), true);
  assert.equal(growthIds.includes("l4q"), true);
  assert.equal(growthIds.includes("l3q"), true);
  assert.equal(growthIds.includes("l2q"), true);
});

test("valuation columns keep yearly growth beside P/S and PSG", () => {
  assert.deepEqual(
    REVENUE_VALUATION_COLUMNS.map((col) => col.id),
    ["ly", "cy", "ny", "n2y", "fwd3y", "ps_ntm", "psg_ntm", "ps_ny", "psg_ny", "ps_n2y", "psg_n2y"],
  );
  const valuationIds = filterRevenueColumns("valuation").map((col) => col.id);
  assert.equal(valuationIds.includes("lq"), false);
  assert.equal(valuationIds.includes("ps_ny"), true);
});
