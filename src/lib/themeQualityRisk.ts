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
  format: "pct" | "multiple";
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
  "q_minus_3",
  "q_minus_2",
  "q_minus_1",
  "lq",
];
const FISCAL_SLOTS: ThemeQualityRiskFiscalSlotV0[] = ["ly", "cy", "ny", "n2y"];
const STAT_ROWS: QualityRiskStatRowKey[] = [
  "average",
  "median",
  "std_dev",
  "min",
  "max",
  "positive_tickers_pct",
];

const QUARTER_ALIASES: Record<ThemeQualityRiskQuarterSlotV0, string[]> = {
  q_minus_3: ["q_minus_3", "q_3", "q3", "Q-3"],
  q_minus_2: ["q_minus_2", "q_2", "q2", "Q-2"],
  q_minus_1: ["q_minus_1", "q_1", "q1", "Q-1"],
  lq: ["lq", "latest", "latest_quarter", "LQ"],
};
const FISCAL_ALIASES: Record<ThemeQualityRiskFiscalSlotV0, string[]> = {
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
  const prefix = slot === "q_minus_3" ? "q3" : slot === "q_minus_2" ? "q2" : slot === "q_minus_1" ? "q1" : "lq";
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
    const pct = finiteNumber(
      firstValue(item, ["pct", "ebitda_pct", "ebitda_margin_pct"]) ??
        firstValue(source, [`${slot}_pct`, `${slot}_ebitda_pct`]) ??
        firstValue(root, [`${slot}_ebitda_pct`]),
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
    if (pct !== undefined || kind !== undefined || periodEnd !== undefined) {
      out[slot] = { pct, kind, period_end: periodEnd };
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function normalizeRisk(root: Record<string, unknown>): ThemeQualityRiskRiskV0 | undefined {
  const source = firstRecord(root.risk, record(root.quality_risk)?.risk, root.risk_metrics, root);
  const out: ThemeQualityRiskRiskV0 = {
    invest_pct: finiteNumber(firstValue(source, ["invest_pct", "investment_pct"])),
    fcf_to_ebitda_pct: finiteNumber(firstValue(source, ["fcf_to_ebitda_pct", "fcf_ebitda_pct"])),
    stock_comp_pct: finiteNumber(firstValue(source, ["stock_comp_pct", "stock_based_comp_pct", "sbc_pct"])),
    debt_to_ebitda: finiteNumber(firstValue(source, ["debt_to_ebitda", "net_debt_to_ebitda"])),
    short_float_pct: finiteNumber(firstValue(source, ["short_float_pct", "short_pct_float"])),
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
      ["q_minus_3", "Q-3"],
      ["q_minus_2", "Q-2"],
      ["q_minus_1", "Q-1"],
      ["lq", "LQ"],
    ];
    return [
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
          id: `${slot}_ebitda_pct`,
          label: `${label}\nEBITDA`,
          tooltip: `${label} EBITDA margin from the reported quarter; hover includes available fiscal period end dates.`,
          format: "pct" as const,
          getValue: (metrics: ThemeQualityRiskMetricsV0 | undefined) => metrics?.quarterly?.[slot]?.ebitda_pct,
          getPeriod: (metrics: ThemeQualityRiskMetricsV0 | undefined) => metrics?.quarterly?.[slot]?.period_end,
        };
      }),
      {
        id: "ttm_ebitda_pct",
        label: "TTM\nEBITDA",
        tooltip: "TTM EBITDA margin calculated strictly from reported quarters, with no estimate periods.",
        format: "pct",
        getValue: (metrics) => metrics?.quarterly?.ttm?.ebitda_pct,
        getPeriod: (metrics) => metrics?.quarterly?.ttm?.period_end,
      },
    ];
  }
  if (mode === "fiscal_ebitda") {
    return FISCAL_SLOTS.map((slot) => ({
      id: `${slot}_ebitda_pct`,
      label: `${columnLabels?.fiscal_ebitda?.[slot] ?? slot.toUpperCase()}\nEBITDA`,
      tooltip: `${columnLabels?.fiscal_ebitda?.[slot] ?? slot.toUpperCase()} fiscal EBITDA margin; E denotes an estimate. Hover includes the fiscal period end.`,
      format: "pct",
      getValue: (metrics) => metrics?.fiscal_ebitda?.[slot]?.pct,
      getPeriod: (metrics) => metrics?.fiscal_ebitda?.[slot]?.period_end,
      getKind: (metrics) => metrics?.fiscal_ebitda?.[slot]?.kind,
    }));
  }
  return [
    {
      id: "invest_pct",
      label: "Invest\n%",
      tooltip: "Invest = (R&D + CapEx) / TTM revenue.",
      format: "pct",
      getValue: (metrics) => metrics?.risk?.invest_pct,
    },
    {
      id: "fcf_to_ebitda_pct",
      label: "FCF /\nEBITDA",
      tooltip: "FCF/EBITDA measures TTM free-cash-flow conversion from TTM EBITDA.",
      format: "pct",
      getValue: (metrics) => metrics?.risk?.fcf_to_ebitda_pct,
    },
    {
      id: "stock_comp_pct",
      label: "StockComp\n%",
      tooltip: "TTM stock-based compensation as a percentage of TTM revenue.",
      format: "pct",
      getValue: (metrics) => metrics?.risk?.stock_comp_pct,
    },
    {
      id: "debt_to_ebitda",
      label: "Debt /\nEBITDA",
      tooltip: "Debt/EBITDA uses net debt divided by TTM EBITDA.",
      format: "multiple",
      getValue: (metrics) => metrics?.risk?.debt_to_ebitda,
    },
    {
      id: "short_float_pct",
      label: "Short %\nFloat",
      tooltip: "Shares sold short as a percentage of public float.",
      format: "pct",
      getValue: (metrics) => metrics?.risk?.short_float_pct,
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
  return format === "multiple" ? `${value.toFixed(2)}x` : `${value.toFixed(1)}%`;
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
