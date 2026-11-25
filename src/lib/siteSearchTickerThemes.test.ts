import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import {
  SEARCH_TICKER_THEME_PREVIEW,
  sliceTickerThemesForSearch,
} from "./siteSearchTickerThemes.ts";

test("null limit shows all themes", () => {
  const slugs = ["a", "b", "c", "d", "e"];
  const { shown, moreCount } = sliceTickerThemesForSearch(slugs, ["A", "B", "C", "D", "E"], null);
  assert.equal(shown.length, 5);
  assert.equal(moreCount, 0);
});

test("compact limit shows preview + more count", () => {
  const slugs = ["a", "b", "c", "d", "e"];
  const { shown, moreCount } = sliceTickerThemesForSearch(
    slugs,
    ["A", "B", "C", "D", "E"],
    SEARCH_TICKER_THEME_PREVIEW,
  );
  assert.deepEqual(
    shown.map((x: { slug: string }) => x.slug),
    ["a", "b", "c", "d"],
  );
  assert.equal(moreCount, 1);
});

test("fewer than limit has no more link", () => {
  const { shown, moreCount } = sliceTickerThemesForSearch(["a", "b"], ["A", "B"], 4);
  assert.equal(shown.length, 2);
  assert.equal(moreCount, 0);
});
