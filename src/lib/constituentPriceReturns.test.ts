import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import { normalizeConstituentPriceReturnColumnOrder } from "./constituentPriceReturns.ts";

test("period returns put 2Y and 5Y after 1YR", () => {
  assert.deepEqual(
    normalizeConstituentPriceReturnColumnOrder([
      "Period",
      "5Y",
      "IranWar",
      "1D",
      "2Y",
      "YTD",
      "LibDay",
    ]),
    ["1D", "YTD", "IranWar", "LibDay", "Period", "2Y", "5Y"],
  );
});
