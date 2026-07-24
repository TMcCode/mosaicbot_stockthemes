import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import { isCompareSectorFilterInactive, resolveVisibleSelectedGroups } from "./compareSectorFilter.ts";

test("empty sector selection is an active filter (Unselect all)", () => {
  assert.equal(isCompareSectorFilterInactive([], ["Energy", "Financials"]), false);
  assert.equal(
    isCompareSectorFilterInactive(["Energy", "Financials"], ["Energy", "Financials"]),
    true,
  );
  assert.equal(isCompareSectorFilterInactive(["Energy"], ["Energy", "Financials"]), false);
});

test("resolveVisibleSelectedGroups keeps intentional empty selection", () => {
  assert.deepEqual(resolveVisibleSelectedGroups([], ["AI", "Airplanes"]), []);
});

test("resolveVisibleSelectedGroups falls back when sector pruning clears selection", () => {
  assert.deepEqual(
    resolveVisibleSelectedGroups(["AI Short"], ["Airplanes", "Alcohol"]),
    ["Airplanes", "Alcohol"],
  );
});

test("resolveVisibleSelectedGroups keeps intersection when some remain visible", () => {
  assert.deepEqual(
    resolveVisibleSelectedGroups(["AI", "Airplanes", "Hidden"], ["AI", "Alcohol"]),
    ["AI"],
  );
});
