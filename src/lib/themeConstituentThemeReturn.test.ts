import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import { weightedMeanRenormalized } from "./weightedMeanRenormalized.ts";

test("weightedMeanRenormalized renormalizes over available weights", () => {
  const v = weightedMeanRenormalized([
    { weight: 12.5, value: 7.34 },
    { weight: 12.5, value: null },
    { weight: 12.5, value: -2.55 },
    { weight: 12.5, value: null },
  ]);
  assert.ok(v != null);
  assert.ok(Math.abs(v - (7.34 - 2.55) / 2) < 1e-9);
});

test("weightedMeanRenormalized equal-weight fallback without weights", () => {
  assert.equal(
    weightedMeanRenormalized([
      { weight: null, value: 10 },
      { weight: null, value: 20 },
    ]),
    15,
  );
});
