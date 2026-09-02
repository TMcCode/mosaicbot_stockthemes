import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import {
  dayReturnPctByOverlayKeyFromCompareBundles,
  dayReturnPctForTickerFromPriceReturnsSidecar,
  primaryThemeSlugForTicker,
} from "./overlayItemLiveTail.ts";
// @ts-expect-error Node's type-stripping test runner requires the source extension.
import { maybeExtendIndexedPerformanceFromLiveDayReturn } from "./extendCompositionLiveTail.ts";

test("maps theme and group compare 1D onto overlay item keys", () => {
  const mapped = dayReturnPctByOverlayKeyFromCompareBundles(
    {
      schema_version: 0,
      as_of: "2026-09-02T12:00:00Z",
      rows: [
        {
          slug: "ai-24-ai-software",
          name: "AI Software",
          compare_returns: { metrics: { "1D": -1.74 } },
        },
      ],
    },
    {
      schema_version: 0,
      as_of: "2026-09-02T12:00:00Z",
      rows: [
        {
          slug: "ai-24",
          name: "AI",
          compare_returns: { metrics: { "1D": -0.9 } },
        },
      ],
    },
  );
  assert.equal(mapped["theme:ai-24-ai-software"], -1.74);
  assert.equal(mapped["group:ai-24"], -0.9);
});

test("resolves ticker 1D from theme price_returns sidecar", () => {
  const dayReturn = dayReturnPctForTickerFromPriceReturnsSidecar(
    {
      schema_version: "theme.price_returns.v0",
      slug: "ai-24-ai-software",
      name: "AI Software",
      as_of: "2026-09-02T12:00:00Z",
      constituents: [
        { ticker: "ADBE", price_returns: { metrics: { "1D": -1.78 } } },
        { ticker: "AAPL", price_returns: { metrics: { "1D": 0.55 } } },
      ],
    },
    "aapl",
  );
  assert.equal(dayReturn, 0.55);
});

test("picks first theme slug for a ticker from search index", () => {
  const slug = primaryThemeSlugForTicker(
    {
      schema_version: 0,
      as_of: "2026-09-02",
      tickers: [
        {
          ticker: "AAPL",
          name: "Apple",
          theme_slugs: ["big-tech-24-consumer", "ai-24-ai-software"],
        },
      ],
      themes: [],
      groups: [],
    },
    "AAPL",
  );
  assert.equal(slug, "big-tech-24-consumer");
});

test("extends overlay performance with live session 1D", () => {
  const next = maybeExtendIndexedPerformanceFromLiveDayReturn(
    { dates: ["2026-08-31", "2026-09-01"], values: [100, 102] },
    "2026-09-02",
    -2,
  );
  assert.deepEqual(next?.dates, ["2026-08-31", "2026-09-01", "2026-09-02"]);
  assert.equal(next?.values?.[2], Math.round(102 * 0.98 * 10_000) / 10_000);
});
