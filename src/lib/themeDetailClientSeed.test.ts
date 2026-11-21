import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { themeDetailPublicSeed } from "./themeDetailClientSeed";
import type { ThemeDetailV0 } from "@/types/theme.detail.v0";

describe("themeDetailPublicSeed", () => {
  it("strips weights, returns, and charts from Flight/HTML seed", () => {
    const detail = {
      schema_version: 0,
      slug: "demo",
      name: "Demo",
      as_of: "2026-01-01T00:00:00Z",
      chart_1y: {
        performance: { dates: ["2025-01-01"], values: [100] },
        composition_indexed: { series: [] },
      },
      compare_returns: { metrics: { "1D": 1.2 } },
      constituent_table_stats: { theme_return: { "1D": 1 } },
      constituents: [
        {
          ticker: "AAA",
          name: "Alpha",
          weight: 40,
          market_cap_usd: 1e9,
          price_returns: { metrics: { "1D": 2 } },
        },
        {
          ticker: "BBB",
          name: "Beta",
          weight: 60,
          market_cap_usd: 2e9,
        },
      ],
    } as ThemeDetailV0;

    const seed = themeDetailPublicSeed(detail);
    assert.equal(seed.chart_1y, undefined);
    assert.equal(seed.compare_returns, undefined);
    assert.equal(seed.constituent_table_stats, undefined);
    assert.equal(seed.constituents.length, 2);
    for (const c of seed.constituents) {
      assert.equal(c.weight, 1);
      assert.equal(c.market_cap_usd, undefined);
      assert.equal(c.price_returns, undefined);
    }
    assert.equal(seed.constituents[0].ticker, "AAA");
    assert.equal(seed.constituents[0].name, "Alpha");
  });
});
