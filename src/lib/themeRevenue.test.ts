import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import {
  filterRevenueColumns,
  REVENUE_GROWTH_COLUMNS,
  REVENUE_VALUATION_COLUMNS,
  revenueSidecarHasSequentialLags,
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

test("accel mode shows L4Q through NQ and hides L5Q baseline", () => {
  const accelIds = filterRevenueColumns("accel").map((col) => col.id);
  assert.deepEqual(
    accelIds.filter((id) => ["l5q", "l4q", "l3q", "l2q", "lq", "cq", "nq"].includes(id)),
    ["l4q", "l3q", "l2q", "lq", "cq", "nq"],
  );
  assert.equal(accelIds.includes("l2y"), false);
  const growthIds = filterRevenueColumns("growth").map((col) => col.id);
  assert.equal(growthIds.includes("l5q"), true);
  assert.equal(growthIds.includes("l4q"), true);
});

test("valuation columns keep yearly growth beside P/S and PSG", () => {
  assert.deepEqual(
    REVENUE_VALUATION_COLUMNS.map((col) => col.id),
    ["ly", "cy", "ny", "n2y", "fwd3y", "ps_ly", "ps_ntm", "evs_ntm", "psg_ntm", "psg_fwd", "ps_ny", "psg_ny", "ps_n2y", "psg_n2y"],
  );
  const valuationIds = filterRevenueColumns("valuation").map((col) => col.id);
  assert.equal(valuationIds.includes("lq"), false);
  assert.equal(valuationIds.includes("ps_ny"), true);
});

test("baked revenue JSON without L5Q/L4Q/L3Q is treated as stale", () => {
  const stale = JSON.stringify({
    schema_version: 0,
    slug: "x",
    as_of: "2026-08-17",
    aggregation: "manual_theme_weights",
    summary: { l2q_rev_act_pct: 1.2, lq_rev_act_pct: 3.4 },
    constituents: [{ ticker: "AAA", growth: { l2q_rev_act_pct: 1.2 }, accel: {} }],
  });
  const current = JSON.stringify({
    schema_version: 0,
    slug: "x",
    as_of: "2026-08-17",
    aggregation: "manual_theme_weights",
    summary: { l5q_rev_act_pct: -1, l4q_rev_act_pct: 2, l3q_rev_act_pct: null, l2q_rev_act_pct: 1.2, l4q_accel_pp: 3, l3q_accel_pp: -1, l2q_accel_pp: 0.5, lq_accel_pp: 1.1, ps_ratio_ly: 4.2, ev_sales_ntm: 5.1, psg_fwd: 0.8 },
    constituents: [{ ticker: "AAA", growth: { l5q_rev_act_pct: -1 }, accel: {} }],
  });
  assert.equal(revenueSidecarHasSequentialLags(stale), false);
  assert.equal(revenueSidecarHasSequentialLags(current), true);
});
