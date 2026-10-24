import type { ThemeStockCorrelationsV0 } from "@/types/theme.stock_correlations.v0";

export const STOCK_CORRELATIONS_SIDECAR_SUFFIX = ".stock_correlations.v0.json";

function finite(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function themeStockCorrelationsUrl(dataBaseUrl: string, slug: string): string {
  return `${dataBaseUrl.replace(/\/$/, "")}/themes/${encodeURIComponent(slug)}${STOCK_CORRELATIONS_SIDECAR_SUFFIX}`;
}

export function parseThemeStockCorrelations(raw: string): ThemeStockCorrelationsV0 | null {
  const row = record(JSON.parse(raw));
  if (row.schema_version !== "theme.stock_correlations.v0") return null;
  const slug = text(row.slug);
  const window = text(row.window) || "1Y";
  const tickersRaw = Array.isArray(row.tickers) ? row.tickers : [];
  const tickers = tickersRaw
    .map((item) => {
      if (typeof item === "string") {
        const ticker = item.trim().toUpperCase();
        return ticker ? { ticker } : null;
      }
      const rec = record(item);
      const ticker = text(rec.ticker).toUpperCase();
      if (!ticker) return null;
      const weight = finite(rec.weight);
      return { ticker, ...(weight == null ? {} : { weight }) };
    })
    .filter((item): item is { ticker: string; weight?: number } => item != null);
  const matrixRaw = Array.isArray(row.matrix) ? row.matrix : [];
  if (!slug || tickers.length < 2 || matrixRaw.length !== tickers.length) return null;
  const matrix: Array<Array<number | null>> = [];
  for (const rawRow of matrixRaw) {
    if (!Array.isArray(rawRow) || rawRow.length !== tickers.length) return null;
    matrix.push(
      rawRow.map((cell) => {
        if (cell == null) return null;
        const n = typeof cell === "number" ? cell : Number(cell);
        return Number.isFinite(n) ? n : null;
      }),
    );
  }
  return {
    schema_version: "theme.stock_correlations.v0",
    slug,
    theme: text(row.theme) || undefined,
    as_of: text(row.as_of) || undefined,
    window,
    max_tickers: Math.max(tickers.length, Math.round(finite(row.max_tickers) || tickers.length)),
    tickers,
    matrix,
  };
}
