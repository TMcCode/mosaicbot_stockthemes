import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import {
  isTickerishQuery,
  collectSiteSearchHits,
  collectSiteSearchThemeHits,
  correctSearchTypos,
  normalizeSearchText,
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

test("isTickerishQuery recognizes short symbol queries", () => {
  assert.equal(isTickerishQuery("NVDA"), true);
  assert.equal(isTickerishQuery("ai"), true);
  assert.equal(isTickerishQuery("nvidia"), false);
  assert.equal(isTickerishQuery("sandals"), false);
});

test("NVDA search returns ticker + member themes, not unrelated Sandals", () => {
  const hits = collectSiteSearchHits(sampleIndex, "NVDA");
  const keys = hits.map((h) => h.key);
  assert.ok(keys.includes("ticker:NVDA"));
  assert.ok(keys.includes("theme:ai-26-gpus"));
  assert.ok(!keys.includes("theme:shoes-26-sandals"));
  assert.ok(!keys.includes("group:shoes"));
});

test("alias keyword still finds a theme without fuzzy", () => {
  const hits = collectSiteSearchHits(sampleIndex, "footwear");
  assert.ok(hits.some((h) => h.key === "theme:shoes-26-sandals"));
  assert.ok(!hits.some((h) => h.key === "ticker:NVDA"));
});

test("theme-only collector returns themes for ticker symbol", () => {
  const themes = collectSiteSearchThemeHits(sampleIndex, "NVDA");
  assert.deepEqual(
    themes.map((t) => t.slug),
    ["ai-26-gpus"],
  );
});

test("theme-only collector expands company name to member themes", () => {
  const themes = collectSiteSearchThemeHits(sampleIndex, "nvidia");
  assert.ok(themes.some((t) => t.slug === "ai-26-gpus"));
  assert.ok(!themes.some((t) => t.slug === "shoes-26-sandals"));
});

test("theme-only collector expands group match to themes in that group", () => {
  const themes = collectSiteSearchThemeHits(sampleIndex, "Shoes");
  assert.ok(themes.some((t) => t.slug === "shoes-26-sandals"));
  assert.ok(!themes.some((t) => t.slug === "ai-26-gpus"));
});

const beautyIndex: SearchIndexV0 = {
  schema_version: 0,
  as_of: "2026-10-11T00:00:00Z",
  tickers: [
    { ticker: "ULTA", name: "Ulta Beauty, Inc.", theme_slugs: ["beauty-26-cosmetics"], aliases: [] },
  ],
  themes: [
    {
      slug: "beauty-26-cosmetics",
      name: "Beauty '26: Cosmetics",
      group_slug: "beauty",
      group_name: "Beauty",
      aliases: ["NYX Professional Makeup", "Huda Beauty"],
    },
    {
      slug: "beauty-26-haircare",
      name: "Beauty '26: Haircare",
      group_slug: "beauty",
      group_name: "Beauty",
      aliases: ["Kérastase", "Olaplex"],
    },
    {
      slug: "retail-26-department-stores",
      name: "Retail '26: Department Stores",
      group_slug: "retail",
      group_name: "Retail",
      aliases: ["designer cosmetics"],
    },
  ],
  groups: [
    { slug: "beauty", name: "Beauty", aliases: ["makeup", "skin care"] },
    { slug: "retail", name: "Retail", aliases: [] },
  ],
};

test("normalizeSearchText folds case, accents, and punctuation", () => {
  assert.equal(normalizeSearchText("Make-Up"), "make up");
  assert.equal(normalizeSearchText("Kérastase"), "kerastase");
  assert.equal(normalizeSearchText("e.l.f. Cosmetics"), "e l f cosmetics");
  assert.equal(normalizeSearchText("Levi's"), "levis");
});

test("make up / make-up / makeup all find the Beauty group and Cosmetics theme", () => {
  for (const q of ["makeup", "make up", "make-up", "MAKE UP"]) {
    const keys = collectSiteSearchHits(beautyIndex, q).map((h) => h.key);
    assert.ok(keys.includes("group:beauty"), `${q} → group:beauty`);
    assert.ok(keys.includes("theme:beauty-26-cosmetics"), `${q} → cosmetics theme`);
    assert.ok(!keys.includes("theme:beauty-26-haircare"), `${q} should not hit haircare`);
  }
});

test("spaced and unspaced spellings match each other both ways", () => {
  const keys = collectSiteSearchHits(beautyIndex, "skincare").map((h) => h.key);
  assert.ok(keys.includes("group:beauty"));
});

test("accent-free query finds accented alias", () => {
  const keys = collectSiteSearchHits(beautyIndex, "kerastase").map((h) => h.key);
  assert.ok(keys.includes("theme:beauty-26-haircare"));
});

test("multi-word queries match in any order", () => {
  const keys = collectSiteSearchHits(beautyIndex, "cosmetics beauty").map((h) => h.key);
  assert.ok(keys.includes("theme:beauty-26-cosmetics"));
});

test("theme name matches rank above alias-only matches", () => {
  const keys = collectSiteSearchHits(beautyIndex, "cosmetics").map((h) => h.key);
  const nameHit = keys.indexOf("theme:beauty-26-cosmetics");
  const aliasHit = keys.indexOf("theme:retail-26-department-stores");
  assert.ok(nameHit >= 0 && aliasHit >= 0);
  assert.ok(nameHit < aliasHit);
});

test("short queries match whole-word prefixes, not mid-word substrings", () => {
  const keys = collectSiteSearchHits(sampleIndex, "ai").map((h) => h.key);
  assert.ok(keys.includes("theme:ai-26-gpus"));
  const retailKeys = collectSiteSearchHits(beautyIndex, "ai").map((h) => h.key);
  assert.ok(!retailKeys.includes("group:retail"), "'ai' must not match inside 'retail'");
});

test("typos are spell-corrected against index words", () => {
  const keys = collectSiteSearchHits(beautyIndex, "cosmetcs").map((h) => h.key);
  assert.ok(keys.includes("theme:beauty-26-cosmetics"));
  const olaplex = collectSiteSearchHits(beautyIndex, "olaplx").map((h) => h.key);
  assert.ok(olaplex.includes("theme:beauty-26-haircare"));
  const swapped = collectSiteSearchHits(beautyIndex, "kerastsae").map((h) => h.key);
  assert.ok(swapped.includes("theme:beauty-26-haircare"), "adjacent swap counts as one edit");
});

test("typo correction leaves known words, prefixes, and short words alone", () => {
  assert.equal(correctSearchTypos(beautyIndex, "cosmetics"), null);
  assert.equal(correctSearchTypos(beautyIndex, "cosme"), null);
  assert.equal(correctSearchTypos(beautyIndex, "hda"), null);
  assert.equal(correctSearchTypos(beautyIndex, "cosmetcs beauty"), "cosmetic beauty");
});

test("unrelated words are not forced onto a near match", () => {
  assert.deepEqual(collectSiteSearchHits(beautyIndex, "lipstick"), []);
  assert.deepEqual(collectSiteSearchThemeHits(beautyIndex, "semiconductors"), []);
});
