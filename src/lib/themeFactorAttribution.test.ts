import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import { availableFactorAttributionHorizons, factorAttributionHasContent, formatSignedPercent, parseThemeFactorAttribution, themeFactorAttributionUrl } from "./themeFactorAttribution.ts";

const fixture = {
  schema_version: "theme.factor_attribution.v0",
  slug: "ai infrastructure",
  as_of: "2026-07-18",
  methodology_version: "core-v1",
  history_method: "reconstructed_current_membership",
  horizons: {
    "1Y": {
      actual_return_pct: 12,
      explained_return_pct: 8,
      theme_specific_return_pct: 4,
      model_r2: 0.62,
      coverage_pct: 100,
      sample_size: 252,
      contributions: [
        {
          factor_id: "MARKET",
          label: "Market",
          contribution_pct: 8,
          factor_return_pct: 10,
          average_beta: 0.8,
        },
      ],
    },
  },
  cohesion: {
    "1Y": {
      median_correlation: 0.6,
      market_adjusted_median_correlation: 0.35,
      valid_constituents: 1,
      coverage_pct: 100,
      constituents: [
        {
          ticker: "aaa",
          correlation_to_theme: 0.6,
          market_adjusted_correlation: 0.35,
          beta_to_theme: 1.1,
          stock_specific_share: 0.64,
          sample_size: 252,
          coverage_pct: 100,
        },
      ],
    },
  },
};

test("parses factor attribution, horizons, and constituent fit", () => {
  const parsed = parseThemeFactorAttribution(JSON.stringify(fixture));
  assert.equal(parsed.horizons["1Y"]?.contributions[0].factor_id, "MARKET");
  assert.equal(parsed.cohesion["1Y"]?.constituents[0].ticker, "AAA");
  assert.deepEqual(availableFactorAttributionHorizons(parsed), ["1Y"]);
  assert.equal(factorAttributionHasContent(parsed), true);
});

test("builds encoded sidecar URL and formats signed values", () => {
  assert.equal(
    themeFactorAttributionUrl("https://storage.example/", "ai infrastructure"),
    "https://storage.example/themes/ai%20infrastructure.factor_attribution.v0.json",
  );
  assert.equal(formatSignedPercent(2.34), "+2.3%");
  assert.equal(formatSignedPercent(-2.34), "−2.3%");
});

test("rejects incompatible schemas", () => {
  assert.throws(
    () => parseThemeFactorAttribution('{"schema_version":"theme.factor_attribution.v1"}'),
    /Unsupported factor attribution schema/,
  );
});
