import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import { hasIndexedPerformanceFromAnchor, periodAnchorIso } from "./sliceIndexedChart.ts";

test("5Y sidecar that starts one session after the calendar anchor is sliceable", () => {
  // Last session 2026-07-24 → 5Y calendar anchor 2021-07-24; published series often
  // begins on the next trading day (2021-07-25). That must count as enough history
  // (same gate as performanceNeedsExtendedHistory / period-button enablement).
  const perf = {
    dates: ["2021-07-25", "2021-07-26", "2026-07-24"],
    values: [100, 101, 150],
  };
  const anchor = periodAnchorIso("2026-07-24", "5Y");
  assert.equal(anchor, "2021-07-24");
  assert.equal(hasIndexedPerformanceFromAnchor(perf, anchor), true);
});

test("embedded ~1Y series is not enough for 2Y/5Y", () => {
  const perf = {
    dates: ["2025-07-23", "2025-07-24", "2026-07-24"],
    values: [100, 101, 110],
  };
  assert.equal(hasIndexedPerformanceFromAnchor(perf, periodAnchorIso("2026-07-24", "2Y")), false);
  assert.equal(hasIndexedPerformanceFromAnchor(perf, periodAnchorIso("2026-07-24", "5Y")), false);
  assert.equal(hasIndexedPerformanceFromAnchor(perf, periodAnchorIso("2026-07-24", "1Y")), true);
});
