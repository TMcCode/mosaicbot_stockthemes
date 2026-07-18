import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import { formatQualityRiskValue, mergeQualityRiskConstituents, parseThemeQualityRisk, qualityRiskColumns, themeQualityRiskUrl } from "./themeQualityRisk.ts";

test("parses canonical and likely nested quality/risk fields", () => {
  const parsed = parseThemeQualityRisk(
    JSON.stringify({
      schema_version: 0,
      slug: "ai-infrastructure",
      name: "AI Infrastructure",
      as_of: "2026-07-17",
      summary: {
        quarterly: {
          q_minus_3: { period_end: "2025-09-30", gross_pct: 51.25, ebitda_pct: 29.5 },
          ttm: { gross_margin_pct: 52.4, ebitda_margin_pct: 31.2 },
        },
        fiscal_ebitda: {
          cy: { ebitda_margin_pct: 32.1, type: "estimated", date: "2026-12-31" },
        },
        risk: { net_debt_to_ebitda: 1.234, short_pct_float: 4.5 },
      },
      table_stats: {
        risk: { average: { invest_pct: 12.2, net_debt_to_ebitda: 0.75 } },
      },
      constituents: [
        {
          symbol: "ABC",
          weight: "12.5",
          quarters: [{ label: "Q-3", date: "2025-09-30", gross_margin_pct: 50, ebitda_margin_pct: 20 }],
          ttm_gross_pct: 51,
          ly_ebitda_pct: 19,
          risk_metrics: {
            investment_pct: 8.5,
            fcf_ebitda_pct: 73,
            operating_cash_flow_to_net_income: 1.25,
            interest_coverage_ratio: 6.5,
            yoy_diluted_shares_pct: 2.4,
            altmanZScore: 4.25,
            piotroskiScore: 8,
            fmp_beta: 1.1,
          },
        },
        { ticker: "", risk: { invest_pct: 1 } },
      ],
    }),
  );

  assert.equal(parsed.theme, "AI Infrastructure");
  assert.equal(parsed.constituents.length, 1);
  assert.equal(parsed.constituents[0].ticker, "ABC");
  assert.equal(parsed.constituents[0].quarterly?.q_minus_3?.gross_pct, 50);
  assert.equal(parsed.constituents[0].quarterly?.ttm?.gross_pct, 51);
  assert.equal(parsed.constituents[0].fiscal_ebitda?.ly?.pct, 19);
  assert.equal(parsed.constituents[0].risk?.invest_pct, 8.5);
  assert.equal(parsed.constituents[0].risk?.cfo_to_net_income, 1.25);
  assert.equal(parsed.constituents[0].risk?.interest_coverage, 6.5);
  assert.equal(parsed.constituents[0].risk?.diluted_shares_yoy_pct, 2.4);
  assert.equal(parsed.constituents[0].risk?.altman_z_score, 4.25);
  assert.equal(parsed.constituents[0].risk?.piotroski_score, 8);
  assert.equal(parsed.constituents[0].risk?.beta, 1.1);
  assert.equal(parsed.summary?.fiscal_ebitda?.cy?.kind, "estimate");
  assert.equal(parsed.summary?.risk?.debt_to_ebitda, 1.234);
  assert.equal(parsed.table_stats?.risk?.average?.debt_to_ebitda, 0.75);
});

test("builds encoded sidecar URL and merges detail order case-insensitively", () => {
  const sidecar = parseThemeQualityRisk(
    JSON.stringify({
      schema_version: 0,
      slug: "cloud tools",
      constituents: [
        { ticker: "BBB", weight: 7, risk: { short_float_pct: 3 } },
        { ticker: "aaa", weight: 9, risk: { short_float_pct: 2 } },
        { ticker: "EXTRA", risk: { short_float_pct: 1 } },
      ],
    }),
  );
  const rows = mergeQualityRiskConstituents(
    [
      { ticker: "AAA", name: "Alpha", weight: 10 },
      { ticker: "BBB", name: "Beta" },
      { ticker: "MISSING", name: "Missing" },
    ],
    sidecar,
  );

  assert.equal(
    themeQualityRiskUrl("https://storage.example/data/", "cloud tools"),
    "https://storage.example/data/themes/cloud%20tools.quality_risk.v0.json",
  );
  assert.deepEqual(rows.map((row) => row.ticker), ["AAA", "BBB", "MISSING", "EXTRA"]);
  assert.equal(rows[0].weight, 10);
  assert.equal(rows[1].weight, 7);
  assert.deepEqual(rows[2].metrics, {});
});

test("formats percentages, multiples, and missing values", () => {
  assert.equal(formatQualityRiskValue(12.34, "pct"), "12.3%");
  assert.equal(formatQualityRiskValue(1.236, "multiple"), "1.24x");
  assert.equal(formatQualityRiskValue(3.456, "number"), "3.46");
  assert.equal(formatQualityRiskValue(7.6, "score"), "7.6/9");
  assert.equal(formatQualityRiskValue(Number.NaN, "pct"), "—");
  assert.equal(formatQualityRiskValue(null, "multiple"), "—");
});

test("orders earnings quality, balance sheet, and dilution risk metrics", () => {
  assert.deepEqual(
    qualityRiskColumns("risk").map((column) => column.id),
    [
      "invest_pct",
      "fcf_to_ebitda_pct",
      "cfo_to_net_income",
      "working_capital_drag_pct",
      "stock_comp_pct",
      "debt_to_ebitda",
      "interest_coverage",
      "current_ratio",
      "net_debt_yoy_pct",
      "altman_z_score",
      "piotroski_score",
      "diluted_shares_yoy_pct",
      "beta",
      "short_float_pct",
    ],
  );
});

test("rejects incompatible payloads", () => {
  assert.throws(
    () => parseThemeQualityRisk('{"schema_version":1,"constituents":[]}'),
    /Invalid theme\.quality_risk\.v0 payload/,
  );
});
