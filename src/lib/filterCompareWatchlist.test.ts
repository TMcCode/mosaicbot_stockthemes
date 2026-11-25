import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import {
  filterRowsBySlugSet,
  resolveCompareWatchlistSlugFilter,
  toSlugSet,
} from "./filterCompareWatchlist.ts";

test("empty scopes return null filter", () => {
  assert.equal(
    resolveCompareWatchlistSlugFilter({
      myWatchlist: false,
      topPicks: false,
      viewMode: "themes",
      myThemeSlugs: new Set(["a"]),
      topPickThemeSlugs: new Set(["b"]),
      topPickGroupSlugs: new Set(["g"]),
      themeRowsForGroupMembership: [],
    }),
    null,
  );
});

test("unions theme slugs when both scopes are on", () => {
  const set = resolveCompareWatchlistSlugFilter({
    myWatchlist: true,
    topPicks: true,
    viewMode: "themes",
    myThemeSlugs: new Set(["mine"]),
    topPickThemeSlugs: new Set(["pick"]),
    topPickGroupSlugs: new Set(["g1"]),
    themeRowsForGroupMembership: [],
  });
  assert.deepEqual(set, new Set(["mine", "pick"]));
});

test("Top Picks groups come from ETL; My groups from theme rows", () => {
  const set = resolveCompareWatchlistSlugFilter({
    myWatchlist: true,
    topPicks: true,
    viewMode: "groups",
    myThemeSlugs: new Set(["theme-a"]),
    topPickThemeSlugs: new Set(["theme-b"]),
    topPickGroupSlugs: new Set(["editor-group"]),
    themeRowsForGroupMembership: [
      { slug: "theme-a", groupSlug: "my-group" },
      { slug: "theme-x", groupSlug: "other" },
    ],
  });
  assert.deepEqual(set, new Set(["editor-group", "my-group"]));
});

test("filterRowsBySlugSet passes through when null", () => {
  const rows = [{ slug: "a" }, { slug: "b" }];
  assert.deepEqual(filterRowsBySlugSet(rows, null), rows);
});

test("filterRowsBySlugSet filters by slug set", () => {
  const rows = [{ slug: "a" }, { slug: "b" }, { slug: "c" }];
  assert.deepEqual(filterRowsBySlugSet(rows, toSlugSet(["b", "c"])), [
    { slug: "b" },
    { slug: "c" },
  ]);
});
