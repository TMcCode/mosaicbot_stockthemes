import assert from "node:assert/strict";
import test from "node:test";
import type Fuse from "fuse.js";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import {
  isTickerishQuery,
  collectSiteSearchHits,
  collectSiteSearchThemeHits,
  type SiteSearchFuseRow,
} from "./siteSearchRank.ts";
// @ts-expect-error Node's type-stripping test runner requires the source extension.
import type { SearchIndexV0 } from "../types/search_index.v0.ts";

const sampleIndex: SearchIndexV0 = {
  schema_version: 0,
  as_of: "2026-09-14T00:00:00Z",
  tickers: [
    {
      ticker: "NVDA",
      name: "NVIDIA Corporation",
      theme_slugs: ["ai-26-gpus"],
      theme_names: ["AI '26: GPUs"],
      aliases: [],
    },
    {
      ticker: "CROX",
      name: "Crocs, Inc.",
      theme_slugs: ["shoes-26-sandals"],
      theme_names: ["Shoes '26: Sandals"],
      aliases: [],
    },
  ],
  themes: [
    {
      slug: "ai-26-gpus",
      name: "AI '26: GPUs",
      group_slug: "ai",
      group_name: "AI",
      aliases: ["graphics chips", "nvidia ecosystem"],
    },
    {
      slug: "shoes-26-sandals",
      name: "Shoes '26: Sandals",
      group_slug: "shoes",
      group_name: "Shoes",
      aliases: ["footwear"],
    },
  ],
  groups: [
    { slug: "ai", name: "AI", aliases: [] },
    { slug: "shoes", name: "Shoes", aliases: [] },
  ],
};

function stubFuse(): Fuse<SiteSearchFuseRow> {
  return { search: () => [] } as unknown as Fuse<SiteSearchFuseRow>;
}

test("isTickerishQuery recognizes short symbol queries", () => {
  assert.equal(isTickerishQuery("NVDA"), true);
  assert.equal(isTickerishQuery("ai"), true);
  assert.equal(isTickerishQuery("nvidia"), false);
  assert.equal(isTickerishQuery("sandals"), false);
});

test("NVDA search returns ticker + member themes, not unrelated Sandals", () => {
  const hits = collectSiteSearchHits(sampleIndex, stubFuse(), "NVDA");
  const keys = hits.map((h) => h.key);
  assert.ok(keys.includes("ticker:NVDA"));
  assert.ok(keys.includes("theme:ai-26-gpus"));
  assert.ok(!keys.includes("theme:shoes-26-sandals"));
  assert.ok(!keys.includes("group:shoes"));
});

test("alias keyword still finds a theme without fuzzy", () => {
  const hits = collectSiteSearchHits(sampleIndex, stubFuse(), "footwear");
  assert.ok(hits.some((h) => h.key === "theme:shoes-26-sandals"));
  assert.ok(!hits.some((h) => h.key === "ticker:NVDA"));
});

test("theme-only collector returns themes for ticker symbol", () => {
  const themes = collectSiteSearchThemeHits(sampleIndex, stubFuse(), "NVDA");
  assert.deepEqual(
    themes.map((t) => t.slug),
    ["ai-26-gpus"],
  );
});

test("theme-only collector expands company name to member themes", () => {
  const themes = collectSiteSearchThemeHits(sampleIndex, stubFuse(), "nvidia");
  assert.ok(themes.some((t) => t.slug === "ai-26-gpus"));
  assert.ok(!themes.some((t) => t.slug === "shoes-26-sandals"));
});

test("theme-only collector expands group match to themes in that group", () => {
  const themes = collectSiteSearchThemeHits(sampleIndex, stubFuse(), "Shoes");
  assert.ok(themes.some((t) => t.slug === "shoes-26-sandals"));
  assert.ok(!themes.some((t) => t.slug === "ai-26-gpus"));
});
