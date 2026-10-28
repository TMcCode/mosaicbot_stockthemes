import { describe, expect, it } from "vitest";

import { collapseNewTabGroupFlippers } from "./collapseNewTabGroupFlippers";
import type { HomeRadarCardV0 } from "@/types/home_radar.v0";

function card(partial: Partial<HomeRadarCardV0> & Pick<HomeRadarCardV0, "slug" | "name">): HomeRadarCardV0 {
  return partial;
}

describe("collapseNewTabGroupFlippers", () => {
  it("orders by newest day then higher 1M; flipper lead is best that day in group", () => {
    const rows = [
      card({
        slug: "a1",
        name: "Airplanes A",
        group_name: "Airplanes",
        return_1m: 1,
        created_at: "2026-10-25T12:00:00Z",
      }),
      card({
        slug: "d1",
        name: "Diag Low",
        group_name: "Diagnostics",
        return_1m: -3,
        created_at: "2026-10-28T10:00:00Z",
      }),
      card({
        slug: "d2",
        name: "Diag High",
        group_name: "Diagnostics",
        return_1m: 12,
        created_at: "2026-10-28T08:00:00Z",
      }),
      card({
        slug: "d3",
        name: "Diag Mid",
        group_name: "Diagnostics",
        return_1m: 5,
        created_at: "2026-10-28T09:00:00Z",
      }),
      card({
        slug: "c1",
        name: "Chips Solo",
        group_name: "Chips",
        return_1m: 8,
        created_at: "2026-10-27T01:00:00Z",
      }),
      card({
        slug: "c2",
        name: "Chips Pair",
        group_name: "Chips",
        return_1m: 2,
        created_at: "2026-10-27T12:00:00Z",
      }),
    ];
    const out = collapseNewTabGroupFlippers(rows);
    // Oct 28 Diagnostics flipper (lead d2 @12) before Oct 27 Chips (c1@8, c2@2) before Oct 25
    expect(out.map((r) => r.slug)).toEqual(["d2", "c1", "c2", "a1"]);
    expect(out[0].siblings?.map((s) => s.slug)).toEqual(["d2", "d3", "d1"]);
    expect(collapseNewTabGroupFlippers(out).map((r) => r.slug)).toEqual(["d2", "c1", "c2", "a1"]);
  });
});
