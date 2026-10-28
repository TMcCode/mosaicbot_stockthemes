import { describe, expect, it } from "vitest";

import { isThesisTextTableEvent, mergeHomeFeedEvents } from "./mergeHomeFeedEvents";
import type { ManifestHomeFeedEventV0, ManifestV0 } from "@/types/manifest.v0";

function evt(
  partial: Partial<ManifestHomeFeedEventV0> &
    Pick<ManifestHomeFeedEventV0, "kind" | "event_at" | "title">,
): ManifestHomeFeedEventV0 {
  return partial;
}

const emptyManifest: ManifestV0 = {
  schema_version: 0,
  as_of: "2026-10-28",
  groups: [],
  themes: [
    {
      slug: "ai-25-semiconductors",
      name: "AI '25: Semiconductors",
      group_slug: "ai",
    },
  ],
  new_themes: [],
  updated_themes: [],
};

describe("isThesisTextTableEvent", () => {
  it("keeps Theme_BullBearDetails / thesis updated without ticker", () => {
    expect(
      isThesisTextTableEvent(
        evt({
          kind: "text_table_update",
          event_at: "2026-10-28T01:00:00Z",
          title: "AI '25: Semiconductors — Theme BullBearDetails updated",
          theme_name: "AI '25: Semiconductors",
        }),
      ),
    ).toBe(true);
    expect(
      isThesisTextTableEvent(
        evt({
          kind: "text_table_update",
          event_at: "2026-10-28T01:00:00Z",
          title: "AI '25: Semiconductors — thesis updated",
          theme_name: "AI '25: Semiconductors",
        }),
      ),
    ).toBe(true);
  });

  it("rejects Ticker_BullBearDetails and ticker-titled thesis cards", () => {
    expect(
      isThesisTextTableEvent(
        evt({
          kind: "text_table_update",
          event_at: "2026-10-28T01:00:00Z",
          title: "SMCI — Ticker BullBearDetails updated",
          ticker: "SMCI",
          theme_name: "AI '25: Semiconductors",
        }),
      ),
    ).toBe(false);
    expect(
      isThesisTextTableEvent(
        evt({
          kind: "text_table_update",
          event_at: "2026-10-28T01:00:00Z",
          title: "SMCI — thesis updated",
          ticker: "SMCI",
          theme_name: "AI '25: Semiconductors",
        }),
      ),
    ).toBe(false);
  });
});

describe("mergeHomeFeedEvents thesis filter", () => {
  it("does not surface ticker-entity thesis cards on the public feed", () => {
    const themeByName = new Map([
      ["AI '25: Semiconductors", { slug: "ai-25-semiconductors", name: "AI '25: Semiconductors" }],
    ]);
    const etl: ManifestHomeFeedEventV0[] = [
      evt({
        kind: "text_table_update",
        event_at: "2026-10-28T02:00:00Z",
        title: "SMCI — thesis updated",
        ticker: "SMCI",
        theme_name: "AI '25: Semiconductors",
        theme_slug: "ai-25-semiconductors",
        thesis_preview: "Theme thesis prose…",
      }),
      evt({
        kind: "text_table_update",
        event_at: "2026-10-28T01:00:00Z",
        title: "AI '25: Semiconductors — thesis updated",
        theme_name: "AI '25: Semiconductors",
        theme_slug: "ai-25-semiconductors",
        thesis_preview: "Theme thesis prose…",
      }),
    ];
    const merged = mergeHomeFeedEvents(emptyManifest, themeByName, etl);
    const thesis = merged.filter((e) => e.kind === "text_table_update");
    expect(thesis).toHaveLength(1);
    expect(thesis[0].title).toMatch(/AI '25: Semiconductors/i);
    expect(String(thesis[0].ticker || "")).toBe("");
  });
});
