import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import {
  COMPARE_SUMMARY_DEFAULT_METRIC,
  resolveCompareSummaryMetricColumn,
} from "./compareSummaryMetricColumn.ts";

test("metric primary sort drives summary column", () => {
  assert.equal(
    resolveCompareSummaryMetricColumn("3M", "10D", ["1D", "10D", "3M"]),
    "3M",
  );
});

test("Theme sort keeps last metric", () => {
  assert.equal(
    resolveCompareSummaryMetricColumn("Theme", "LstRpt %", ["10D", "LstRpt %"]),
    "LstRpt %",
  );
});

test("Theme sort with no last metric falls back to 10D", () => {
  assert.equal(
    resolveCompareSummaryMetricColumn("Theme", null, ["1D", "10D", "YTD"]),
    COMPARE_SUMMARY_DEFAULT_METRIC,
  );
});

test("secondary/name-only with empty columns still defaults to 10D", () => {
  assert.equal(resolveCompareSummaryMetricColumn("Theme", undefined, []), "10D");
});
