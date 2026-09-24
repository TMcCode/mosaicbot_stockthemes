import { describe, expect, it } from "vitest";

import { collapseFeedGroupFlippers } from "./collapseFeedGroupFlippers";
import type { ManifestHomeFeedEventV0, ManifestV0 } from "@/types/manifest.v0";

function evt(
  partial: Partial<ManifestHomeFeedEventV0> &
    Pick<ManifestHomeFeedEventV0, "kind" | "event_at" | "title">,
): ManifestHomeFeedEventV0 {
  return partial;
}

function manifest(themes: { slug: string; group_slug: string }[]): ManifestV0 {
  return {
    schema_version: 0,
    as_of: "2026-09-24",
    groups: [],
    themes: themes.map((t) => ({ slug: t.slug, name: t.slug, group_slug: t.group_slug })),
  };
}

describe("collapseFeedGroupFlippers", () => {
  it("collapses ≥3 same group+kind; leaves pairs alone", () => {
    const rows = [
      evt({
        kind: "text_table_update",
        event_at: "2026-09-23T12:00:00Z",
        title: "A",
        theme_slug: "a",
      }),
      evt({
        kind: "text_table_update",
        event_at: "2026-09-23T11:00:00Z",
        title: "B",
        theme_slug: "b",
      }),
      evt({
        kind: "text_table_update",
        event_at: "2026-09-23T10:00:00Z",
        title: "C",
        theme_slug: "c",
      }),
      evt({
        kind: "text_table_update",
        event_at: "2026-09-22T12:00:00Z",
        title: "D",
        theme_slug: "d",
      }),
      evt({
        kind: "text_table_update",
        event_at: "2026-09-22T11:00:00Z",
        title: "E",
        theme_slug: "e",
      }),
    ];
    const out = collapseFeedGroupFlippers(
      rows,
      manifest([
        { slug: "a", group_slug: "auto-comp" },
        { slug: "b", group_slug: "auto-comp" },
        { slug: "c", group_slug: "auto-comp" },
        { slug: "d", group_slug: "auto-oem" },
        { slug: "e", group_slug: "auto-oem" },
      ]),
    );
    expect(out).toHaveLength(3);
    expect(out[0].siblings?.map((s) => s.theme_slug)).toEqual(["a", "b", "c"]);
    expect(out[1].siblings).toBeNull();
    expect(out[1].lead.theme_slug).toBe("d");
    expect(out[2].lead.theme_slug).toBe("e");
  });

  it("falls back to colon prefix when group_slug missing", () => {
    const rows = [
      evt({
        kind: "text_table_update",
        event_at: "2026-09-23T12:00:00Z",
        title: "Auto Components '25: Tires",
        theme_name: "Auto Components '25: Tires",
      }),
      evt({
        kind: "text_table_update",
        event_at: "2026-09-23T11:00:00Z",
        title: "Auto Components '25: Tier 1",
        theme_name: "Auto Components '25: Tier 1",
      }),
      evt({
        kind: "text_table_update",
        event_at: "2026-09-23T10:00:00Z",
        title: "Auto Components '25: Thermal",
        theme_name: "Auto Components '25: Thermal",
      }),
    ];
    const out = collapseFeedGroupFlippers(rows, manifest([]));
    expect(out).toHaveLength(1);
    expect(out[0].siblings).toHaveLength(3);
  });

  it("does not mix kinds in one flipper", () => {
    const rows = [
      evt({
        kind: "text_table_update",
        event_at: "2026-09-23T12:00:00Z",
        title: "A",
        theme_slug: "a",
      }),
      evt({
        kind: "text_table_update",
        event_at: "2026-09-23T11:00:00Z",
        title: "B",
        theme_slug: "b",
      }),
      evt({
        kind: "theme_updated",
        event_at: "2026-09-23T10:00:00Z",
        title: "C",
        theme_slug: "c",
      }),
    ];
    const out = collapseFeedGroupFlippers(
      rows,
      manifest([
        { slug: "a", group_slug: "g" },
        { slug: "b", group_slug: "g" },
        { slug: "c", group_slug: "g" },
      ]),
    );
    expect(out).toHaveLength(3);
    expect(out.every((s) => !s.siblings)).toBe(true);
  });
});
