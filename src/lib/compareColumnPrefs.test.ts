import { describe, expect, it } from "vitest";

import {
  defaultCompareColumnPrefs,
  moveCompareColumnOrder,
  reconcileCompareColumnPrefs,
  resolveCompareDisplayColumns,
  toggleCompareColumnVisible,
} from "./compareColumnPrefs";

describe("compareColumnPrefs", () => {
  it("defaults to all available", () => {
    expect(defaultCompareColumnPrefs(["1D", "3M"])).toEqual({
      order: ["1D", "3M"],
      visible: ["1D", "3M"],
    });
  });

  it("does not auto-show new keys once customized", () => {
    const prefs = { order: ["1D", "YTD"], visible: ["1D", "YTD"] };
    const next = reconcileCompareColumnPrefs(["1D", "3M", "YTD"], prefs);
    expect(next.order).toEqual(["1D", "YTD", "3M"]);
    expect(next.visible).toEqual(["1D", "YTD"]);
    expect(resolveCompareDisplayColumns(["1D", "3M", "YTD"], prefs)).toEqual(["1D", "YTD"]);
  });

  it("refuses to hide the last visible column", () => {
    const prefs = { order: ["1D", "3M"], visible: ["1D"] };
    expect(toggleCompareColumnVisible(prefs, "1D")).toEqual(prefs);
  });

  it("reorders within the list", () => {
    const prefs = { order: ["1D", "3M", "YTD"], visible: ["1D", "3M", "YTD"] };
    expect(moveCompareColumnOrder(prefs, 0, 2).order).toEqual(["3M", "YTD", "1D"]);
  });
});
