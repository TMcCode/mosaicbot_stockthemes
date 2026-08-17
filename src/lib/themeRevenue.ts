import type {
  ThemeRevenueConstituentV0,
  ThemeRevenueMetricMapV0,
  ThemeRevenueRevisionsV0,
  ThemeRevenueTableStatsBlockV0,
  ThemeRevenueV0,
} from "@/types/theme.revenue.v0";

export const REVENUE_SIDECAR_SUFFIX = ".revenue.v0.json";

export type RevenueDisplayMode = "growth" | "accel" | "valuation";

export type RevenueColumnDef = {
  id: string;
  label: string;
  tooltip?: string;
  growthKey?: keyof ThemeRevenueMetricMapV0;
  accelKey?: keyof ThemeRevenueMetricMapV0;
  revisionKey?: keyof ThemeRevenueRevisionsV0;
  growthOnly?: boolean;
  hideInAccel?: boolean;
  format: "pct" | "pp" | "ratio" | "bps" | "count";
};

export const REVENUE_GROWTH_COLUMNS: RevenueColumnDef[] = [
  {
    id: "l5q",
    label: "L5Q\nAct",
    tooltip: "YoY growth for the reported quarter five back from LQ. If LQ is 1Q26 this is 1Q25 — the quarter before the current year-ago comp.",
    growthKey: "l5q_rev_act_pct",
    growthOnly: true,
    format: "pct",
  },
  {
    id: "l4q",
    label: "L4Q\nAct",
    tooltip: "YoY growth for the reported quarter four back from LQ. If LQ is 1Q26 this is 2Q25.",
    growthKey: "l4q_rev_act_pct",
    growthOnly: true,
    format: "pct",
  },
  {
    id: "l3q",
    label: "L3Q\nAct",
    tooltip: "YoY growth for the reported quarter three back from LQ. If LQ is 1Q26 this is 3Q25.",
    growthKey: "l3q_rev_act_pct",
    growthOnly: true,
    format: "pct",
  },
  {
    id: "l2q",
    label: "L2Q\nAct",
    tooltip: "YoY growth for the reported quarter before LQ. If LQ is 1Q26 this is 4Q25.",
    growthKey: "l2q_rev_act_pct",
    growthOnly: true,
    format: "pct",
  },
  {
    id: "lq",
    label: "LQ\nAct",
    tooltip: "YoY growth for the most recent reported quarter.",
    growthKey: "lq_rev_act_pct",
    growthOnly: true,
    format: "pct",
  },
  {
    id: "cq",
    label: "CQ\nEst",
    tooltip: "YoY growth for the next unreported quarter.",
    growthKey: "cq_rev_est_pct",
    accelKey: "cq_accel_pp",
    format: "pct",
  },
  {
    id: "nq",
    label: "NQ\nEst",
    tooltip: "YoY growth for the quarter after CQ.",
    growthKey: "nq_rev_est_pct",
    accelKey: "nq_accel_pp",
    format: "pct",
  },
  {
    id: "l2y",
    label: "L2Y\nAct",
    tooltip: "YoY growth for the year before LY (two years ago).",
    growthKey: "l2y_rev_act_pct",
    growthOnly: true,
    format: "pct",
  },
  {
    id: "ly",
    label: "LY\nAct",
    tooltip: "YoY growth for the last reported fiscal/calendar year.",
    growthKey: "ly_rev_act_pct",
    accelKey: "ly_cy_accel_pp",
    format: "pct",
  },
  {
    id: "cy",
    label: "CY\nEst",
    tooltip: "YoY growth for the current year.",
    growthKey: "cy_rev_est_pct",
    accelKey: "cy_ny_accel_pp",
    format: "pct",
  },
  {
    id: "ny",
    label: "NY\nEst",
    tooltip: "YoY growth for next year.",
    growthKey: "ny_rev_est_pct",
    accelKey: "ny_n2y_accel_pp",
    format: "pct",
  },
  {
    id: "n2y",
    label: "N2Y\nEst",
    tooltip: "YoY growth for the year after NY.",
    growthKey: "n2y_rev_est_pct",
    format: "pct",
    hideInAccel: true,
  },
  { id: "trail3y", label: "3Yr\nCAGR", tooltip: "Trailing 3-year revenue CAGR.", growthKey: "trail_3y_cagr_pct", format: "pct", hideInAccel: true },
  { id: "fwd3y", label: "3Y Fwd\nCAGR", tooltip: "Forward 3-year revenue CAGR (CY through N2Y).", growthKey: "fwd_3y_cagr_pct", format: "pct", hideInAccel: true },
];

export const REVENUE_VALUATION_MULTIPLE_COLUMNS: RevenueColumnDef[] = [
  {
    id: "ps_ntm",
    label: "P/S\nNTM",
    tooltip: "Price / next-twelve-months sales (blended remaining CY + NY revenue).",
    growthKey: "ps_ratio_ntm",
    format: "ratio",
  },
  {
    id: "psg_ntm",
    label: "PSG\nNTM",
    tooltip: "P/S NTM divided by CY YoY revenue growth %. Lower is cheaper growth.",
    growthKey: "ps_to_revgrowth",
    format: "ratio",
  },
  {
    id: "ps_ny",
    label: "P/S\nNY",
    tooltip: "Price / next-year sales.",
    growthKey: "ps_ratio_ny",
    format: "ratio",
  },
  {
    id: "psg_ny",
    label: "PSG\nNY",
    tooltip: "P/S NY divided by NY YoY revenue growth %.",
    growthKey: "psg_ny",
    format: "ratio",
  },
  {
    id: "ps_n2y",
    label: "P/S\nN2Y",
    tooltip: "Price / N2Y sales.",
    growthKey: "ps_ratio_n2y",
    format: "ratio",
  },
  {
    id: "psg_n2y",
    label: "PSG\nN2Y",
    tooltip: "P/S N2Y divided by N2Y YoY revenue growth %.",
    growthKey: "psg_n2y",
    format: "ratio",
  },
];

const VALUATION_GROWTH_IDS = new Set(["ly", "cy", "ny", "n2y", "fwd3y"]);

export const REVENUE_VALUATION_COLUMNS: RevenueColumnDef[] = [
  ...REVENUE_GROWTH_COLUMNS.filter((col) => VALUATION_GROWTH_IDS.has(col.id)),
  ...REVENUE_VALUATION_MULTIPLE_COLUMNS,
];

export const REVENUE_REVISION_COLUMNS: RevenueColumnDef[] = [
  { id: "rev_latest", label: "Est Latest\n(%)", revisionKey: "growth_est_latest_pct", format: "pct" },
  { id: "rev_first", label: "Est First\n(%)", revisionKey: "growth_est_first_pct", format: "pct" },
  { id: "rev_delta", label: "Rev Δ\n(bps)", revisionKey: "growth_delta_bps", format: "bps" },
  { id: "rev_low", label: "Est Low\n(%)", revisionKey: "growth_est_low_pct", format: "pct" },
  { id: "rev_high", label: "Est High\n(%)", revisionKey: "growth_est_high_pct", format: "pct" },
  { id: "rev_analysts", label: "#\nAnalysts", revisionKey: "revenue_est_analysts", format: "count" },
];

export type RevenueStatRowKey =
  | "average"
  | "median"
  | "std_dev"
  | "min"
  | "max"
  | "positive_tickers_pct";

export const REVENUE_STAT_ROW_LABELS: Record<RevenueStatRowKey, string> = {
  average: "Average",
  median: "Median",
  std_dev: "Std Dev",
  min: "Min",
  max: "Max",
  positive_tickers_pct: "% Positive Tickers",
};

export function themeRevenueUrl(dataBaseUrl: string, slug: string): string {
  const base = dataBaseUrl.replace(/\/$/, "");
  return `${base}/themes/${encodeURIComponent(slug)}${REVENUE_SIDECAR_SUFFIX}`;
}

export function parseThemeRevenue(raw: string): ThemeRevenueV0 {
  const data = JSON.parse(raw) as ThemeRevenueV0;
  if (data.schema_version !== 0 || !Array.isArray(data.constituents)) {
    throw new Error("Invalid theme.revenue.v0 payload");
  }
  return data;
}

/** Keys added after L2Q; baked Pages copies can lag a sidecar publish. */
export const REVENUE_SEQUENTIAL_LAG_KEYS = [
  "l5q_rev_act_pct",
  "l4q_rev_act_pct",
  "l3q_rev_act_pct",
] as const;

export function revenueSidecarHasSequentialLags(raw: string): boolean {
  try {
    const data = JSON.parse(raw) as ThemeRevenueV0;
    const sample = data.summary ?? data.constituents?.[0]?.growth;
    if (!sample || typeof sample !== "object") return false;
    return REVENUE_SEQUENTIAL_LAG_KEYS.every((key) => key in sample);
  } catch {
    return false;
  }
}

export function revenueHasContent(data: ThemeRevenueV0 | null | undefined): boolean {
  return Boolean(data?.constituents?.length);
}

export function formatRevenuePct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toFixed(1)}`;
}

export function formatRevenuePp(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}`;
}

export function formatRevenueRatio(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return (Math.round(value * 100) / 100).toFixed(2);
}

export function formatRevenueBps(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return String(Math.round(value));
}

export function formatRevenueCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return String(Math.round(value));
}

export function revenueColumnFieldKey(col: RevenueColumnDef, mode: RevenueDisplayMode): string | undefined {
  if (col.revisionKey) return col.revisionKey;
  if (mode === "accel" && col.accelKey) return col.accelKey;
  if (col.growthKey) return col.growthKey;
  return undefined;
}

export function revenueCellValue(
  metrics: ThemeRevenueMetricMapV0 | undefined,
  col: RevenueColumnDef,
  mode: RevenueDisplayMode,
  revisions?: ThemeRevenueRevisionsV0,
): number | null | undefined {
  if (col.revisionKey) return revisions?.[col.revisionKey];
  if (!metrics) return null;
  if (mode === "accel" && col.accelKey) return metrics[col.accelKey];
  if (mode === "accel" && (col.growthOnly || col.hideInAccel)) return null;
  if (col.growthKey) return metrics[col.growthKey];
  return null;
}

export function formatRevenueCell(
  value: number | null | undefined,
  col: RevenueColumnDef,
  mode: RevenueDisplayMode,
): string {
  if (col.revisionKey) {
    if (col.format === "bps") return formatRevenueBps(value);
    if (col.format === "count") return formatRevenueCount(value);
    return formatRevenuePct(value);
  }
  const fmt = mode === "accel" && col.accelKey ? "pp" : col.format;
  if (fmt === "pp") return formatRevenuePp(value);
  if (fmt === "ratio") return formatRevenueRatio(value);
  return formatRevenuePct(value);
}

export function revenueCellClass(value: number | null | undefined, col: RevenueColumnDef): string | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  if (col.format === "ratio" || col.format === "count") return undefined;
  if (value > 0) return "pos";
  if (value < 0) return "neg";
  return undefined;
}

export function revenueStatValue(
  stats: ThemeRevenueTableStatsBlockV0 | undefined,
  rowKey: RevenueStatRowKey,
  col: RevenueColumnDef,
  mode: RevenueDisplayMode,
): number | null | undefined {
  const field = revenueColumnFieldKey(col, mode);
  if (!field || !stats?.[rowKey]) return null;
  const val = stats[rowKey][field];
  return val == null || !Number.isFinite(val) ? null : val;
}

export function buildAcceleratingNote(data: ThemeRevenueV0): string | null {
  const lyCyNy = data.accelerating?.ly_cy_ny ?? [];
  const cyNyN2y = data.accelerating?.cy_ny_n2y ?? [];
  if (!lyCyNy.length && !cyNyN2y.length) return null;
  const parts: string[] = [];
  if (lyCyNy.length) parts.push(`Accelerating LY→CY→NY: ${lyCyNy.join(", ")}`);
  if (cyNyN2y.length) parts.push(`Accelerating CY→NY→N2Y: ${cyNyN2y.join(", ")}`);
  return parts.join(" · ");
}

export function mergeRevenueConstituents(
  detailTickers: { ticker: string; name?: string; weight?: number | null }[],
  revenue: ThemeRevenueV0,
): Array<{
  ticker: string;
  name?: string;
  weight?: number | null;
  revenue: ThemeRevenueConstituentV0;
}> {
  const byTicker = new Map(revenue.constituents.map((c) => [c.ticker.toUpperCase(), c]));
  const order = detailTickers.map((c) => c.ticker.toUpperCase());
  const seen = new Set<string>();
  const rows: Array<{
    ticker: string;
    name?: string;
    weight?: number | null;
    revenue: ThemeRevenueConstituentV0;
  }> = [];

  for (const c of detailTickers) {
    const key = c.ticker.toUpperCase();
    const rev = byTicker.get(key);
    if (!rev) continue;
    seen.add(key);
    rows.push({ ticker: c.ticker, name: c.name, weight: c.weight ?? rev.weight, revenue: rev });
  }
  for (const rev of revenue.constituents) {
    const key = rev.ticker.toUpperCase();
    if (seen.has(key)) continue;
    rows.push({ ticker: rev.ticker, weight: rev.weight, revenue: rev });
  }
  rows.sort((a, b) => order.indexOf(a.ticker.toUpperCase()) - order.indexOf(b.ticker.toUpperCase()));
  return rows;
}

export function filterRevenueColumns(mode: RevenueDisplayMode): RevenueColumnDef[] {
  if (mode === "valuation") return REVENUE_VALUATION_COLUMNS;
  return REVENUE_GROWTH_COLUMNS.filter((col) => {
    if (mode === "accel" && (col.growthOnly || col.hideInAccel)) return false;
    return true;
  });
}
