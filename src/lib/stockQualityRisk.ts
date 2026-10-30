import { stockTierBUrl } from "@/lib/stockTierB";
import type {
  StockQualityRiskModeStatsV0,
  StockQualityRiskThemeRowV0,
  StockQualityRiskV0,
} from "@/types/stock.quality_risk.v0";
import type {
  ThemeQualityRiskColumnLabelsV0,
  ThemeQualityRiskMetricsV0,
  ThemeQualityRiskModeV0,
} from "@/types/theme.quality_risk.v0";

export const STOCK_QUALITY_RISK_SIDECAR_SUFFIX = ".quality_risk.v0.json";

export const STOCK_QUALITY_RISK_MODES: ThemeQualityRiskModeV0[] = [
  "quarterly",
  "fiscal_ebitda",
  "risk",
];

function asFiniteNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseMetrics(raw: unknown): ThemeQualityRiskMetricsV0 | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  return raw as ThemeQualityRiskMetricsV0;
}

function parseThemeRow(raw: unknown): StockQualityRiskThemeRowV0 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const slug = typeof o.slug === "string" ? o.slug.trim() : "";
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!slug || !name) return null;
  const row: StockQualityRiskThemeRowV0 = { slug, name };
  if (typeof o.group_slug === "string" && o.group_slug.trim()) row.group_slug = o.group_slug.trim();
  if (typeof o.group_name === "string" && o.group_name.trim()) row.group_name = o.group_name.trim();
  const w = asFiniteNumber(o.weight);
  if (w != null) row.weight = w;
  const metrics = parseMetrics(o.metrics);
  if (metrics) row.metrics = metrics;
  return row;
}

function parseModeStats(raw: unknown): StockQualityRiskModeStatsV0 | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const out: StockQualityRiskModeStatsV0 = {};
  for (const key of ["weighted", "average", "median"] as const) {
    const block = o[key];
    if (!block || typeof block !== "object") continue;
    const row: Record<string, number | null> = {};
    for (const [k, v] of Object.entries(block as Record<string, unknown>)) {
      const n = asFiniteNumber(v);
      if (n != null) row[k] = n;
    }
    if (Object.keys(row).length) out[key] = row;
  }
  return out.weighted || out.average || out.median ? out : undefined;
}

export function parseStockQualityRisk(raw: string | unknown): StockQualityRiskV0 | null {
  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!data || typeof data !== "object") return null;
    const o = data as Record<string, unknown>;
    const ticker = typeof o.ticker === "string" ? o.ticker.trim().toUpperCase() : "";
    if (!ticker) return null;
    const themes = (Array.isArray(o.themes) ? o.themes : [])
      .map(parseThemeRow)
      .filter((t): t is StockQualityRiskThemeRowV0 => t != null);
    const out: StockQualityRiskV0 = {
      schema_version:
        typeof o.schema_version === "string" ? o.schema_version : "stock.quality_risk.v0",
      ticker,
      as_of: typeof o.as_of === "string" ? o.as_of : "",
      themes,
    };
    if (typeof o.name === "string" && o.name.trim()) out.name = o.name.trim();
    if (typeof o.aggregation === "string") out.aggregation = o.aggregation;
    if (typeof o.note === "string") out.note = o.note;
    if (o.column_labels && typeof o.column_labels === "object") {
      out.column_labels = o.column_labels as ThemeQualityRiskColumnLabelsV0;
    }
    const tickerMetrics = parseMetrics(o.ticker_metrics);
    if (tickerMetrics) out.ticker_metrics = tickerMetrics;
    if (o.table_stats && typeof o.table_stats === "object") {
      const stats: NonNullable<StockQualityRiskV0["table_stats"]> = {};
      for (const mode of STOCK_QUALITY_RISK_MODES) {
        const block = parseModeStats((o.table_stats as Record<string, unknown>)[mode]);
        if (block) stats[mode] = block;
      }
      if (Object.keys(stats).length) out.table_stats = stats;
    }
    return out;
  } catch {
    return null;
  }
}

export function stockQualityRiskHasContent(data: StockQualityRiskV0 | null | undefined): boolean {
  if (!data) return false;
  if (data.themes.length > 0) return true;
  return Boolean(data.ticker_metrics);
}

export function stockQualityRiskUrl(dataBaseUrl: string, ticker: string): string {
  return stockTierBUrl(dataBaseUrl, ticker, STOCK_QUALITY_RISK_SIDECAR_SUFFIX);
}
