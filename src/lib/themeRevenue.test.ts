import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import {
  filterRevenueColumns,
  REVENUE_GROWTH_COLUMNS,
  REVENUE_VALUATION_COLUMNS,
} from "./themeRevenue.ts";

test("growth columns are last-year comps then current quarters then years", () => {
  const ids = REVENUE_GROWTH_COLUMNS.map((col) => col.id);
  assert.deepEqual(ids.slice(0, 12), [
    "lq_py",
    "cq_py",
    "nq_py",
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
  assert.equal(ids.includes("ps_ntm"), false);
});

test("year-ago comps L2Q and L2Y stay out of accel mode", () => {
  const accelIds = filterRevenueColumns("accel").map((col) => col.id);
  assert.equal(accelIds.includes("lq_py"), false);
  assert.equal(accelIds.includes("cq_py"), false);
  assert.equal(accelIds.includes("nq_py"), false);
  assert.equal(accelIds.includes("l2q"), false);
  assert.equal(accelIds.includes("l2y"), false);
  const growthIds = filterRevenueColumns("growth").map((col) => col.id);
  assert.equal(growthIds.includes("lq_py"), true);
  assert.equal(growthIds.includes("cq_py"), true);
  assert.equal(growthIds.includes("nq_py"), true);
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
