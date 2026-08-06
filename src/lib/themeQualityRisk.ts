import type {
  ThemeQualityRiskColumnLabelsV0,
  ThemeQualityRiskConstituentV0,
  ThemeQualityRiskFiscalEbitdaPeriodV0,
  ThemeQualityRiskFiscalEbitdaV0,
  ThemeQualityRiskFiscalSlotV0,
  ThemeQualityRiskMetricsV0,
  ThemeQualityRiskModeV0,
  ThemeQualityRiskQuarterlyV0,
  ThemeQualityRiskQuarterSlotV0,
  ThemeQualityRiskReportedQuarterV0,
  ThemeQualityRiskRiskV0,
  ThemeQualityRiskStatRowV0,
  ThemeQualityRiskTableStatsBlockV0,
  ThemeQualityRiskV0,
} from "@/types/theme.quality_risk.v0";

export const QUALITY_RISK_SIDECAR_SUFFIX = ".quality_risk.v0.json";

export type QualityRiskDisplayMode = ThemeQualityRiskModeV0;
export type QualityRiskStatRowKey = keyof ThemeQualityRiskTableStatsBlockV0;

export type QualityRiskColumnDef = {
  id: string;
  label: string;
  tooltip: string;
  format: "pct" | "multiple" | "bps" | "number" | "score";
  getValue: (metrics: ThemeQualityRiskMetricsV0 | undefined) => number | null | undefined;
  getPeriod?: (metrics: ThemeQualityRiskMetricsV0 | undefined) => string | null | undefined;
  getKind?: (
    metrics: ThemeQualityRiskMetricsV0 | undefined,
  ) => ThemeQualityRiskFiscalEbitdaPeriodV0["kind"];
};

export const QUALITY_RISK_STAT_ROW_LABELS: Record<QualityRiskStatRowKey, string> = {
  average: "Average",
  median: "Median",
  std_dev: "Std Dev",
  min: "Min",
  max: "Max",
  positive_tickers_pct: "% Positive Tickers",
};

const QUARTER_SLOTS: ThemeQualityRiskQuarterSlotV0[] = [
  "q_minus_4",
  "q_minus_3",
  "q_minus_2",
  "q_minus_1",
  "lq",
];
const FISCAL_SLOTS: ThemeQualityRiskFiscalSlotV0[] = [
  "l3y",
  "l2y",
  "ly",
  "cy",
  "ny",
  "n2y",
];
const STAT_ROWS: QualityRiskStatRowKey[] = [
  "average",
  "median",
  "std_dev",
  "min",
  "max",
  "positive_tickers_pct",
];

const QUARTER_ALIASES: Record<ThemeQualityRiskQuarterSlotV0, string[]> = {
  q_minus_4: ["q_minus_4", "q_4", "q4", "Q-4"],
  q_minus_3: ["q_minus_3", "q_3", "q3", "Q-3"],
  q_minus_2: ["q_minus_2", "q_2", "q2", "Q-2"],
  q_minus_1: ["q_minus_1", "q_1", "q1", "Q-1"],
  lq: ["lq", "latest", "latest_quarter", "LQ"],
};
const FISCAL_ALIASES: Record<ThemeQualityRiskFiscalSlotV0, string[]> = {
  l3y: ["l3y", "last_3_year", "L3Y"],
  l2y: ["l2y", "last_2_year", "L2Y"],
  ly: ["ly", "last_year", "LY"],
  cy: ["cy", "current_year", "CY"],
  ny: ["ny", "next_year", "NY"],
  n2y: ["n2y", "next_2_year", "N2Y"],
};

function record(value: unknown): Record<string, unknown> | undefined {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function firstRecord(...values: unknown[]): Record<string, unknown> | undefined {
  for (const value of values) {
    const found = record(value);
    if (found) return found;
  }
  return undefined;
}

function firstValue(source: Record<string, unknown> | undefined, keys: string[]): unknown {
  if (!source) return undefined;
  for (const key of keys) {
    if (source[key] !== undefined) return source[key];
  }
  return undefined;
}

function finiteNumber(value: unknown): number | null | undefined {
  if (value == null) return value === null ? null : undefined;
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function text(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function findArraySlot(
  source: Record<string, unknown> | undefined,
  aliases: string[],
): Record<string, unknown> | undefined {
  const entries = source?.quarters ?? source?.periods;
  if (!Array.isArray(entries)) return undefined;
  const wanted = new Set(aliases.map((item) => item.toLowerCase()));
  return entries
    .map(record)
    .find((item) => {
      const label = text(item?.slot ?? item?.label ?? item?.period);
      return label ? wanted.has(label.toLowerCase()) : false;
    });
}

function normalizeQuarter(
  root: Record<string, unknown>,
  slot: ThemeQualityRiskQuarterSlotV0,
): ThemeQualityRiskReportedQuarterV0 | undefined {
  const quarterly = firstRecord(root.quarterly, root.reported_quarters, root.margins);
  const quarters = firstRecord(quarterly?.quarters, root.quarters);
  const aliases = QUARTER_ALIASES[slot];
  const item =
    firstRecord(firstValue(quarterly, aliases), firstValue(quarters, aliases)) ??
    findArraySlot(quarterly, aliases) ??
    findArraySlot(root, aliases);
  const prefix =
    slot === "q_minus_4"
      ? "q4"
      : slot === "q_minus_3"
        ? "q3"
        : slot === "q_minus_2"
          ? "q2"
          : slot === "q_minus_1"
            ? "q1"
            : "lq";
  const periodEnd = text(
    firstValue(item, ["period_end", "date", "fiscal_date"]) ??
      firstValue(quarterly, [`${prefix}_period_end`, `${prefix}_date`]) ??
      firstValue(root, [`${prefix}_period_end`, `${prefix}_date`]),
  );
  const gross = finiteNumber(
    firstValue(item, ["gross_pct", "gross_margin_pct"]) ??
      firstValue(quarterly, [`${prefix}_gross_pct`, `${prefix}_gross_margin_pct`]) ??
      firstValue(root, [`${prefix}_gross_pct`, `${prefix}_gross_margin_pct`]),
  );
  const ebitda = finiteNumber(
    firstValue(item, ["ebitda_pct", "ebitda_margin_pct"]) ??
      firstValue(quarterly, [`${prefix}_ebitda_pct`, `${prefix}_ebitda_margin_pct`]) ??
      firstValue(root, [`${prefix}_ebitda_pct`, `${prefix}_ebitda_margin_pct`]),
  );
  if (periodEnd === undefined && gross === undefined && ebitda === undefined) return undefined;
  return { period_end: periodEnd, gross_pct: gross, ebitda_pct: ebitda };
}

function normalizeQuarterly(root: Record<string, unknown>): ThemeQualityRiskQuarterlyV0 | undefined {
  const out: ThemeQualityRiskQuarterlyV0 = {};
  for (const slot of QUARTER_SLOTS) {
    const quarter = normalizeQuarter(root, slot);
    if (quarter) out[slot] = quarter;
  }
  const quarterly = firstRecord(root.quarterly, root.reported_quarters, root.margins);
  const ttm = firstRecord(quarterly?.ttm, root.ttm, record(root.margins)?.ttm);
  const ttmValue = {
    period_end: text(firstValue(ttm, ["period_end", "date"])),
    gross_pct: finiteNumber(
      firstValue(ttm, ["gross_pct", "gross_margin_pct"]) ??
        firstValue(quarterly, ["ttm_gross_pct", "ttm_gross_margin_pct"]) ??
        firstValue(root, ["ttm_gross_pct", "ttm_gross_margin_pct"]),
    ),
    ebitda_pct: finiteNumber(
      firstValue(ttm, ["ebitda_pct", "ebitda_margin_pct"]) ??
        firstValue(quarterly, ["ttm_ebitda_pct", "ttm_ebitda_margin_pct"]) ??
        firstValue(root, ["ttm_ebitda_pct", "ttm_ebitda_margin_pct"]),
    ),
  };
  if (Object.values(ttmValue).some((value) => value !== undefined)) out.ttm = ttmValue;
  return Object.keys(out).length ? out : undefined;
}

function normalizeFiscal(root: Record<string, unknown>): ThemeQualityRiskFiscalEbitdaV0 | undefined {
  const source = firstRecord(root.fiscal_ebitda, root.ebitda_fiscal, root.fiscal);
  const out: ThemeQualityRiskFiscalEbitdaV0 = {};
  for (const slot of FISCAL_SLOTS) {
    const aliases = FISCAL_ALIASES[slot];
    const item = firstRecord(firstValue(source, aliases));
    const ebitdaPct = finiteNumber(
      firstValue(item, ["ebitda_pct", "ebitda_margin_pct", "pct"]) ??
        firstValue(source, [`${slot}_pct`, `${slot}_ebitda_pct`]) ??
        firstValue(root, [`${slot}_ebitda_pct`]),
    );
    const grossPct = finiteNumber(
      firstValue(item, ["gross_pct", "gross_margin_pct"]) ??
        firstValue(source, [`${slot}_gross_pct`]) ??
        firstValue(root, [`${slot}_gross_pct`]),
    );
    const rawKind =
      text(firstValue(item, ["kind", "type", "status"])) ??
      text(firstValue(source, [`${slot}_kind`]));
    const kind =
      rawKind?.toLowerCase() === "actual"
        ? "actual"
        : rawKind && ["estimate", "estimated", "est"].includes(rawKind.toLowerCase())
          ? "estimate"
          : undefined;
    const periodEnd = text(
      firstValue(item, ["period_end", "date", "fiscal_date"]) ??
        firstValue(source, [`${slot}_period_end`, `${slot}_date`]),
    );
    if (
      ebitdaPct !== undefined ||
      grossPct !== undefined ||
      kind !== undefined ||
      periodEnd !== undefined
    ) {
      out[slot] = {
        pct: ebitdaPct,
        ebitda_pct: ebitdaPct,
        gross_pct: grossPct,
        kind,
        period_end: periodEnd,
      };
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function normalizeRisk(root: Record<string, unknown>): ThemeQualityRiskRiskV0 | undefined {
  const source = firstRecord(root.risk, record(root.quality_risk)?.risk, root.risk_metrics, root);
  const out: ThemeQualityRiskRiskV0 = {
    invest_pct: finiteNumber(firstValue(source, ["invest_pct", "investment_pct"])),
    fcf_to_ebitda_pct: finiteNumber(firstValue(source, ["fcf_to_ebitda_pct", "fcf_ebitda_pct"])),
    cfo_to_net_income: finiteNumber(
      firstValue(source, ["cfo_to_net_income", "operating_cash_flow_to_net_income"]),
    ),
    working_capital_drag_pct: finiteNumber(
      firstValue(source, ["working_capital_drag_pct", "working_capital_to_revenue_pct"]),
    ),
    stock_comp_pct: finiteNumber(firstValue(source, ["stock_comp_pct", "stock_based_comp_pct", "sbc_pct"])),
    debt_to_ebitda: finiteNumber(firstValue(source, ["debt_to_ebitda", "net_debt_to_ebitda"])),
    interest_coverage: finiteNumber(
      firstValue(source, ["interest_coverage", "interest_coverage_ratio"]),
    ),
    current_ratio: finiteNumber(firstValue(source, ["current_ratio"])),
    net_debt_yoy_pct: finiteNumber(
      firstValue(source, ["net_debt_yoy_pct", "yoy_net_debt_pct"]),
    ),
    diluted_shares_yoy_pct: finiteNumber(
      firstValue(source, ["diluted_shares_yoy_pct", "yoy_diluted_shares_pct"]),
    ),
    altman_z_score: finiteNumber(
      firstValue(source, ["altman_z_score", "altmanZScore"]),
    ),
    piotroski_score: finiteNumber(
      firstValue(source, ["piotroski_score", "piotroskiScore"]),
    ),
    beta: finiteNumber(firstValue(source, ["beta", "fmp_beta"])),
    short_float_pct: finiteNumber(firstValue(source, ["short_float_pct", "short_pct_float"])),
    inside_ownership_pct: finiteNumber(
      firstValue(source, [
        "inside_ownership_pct",
        "non_float_pct",
        "percent_insiders",
        "insider_ownership_pct",
      ]),
    ),
  };
  return Object.values(out).some((value) => value !== undefined) ? out : undefined;
}

function normalizeMetrics(value: unknown): ThemeQualityRiskMetricsV0 {
  const root = record(value) ?? {};
  return {
    quarterly: normalizeQuarterly(root),
    fiscal_ebitda: normalizeFiscal(root),
    risk: normalizeRisk(root),
  };
}

function normalizeColumnLabels(value: unknown): ThemeQualityRiskColumnLabelsV0 | undefined {
  const source = record(value);
  if (!source) return undefined;
  const quarterlySource = record(source.quarterly);
  const fiscalSource = record(source.fiscal_ebitda);
  const quarterly: NonNullable<ThemeQualityRiskColumnLabelsV0["quarterly"]> = {};
  const fiscalEbitda: NonNullable<ThemeQualityRiskColumnLabelsV0["fiscal_ebitda"]> = {};
  for (const slot of [...QUARTER_SLOTS, "ttm"] as const) {
    const label = text(quarterlySource?.[slot]);
    if (label) quarterly[slot] = label;
  }
  for (const slot of FISCAL_SLOTS) {
    const label = text(fiscalSource?.[slot]);
    if (label) fiscalEbitda[slot] = label;
  }
  if (!Object.keys(quarterly).length && !Object.keys(fiscalEbitda).length) return undefined;
  return { quarterly, fiscal_ebitda: fiscalEbitda };
}

export function qualityRiskColumns(
  mode: QualityRiskDisplayMode,
  columnLabels?: ThemeQualityRiskColumnLabelsV0,
): QualityRiskColumnDef[] {
  if (mode === "quarterly") {
    const periods: Array<[ThemeQualityRiskQuarterSlotV0, string]> = [
      ["q_minus_4", "Q-4"],
      ["q_minus_3", "Q-3"],
      ["q_minus_2", "Q-2"],
      ["q_minus_1", "Q-1"],
      ["lq", "LQ"],
    ];
    const yearAgoLabel = columnLabels?.quarterly?.q_minus_4 ?? "the same quarter last year";
    const yoyBps = (
      metric: "gross_pct" | "ebitda_pct",
      label: string,
    ): QualityRiskColumnDef => ({
      id: `yoy_qtr_${metric.replace("_pct", "")}_bps`,
      label: `YoY Qtr\n${label}`,
      tooltip: `Latest reported ${label.toLowerCase()} margin change versus ${yearAgoLabel}, in basis points.`,
      format: "bps",
      getValue: (metrics) => {
        const latest = metrics?.quarterly?.lq?.[metric];
        const yearAgo = metrics?.quarterly?.q_minus_4?.[metric];
        return latest != null && yearAgo != null ? (latest - yearAgo) * 100 : null;
      },
      getPeriod: (metrics) => metrics?.quarterly?.q_minus_4?.period_end,
    });
    return [
      {
        id: "ttm_gross_pct",
        label: "TTM\nGross",
        tooltip: "TTM gross margin calculated strictly from reported quarters, with no estimate periods.",
        format: "pct",
        getValue: (metrics) => metrics?.quarterly?.ttm?.gross_pct,
        getPeriod: (metrics) => metrics?.quarterly?.ttm?.period_end,
      },
      ...periods.map(([slot, fallbackLabel]) => {
        const label = columnLabels?.quarterly?.[slot] ?? fallbackLabel;
        return {
          id: `${slot}_gross_pct`,
          label: `${label}\nGross`,
          tooltip: `${label} gross margin from the reported quarter; hover includes available fiscal period end dates.`,
          format: "pct" as const,
          getValue: (metrics: ThemeQualityRiskMetricsV0 | undefined) => metrics?.quarterly?.[slot]?.gross_pct,
          getPeriod: (metrics: ThemeQualityRiskMetricsV0 | undefined) => metrics?.quarterly?.[slot]?.period_end,
        };
      }),
      yoyBps("gross_pct", "Gross"),
      {
        id: "ttm_ebitda_pct",
        label: "TTM\nEBITDA",
        tooltip: "TTM EBITDA margin calculated strictly from reported quarters, with no estimate periods.",
        format: "pct",
        getValue: (metrics) => metrics?.quarterly?.ttm?.ebitda_pct,
        getPeriod: (metrics) => metrics?.quarterly?.ttm?.period_end,
      },
      ...periods.map(([slot, fallbackLabel]) => {
        const label = columnLabels?.quarterly?.[slot] ?? fallbackLabel;
        return {
          id: `${slot}_ebitda_pct`,
          label: `${label}\nEBITDA`,
          tooltip: `${label} EBITDA margin from the reported quarter; hover includes available fiscal period end dates.`,
          format: "pct" as const,
          getValue: (metrics: ThemeQualityRiskMetricsV0 | undefined) => metrics?.quarterly?.[slot]?.ebitda_pct,
          getPeriod: (metrics: ThemeQualityRiskMetricsV0 | undefined) => metrics?.quarterly?.[slot]?.period_end,
        };
      }),
      yoyBps("ebitda_pct", "EBITDA"),
    ];
  }
  if (mode === "fiscal_ebitda") {
    return [
      ...FISCAL_SLOTS.map((slot) => ({
        id: `${slot}_gross_pct`,
        label: `${columnLabels?.fiscal_ebitda?.[slot] ?? slot.toUpperCase()}\nGross`,
        tooltip: `${columnLabels?.fiscal_ebitda?.[slot] ?? slot.toUpperCase()} reported fiscal gross margin. Hover includes the fiscal period end.`,
        format: "pct" as const,
        getValue: (metrics: ThemeQualityRiskMetricsV0 | undefined) =>
          metrics?.fiscal_ebitda?.[slot]?.gross_pct,
        getPeriod: (metrics: ThemeQualityRiskMetricsV0 | undefined) =>
          metrics?.fiscal_ebitda?.[slot]?.period_end,
      })),
      ...FISCAL_SLOTS.map((slot) => ({
        id: `${slot}_ebitda_pct`,
        label: `${columnLabels?.fiscal_ebitda?.[slot] ?? slot.toUpperCase()}\nEBITDA`,
        tooltip: `${columnLabels?.fiscal_ebitda?.[slot] ?? slot.toUpperCase()} fiscal EBITDA margin; E denotes an estimate. Hover includes the fiscal period end.`,
        format: "pct" as const,
        getValue: (metrics: ThemeQualityRiskMetricsV0 | undefined) =>
          metrics?.fiscal_ebitda?.[slot]?.ebitda_pct,
        getPeriod: (metrics: ThemeQualityRiskMetricsV0 | undefined) =>
          metrics?.fiscal_ebitda?.[slot]?.period_end,
        getKind: (metrics: ThemeQualityRiskMetricsV0 | undefined) =>
          metrics?.fiscal_ebitda?.[slot]?.kind,
      })),
    ];
  }
  return [
    {
      id: "invest_pct",
      label: "Invest\n%",
      tooltip: "R&D plus capital expenditures as a percentage of TTM revenue. Higher values mean heavier reinvestment, which can support growth but also raises execution and cash-spending risk. Compare with similar businesses.",
      format: "pct",
      getValue: (metrics) => metrics?.risk?.invest_pct,
    },
    {
      id: "fcf_to_ebitda_pct",
      label: "FCF /\nEBITDA",
      tooltip: "TTM free cash flow as a percentage of TTM EBITDA. Higher is generally better: above 100% is strong conversion, while low or negative values indicate weak cash conversion. Working-capital cycles can make individual periods noisy.",
      format: "pct",
      getValue: (metrics) => metrics?.risk?.fcf_to_ebitda_pct,
    },
    {
      id: "cfo_to_net_income",
      label: "CFO /\nNet Income",
      tooltip: "TTM operating cash flow divided by TTM net income. Around 1x or higher generally supports reported earnings quality; persistently below 1x can signal heavy accruals. Not meaningful when net income is zero or negative.",
      format: "multiple",
      getValue: (metrics) => metrics?.risk?.cfo_to_net_income,
    },
    {
      id: "working_capital_drag_pct",
      label: "WC Drag /\nRevenue",
      tooltip: "TTM change in working capital as a percentage of TTM revenue. Positive values indicate cash consumed by receivables, inventory, or other working capital; negative values indicate a cash release. Large positive values are generally riskier.",
      format: "pct",
      getValue: (metrics) => metrics?.risk?.working_capital_drag_pct,
    },
    {
      id: "stock_comp_pct",
      label: "StockComp\n%",
      tooltip: "TTM stock-based compensation as a percentage of TTM revenue. Lower is generally better for existing shareholders; high or rising values indicate greater dilution risk. Compare with peers and growth rate.",
      format: "pct",
      getValue: (metrics) => metrics?.risk?.stock_comp_pct,
    },
    {
      id: "debt_to_ebitda",
      label: "Debt /\nEBITDA",
      tooltip: "Net debt divided by TTM EBITDA. Lower is generally safer: below 2x is often modest, 2–4x is moderate, and above 4x is elevated. Thresholds vary by industry, and the ratio is not meaningful with negative EBITDA.",
      format: "multiple",
      getValue: (metrics) => metrics?.risk?.debt_to_ebitda,
    },
    {
      id: "interest_coverage",
      label: "Interest\nCoverage",
      tooltip: "TTM operating income divided by absolute TTM interest expense. Higher is safer: above 5x is generally comfortable, 2–5x is moderate, and below 2x suggests limited debt-service headroom. Industry capital intensity matters.",
      format: "multiple",
      getValue: (metrics) => metrics?.risk?.interest_coverage,
    },
    {
      id: "current_ratio",
      label: "Current\nRatio",
      tooltip: "Latest reported current assets divided by current liabilities. Above 1x means current assets cover current obligations; below 1x can indicate tighter liquidity. Very high values may also signal inefficient working capital.",
      format: "multiple",
      getValue: (metrics) => metrics?.risk?.current_ratio,
    },
    {
      id: "net_debt_yoy_pct",
      label: "Net Debt\nYoY",
      tooltip: "Net debt change versus the same reported quarter one year earlier. Positive means leverage increased and is generally riskier; negative means debt declined or cash increased. Not meaningful when prior-year net debt was zero or negative.",
      format: "pct",
      getValue: (metrics) => metrics?.risk?.net_debt_yoy_pct,
    },
    {
      id: "altman_z_score",
      label: "Altman\nZ-Score",
      tooltip: "Current FMP bankruptcy-risk score. Above 2.99 is traditionally considered safer, 1.81–2.99 is the gray zone, and below 1.81 signals elevated distress risk. The original model is less meaningful for banks, insurers, utilities, and some non-manufacturers.",
      format: "number",
      getValue: (metrics) => metrics?.risk?.altman_z_score,
    },
    {
      id: "piotroski_score",
      label: "Piotroski\nScore",
      tooltip: "Current FMP financial-strength score from 0 to 9. Higher is stronger: 7–9 is generally strong, 4–6 is mixed, and 0–3 is weak. It combines profitability, leverage/liquidity, and operating-efficiency signals.",
      format: "score",
      getValue: (metrics) => metrics?.risk?.piotroski_score,
    },
    {
      id: "diluted_shares_yoy_pct",
      label: "Diluted Shares\nYoY",
      tooltip: "Diluted weighted-average share count change versus the same reported quarter one year earlier. Positive values indicate dilution; negative values usually indicate net share repurchases. Lower is generally better for existing shareholders.",
      format: "pct",
      getValue: (metrics) => metrics?.risk?.diluted_shares_yoy_pct,
    },
    {
      id: "beta",
      label: "FMP\nBeta",
      tooltip: "Current market beta reported by FMP. Around 1 means market-like sensitivity, above 1 indicates greater market sensitivity, and below 1 indicates lower sensitivity. FMP does not expose a historical series or calculation window here.",
      format: "number",
      getValue: (metrics) => metrics?.risk?.beta,
    },
    {
      id: "short_float_pct",
      label: "Short %\nFloat",
      tooltip: "Shares sold short as a percentage of public float. Higher values indicate greater bearish positioning and potential financing or sentiment concern, but can also increase short-squeeze risk. Compare with sector peers.",
      format: "pct",
      getValue: (metrics) => metrics?.risk?.short_float_pct,
    },
    {
      id: "inside_ownership_pct",
      label: "Non-float\n%",
      tooltip:
        "Share of outstanding equity that is not free float (100 − free float). Includes closely held, restricted, strategic, and similar non-tradable supply. Higher values mean thinner public float and can amplify price moves. Sourced from FMP shares-float; not the same as Form 4 officer ownership.",
      format: "pct",
      getValue: (metrics) => metrics?.risk?.inside_ownership_pct,
    },
  ];
}

function normalizeStatRow(value: unknown, mode: QualityRiskDisplayMode): ThemeQualityRiskStatRowV0 {
  const metrics = normalizeMetrics(value);
  const source = record(value);
  const out: ThemeQualityRiskStatRowV0 = {};
  for (const column of qualityRiskColumns(mode)) {
    out[column.id] = column.getValue(metrics) ?? finiteNumber(source?.[column.id]);
  }
  return out;
}

function normalizeStats(value: unknown, mode: QualityRiskDisplayMode): ThemeQualityRiskTableStatsBlockV0 | undefined {
  const source = record(value);
  if (!source) return undefined;
  const out: ThemeQualityRiskTableStatsBlockV0 = {};
  for (const row of STAT_ROWS) {
    if (source[row] !== undefined) out[row] = normalizeStatRow(source[row], mode);
  }
  return Object.keys(out).length ? out : undefined;
}

export function parseThemeQualityRisk(raw: string): ThemeQualityRiskV0 {
  const input = record(JSON.parse(raw));
  if (!input || input.schema_version !== 0 || !Array.isArray(input.constituents)) {
    throw new Error("Invalid theme.quality_risk.v0 payload");
  }
  const constituents = input.constituents.flatMap((value): ThemeQualityRiskConstituentV0[] => {
    const item = record(value);
    const ticker = text(item?.ticker ?? item?.symbol);
    if (!item || !ticker) return [];
    return [{ ticker, weight: finiteNumber(item.weight), ...normalizeMetrics(item) }];
  });
  const statsRoot = record(input.table_stats);
  return {
    schema_version: 0,
    slug: text(input.slug) ?? "",
    theme: text(input.theme ?? input.name) ?? undefined,
    as_of: text(input.as_of) ?? undefined,
    column_labels: normalizeColumnLabels(input.column_labels),
    summary: normalizeMetrics(input.summary ?? input.theme_summary),
    table_stats: {
      quarterly: normalizeStats(statsRoot?.quarterly ?? statsRoot?.reported_quarters, "quarterly"),
      fiscal_ebitda: normalizeStats(statsRoot?.fiscal_ebitda ?? statsRoot?.fiscal, "fiscal_ebitda"),
      risk: normalizeStats(statsRoot?.risk, "risk"),
    },
    constituents,
  };
}

export function themeQualityRiskUrl(dataBaseUrl: string, slug: string): string {
  return `${dataBaseUrl.replace(/\/$/, "")}/themes/${encodeURIComponent(slug)}${QUALITY_RISK_SIDECAR_SUFFIX}`;
}

export function qualityRiskHasContent(data: ThemeQualityRiskV0 | null | undefined): boolean {
  return Boolean(data?.constituents.length);
}

export function formatQualityRiskValue(
  value: number | null | undefined,
  format: QualityRiskColumnDef["format"],
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (format === "multiple") return `${value.toFixed(2)}x`;
  if (format === "bps") return `${value > 0 ? "+" : ""}${Math.round(value)} bps`;
  if (format === "number") return value.toFixed(2);
  if (format === "score") {
    return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}/9`;
  }
  return `${value.toFixed(1)}%`;
}

export function mergeQualityRiskConstituents(
  detailTickers: { ticker: string; name?: string; weight?: number | null }[],
  qualityRisk: ThemeQualityRiskV0,
): Array<{
  ticker: string;
  name?: string;
  weight?: number | null;
  metrics: ThemeQualityRiskMetricsV0;
}> {
  const byTicker = new Map(qualityRisk.constituents.map((item) => [item.ticker.toUpperCase(), item]));
  const rows = detailTickers.map((item) => {
    const sidecar = byTicker.get(item.ticker.toUpperCase());
    return {
      ticker: item.ticker,
      name: item.name,
      weight: item.weight ?? sidecar?.weight,
      metrics: sidecar ? normalizeMetrics(sidecar) : {},
    };
  });
  const seen = new Set(detailTickers.map((item) => item.ticker.toUpperCase()));
  for (const item of qualityRisk.constituents) {
    if (!seen.has(item.ticker.toUpperCase())) {
      rows.push({
        ticker: item.ticker,
        name: undefined,
        weight: item.weight,
        metrics: normalizeMetrics(item),
      });
    }
  }
  return rows;
}
