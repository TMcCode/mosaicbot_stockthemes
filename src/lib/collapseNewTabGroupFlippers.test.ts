import { describe, expect, it } from "vitest";

import { collapseNewTabGroupFlippers } from "./collapseNewTabGroupFlippers";
import type { HomeRadarCardV0 } from "@/types/home_radar.v0";

function card(partial: Partial<HomeRadarCardV0> & Pick<HomeRadarCardV0, "slug" | "name">): HomeRadarCardV0 {
  return partial;
}

describe("collapseNewTabGroupFlippers", () => {
  it("collapses ≥3 same group; leaves pairs alone; lead is best 1M", () => {
    const rows = [
      card({ slug: "a1", name: "Airplanes A", group_name: "Airplanes", return_1m: 1 }),
      card({ slug: "d1", name: "Diag Low", group_name: "Diagnostics", return_1m: -3 }),
      card({ slug: "d2", name: "Diag High", group_name: "Diagnostics", return_1m: 12 }),
      card({ slug: "d3", name: "Diag Mid", group_name: "Diagnostics", return_1m: 5 }),
      card({ slug: "c1", name: "Chips Solo", group_name: "Chips", return_1m: 8 }),
      card({ slug: "c2", name: "Chips Pair", group_name: "Chips", return_1m: 2 }),
    ];
    const out = collapseNewTabGroupFlippers(rows);
    // Cards ordered by lead 1M desc: Diag(12), Chips(8), Chips pair(2), Airplanes(1)
    expect(out.map((r) => r.slug)).toEqual(["d2", "c1", "c2", "a1"]);
    expect(out[0].siblings?.map((s) => s.slug)).toEqual(["d2", "d3", "d1"]);
    expect(collapseNewTabGroupFlippers(out).map((r) => r.slug)).toEqual(["d2", "c1", "c2", "a1"]);
  });
});
