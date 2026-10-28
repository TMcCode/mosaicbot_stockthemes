import { describe, expect, it } from "vitest";

import { collapseNewTabGroupFlippers } from "./collapseNewTabGroupFlippers";
import type { HomeRadarCardV0 } from "@/types/home_radar.v0";

function card(partial: Partial<HomeRadarCardV0> & Pick<HomeRadarCardV0, "slug" | "name">): HomeRadarCardV0 {
  return partial;
}

describe("collapseNewTabGroupFlippers", () => {
  it("collapses ≥3 same group; lead is newest created_at", () => {
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
        created_at: "2026-10-26T10:00:00Z",
      }),
      card({
        slug: "d2",
        name: "Diag High",
        group_name: "Diagnostics",
        return_1m: 12,
        created_at: "2026-10-27T10:00:00Z",
      }),
      card({
        slug: "d3",
        name: "Diag Mid",
        group_name: "Diagnostics",
        return_1m: 5,
        created_at: "2026-10-26T18:00:00Z",
      }),
      card({
        slug: "c1",
        name: "Chips Solo",
        group_name: "Chips",
        return_1m: 8,
        created_at: "2026-10-28T01:00:00Z",
      }),
      card({
        slug: "c2",
        name: "Chips Pair",
        group_name: "Chips",
        return_1m: 2,
        created_at: "2026-10-24T12:00:00Z",
      }),
    ];
    const out = collapseNewTabGroupFlippers(rows);
    // Newest leads: Chips solo (28), Diag flipper lead d2 (27), Airplanes (25), Chips pair (24)
    expect(out.map((r) => r.slug)).toEqual(["c1", "d2", "a1", "c2"]);
    expect(out[1].siblings?.map((s) => s.slug)).toEqual(["d2", "d3", "d1"]);
    expect(collapseNewTabGroupFlippers(out).map((r) => r.slug)).toEqual(["c1", "d2", "a1", "c2"]);
  });
});
