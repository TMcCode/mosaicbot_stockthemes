import { describe, expect, it } from "vitest";

import {
  exploreDayKey,
  exploreDiversityKey,
  mulberry32,
  pickExploreGroups,
} from "./pickExploreGroups";
import type { ManifestV0 } from "@/types/manifest.v0";

function manifestWith(
  groups: { slug: string; name: string; theme_slugs: string[] }[],
  themes: { slug: string; name: string; group_slug: string }[],
): ManifestV0 {
  return {
    schema_version: 0,
    as_of: "2026-09-24",
    groups,
    themes,
  } as ManifestV0;
}

describe("exploreDiversityKey", () => {
  it("collapses AI-prefixed names", () => {
    expect(exploreDiversityKey("AI")).toBe("ai");
    expect(exploreDiversityKey("AI Power")).toBe("ai");
    expect(exploreDiversityKey("AI Bottleneck")).toBe("ai");
  });

  it("uses first word otherwise", () => {
    expect(exploreDiversityKey("Agentic Utilities")).toBe("agentic");
    expect(exploreDiversityKey("Video Games")).toBe("video");
  });
});

describe("pickExploreGroups", () => {
  const groups = [
    { slug: "ai", name: "AI", theme_slugs: ["ai-a"] },
    { slug: "ai-power", name: "AI Power", theme_slugs: ["aip-a"] },
    { slug: "ai-bottleneck", name: "AI Bottleneck", theme_slugs: ["aib-a"] },
    { slug: "agentic", name: "Agentic Utilities", theme_slugs: ["ag-a", "ag-b", "ag-c", "ag-d"] },
    { slug: "wines", name: "Wines", theme_slugs: ["w-a", "w-b", "w-c"] },
    { slug: "virality", name: "Virality", theme_slugs: ["v-a"] },
    { slug: "games", name: "Video Games", theme_slugs: ["g-a", "g-b", "g-c"] },
    { slug: "world-cup", name: "World Cup", theme_slugs: ["wc-a"] },
  ];
  const themes = groups.flatMap((g) =>
    g.theme_slugs.map((slug) => ({
      slug,
      name: slug.toUpperCase(),
      group_slug: g.slug,
    })),
  );
  const manifest = manifestWith(groups, themes);

  it("returns 6 groups stable for a given day", () => {
    const now = new Date("2026-09-24T15:00:00Z");
    const a = pickExploreGroups(manifest, [], { now });
    const b = pickExploreGroups(manifest, [], { now });
    expect(a).toHaveLength(6);
    expect(a.map((g) => g.slug)).toEqual(b.map((g) => g.slug));
    expect(a.map((g) => g.themes.map((t) => t.slug))).toEqual(
      b.map((g) => g.themes.map((t) => t.slug)),
    );
  });

  it("avoids stacking AI* groups when alternatives exist", () => {
    const now = new Date("2026-09-24T15:00:00Z");
    const out = pickExploreGroups(manifest, [], { now, count: 6 });
    const aiCount = out.filter((g) => exploreDiversityKey(g.name) === "ai").length;
    expect(aiCount).toBeLessThanOrEqual(1);
  });

  it("caps child themes at 4", () => {
    const now = new Date("2026-09-24T15:00:00Z");
    const out = pickExploreGroups(manifest, [], { now });
    for (const g of out) {
      expect(g.themes.length).toBeLessThanOrEqual(4);
    }
  });

  it("changes draw across calendar days (ET)", () => {
    const d1 = pickExploreGroups(manifest, [], {
      now: new Date("2026-09-24T15:00:00Z"),
    });
    const d2 = pickExploreGroups(manifest, [], {
      now: new Date("2026-09-25T15:00:00Z"),
    });
    // Extremely unlikely identical 6-slug order for two days with 8 candidates.
    expect(d1.map((g) => g.slug).join("|")).not.toEqual(d2.map((g) => g.slug).join("|"));
  });
});

describe("mulberry32 / exploreDayKey", () => {
  it("is deterministic", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("formats ET calendar day", () => {
    // 2026-09-24 02:00 UTC is still 2026-09-23 evening ET
    expect(exploreDayKey(new Date("2026-09-24T02:00:00Z"))).toBe("2026-09-23");
  });
});
