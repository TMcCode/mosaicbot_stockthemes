import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import { mergeThemeDetailLiveFields } from "./liveThemeDetailStore.ts";
import type { ThemeDetailV0 } from "../types/theme.detail.v0.ts";

function themeDetail(overrides: Partial<ThemeDetailV0> = {}): ThemeDetailV0 {
  return {
    schema_version: 0,
    slug: "demo-theme",
    name: "Demo Theme",
    as_of: "2026-08-28T00:00:00Z",
    constituents: [{ ticker: "AAPL" }],
    ...overrides,
  };
}

test("mergeThemeDetailLiveFields copies has_ticker_notes from full live JSON", () => {
  const server = themeDetail();
  const live = themeDetail({ has_ticker_notes: true });
  const merged = mergeThemeDetailLiveFields(server, live, { prices: false });
  assert.equal(merged.has_ticker_notes, true);
});

test("mergeThemeDetailLiveFields does not clear has_ticker_notes when live omits flag", () => {
  const server = themeDetail({ has_ticker_notes: true });
  const live = themeDetail();
  const merged = mergeThemeDetailLiveFields(server, live, { prices: false });
  assert.equal(merged.has_ticker_notes, true);
});

test("mergeThemeDetailLiveFields restores weight and market_cap_usd from Tier B live", () => {
  const server = themeDetail({
    constituents: [{ ticker: "AAPL", name: "Apple", weight: 1 }],
  });
  const live = themeDetail({
    constituents: [{ ticker: "AAPL", weight: 0.12, market_cap_usd: 3.1e12 }],
  });
  const merged = mergeThemeDetailLiveFields(server, live, { prices: false });
  assert.equal(merged.constituents[0]?.weight, 0.12);
  assert.equal(merged.constituents[0]?.market_cap_usd, 3.1e12);
  assert.equal(merged.constituents[0]?.name, "Apple");
});
