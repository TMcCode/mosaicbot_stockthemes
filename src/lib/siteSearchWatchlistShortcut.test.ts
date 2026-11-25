import assert from "node:assert/strict";
import { test } from "node:test";

import { matchesWatchlistSearchQuery } from "./siteSearchWatchlistShortcut.ts";

test("matchesWatchlistSearchQuery accepts watchlist prefixes", () => {
  assert.equal(matchesWatchlistSearchQuery("wat"), true);
  assert.equal(matchesWatchlistSearchQuery("watch"), true);
  assert.equal(matchesWatchlistSearchQuery("watchlist"), true);
  assert.equal(matchesWatchlistSearchQuery("My Watchlist"), true);
  assert.equal(matchesWatchlistSearchQuery("my wat"), true);
});

test("matchesWatchlistSearchQuery rejects unrelated queries", () => {
  assert.equal(matchesWatchlistSearchQuery(""), false);
  assert.equal(matchesWatchlistSearchQuery("wa"), false);
  assert.equal(matchesWatchlistSearchQuery("NVDA"), false);
  assert.equal(matchesWatchlistSearchQuery("water"), false);
});
