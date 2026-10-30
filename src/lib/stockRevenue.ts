import { stockTierBUrl } from "@/lib/stockTierB";
import type {
  StockRevenueTableStatsV0,
  StockRevenueThemeRowV0,
  StockRevenueV0,
  StockRevisionPosDeltaKey,
} from "@/types/stock.revenue.v0";
import type {
  ThemeRevenueMetricMapV0,
  ThemeRevenueRevisionsV0,
} from "@/types/theme.revenue.v0";

export const STOCK_REVENUE_SIDECAR_SUFFIX = ".revenue.v0.json";

export const STOCK_REVISION_POS_DELTA_KEYS: StockRevisionPosDeltaKey[] = [
  "growth_delta_bps",
  "cy_growth_delta_bps",
  "ny_growth_delta_bps",
];

/** Stock Rev Revisions columns for transposed % Positive under CQ/CY/NY Rev Δ. */
export const STOCK_REVISION_POS_COLUMNS: {
  id: string;
  label: string;
  tooltip: string;
  deltaKey: StockRevisionPosDeltaKey;
  statsKey: string;
}[] = [
  {
    id: "pos_cq_delta",
    label: "% Pos\nCQ Δ",
    tooltip:
      "Share of theme constituents with a positive CQ Rev Δ (bps). Same as theme-page % Positive Tickers under CQ Rev Δ.",
    deltaKey: "growth_delta_bps",
    statsKey: "pos_growth_delta_bps",
  },
  {
    id: "pos_cy_delta",
    label: "% Pos\nCY Δ",
    tooltip:
      "Share of theme constituents with a positive CY Rev Δ (bps). Same as theme-page % Positive Tickers under CY Rev Δ.",
    deltaKey: "cy_growth_delta_bps",
    statsKey: "pos_cy_growth_delta_bps",
  },
  {
    id: "pos_ny_delta",
    label: "% Pos\nNY Δ",
    tooltip:
      "Share of theme constituents with a positive NY Rev Δ (bps). Same as theme-page % Positive Tickers under NY Rev Δ.",
    deltaKey: "ny_growth_delta_bps",
    statsKey: "pos_ny_growth_delta_bps",
  },
];

function asFiniteNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseNumberMap(raw: unknown): Record<string, number> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, number> = {};
  let any = false;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = asFiniteNumber(v);
    if (n == null) continue;
    out[k] = n;
    any = true;
  }
  return any ? out : undefined;
}

function parseMetricMap(raw: unknown): ThemeRevenueMetricMapV0 | undefined {
  return parseNumberMap(raw) as ThemeRevenueMetricMapV0 | undefined;
}

function parseRevisionsMap(raw: unknown): ThemeRevenueRevisionsV0 | undefined {
  return parseNumberMap(raw) as ThemeRevenueRevisionsV0 | undefined;
}

function parsePosDeltaMap(
  raw: unknown,
): Partial<Record<StockRevisionPosDeltaKey, number | null>> | undefined {
  const map = parseNumberMap(raw);
  if (!map) return undefined;
  const out: Partial<Record<StockRevisionPosDeltaKey, number | null>> = {};
  let any = false;
  for (const key of STOCK_REVISION_POS_DELTA_KEYS) {
    if (map[key] == null) continue;
    out[key] = map[key];
    any = true;
  }
  return any ? out : undefined;
}

function parseThemeRow(raw: unknown): StockRevenueThemeRowV0 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const slug = typeof o.slug === "string" ? o.slug.trim() : "";
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!slug || !name) return null;
  const row: StockRevenueThemeRowV0 = { slug, name };
  if (typeof o.group_slug === "string" && o.group_slug.trim()) row.group_slug = o.group_slug.trim();
  if (typeof o.group_name === "string" && o.group_name.trim()) row.group_name = o.group_name.trim();
  const w = asFiniteNumber(o.weight);
  if (w != null) row.weight = w;
  const metrics = parseMetricMap(o.metrics);
  if (metrics) row.metrics = metrics;
  const revisions = parseRevisionsMap(o.revisions);
  if (revisions) row.revisions = revisions;
  const pos = parsePosDeltaMap(o.positive_tickers_pct);
  if (pos) row.positive_tickers_pct = pos;
  return row;
}

function parseStatsBlock(raw: unknown): StockRevenueTableStatsV0 | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const out: StockRevenueTableStatsV0 = {};
  for (const key of ["weighted", "average", "median"] as const) {
    const block = parseNumberMap(o[key]);
    if (!block) continue;
    const weight = asFiniteNumber((o[key] as Record<string, unknown> | undefined)?.weight);
    out[key] = weight != null ? { ...block, weight } : block;
  }
  return out.weighted || out.average || out.median ? out : undefined;
}

export function parseStockRevenue(raw: string | unknown): StockRevenueV0 | null {
  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!data || typeof data !== "object") return null;
    const o = data as Record<string, unknown>;
    const ticker = typeof o.ticker === "string" ? o.ticker.trim().toUpperCase() : "";
    if (!ticker) return null;
    const themesRaw = Array.isArray(o.themes) ? o.themes : [];
    const themes = themesRaw
      .map(parseThemeRow)
      .filter((t): t is StockRevenueThemeRowV0 => t != null);
    const out: StockRevenueV0 = {
      schema_version: typeof o.schema_version === "string" ? o.schema_version : "stock.revenue.v0",
      ticker,
      as_of: typeof o.as_of === "string" ? o.as_of : "",
      themes,
    };
    if (typeof o.name === "string" && o.name.trim()) out.name = o.name.trim();
    if (typeof o.aggregation === "string") out.aggregation = o.aggregation;
    if (typeof o.note === "string") out.note = o.note;
    const tickerMetrics = parseMetricMap(o.ticker_metrics);
    if (tickerMetrics) out.ticker_metrics = tickerMetrics;
    const tickerRevisions = parseRevisionsMap(o.ticker_revisions);
    if (tickerRevisions) out.ticker_revisions = tickerRevisions;
    const stats = parseStatsBlock(o.table_stats);
    if (stats) out.table_stats = stats;
    const revStats = parseStatsBlock(o.revisions_table_stats);
    if (revStats) out.revisions_table_stats = revStats;
    return out;
  } catch {
    return null;
  }
}

export function stockRevenueHasContent(data: StockRevenueV0 | null | undefined): boolean {
  if (!data) return false;
  if (data.themes.length > 0) return true;
  if (data.ticker_metrics && Object.keys(data.ticker_metrics).length > 0) return true;
  if (data.ticker_revisions && Object.keys(data.ticker_revisions).length > 0) return true;
  return false;
}

export function stockRevenueUrl(dataBaseUrl: string, ticker: string): string {
  return stockTierBUrl(dataBaseUrl, ticker, STOCK_REVENUE_SIDECAR_SUFFIX);
}
