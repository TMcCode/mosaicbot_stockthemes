import type { ThemeDetailConstituentV0 } from "@/types/theme.detail.v0";

/** Standard calendar price-return columns (matches compare / ticker_performance_latest.parquet). */
export const CONSTITUENT_PREMARKET_COL = "Premarket" as const;
export const CONSTITUENT_POSTMARKET_COL = "Postmarket" as const;
export const CONSTITUENT_STANDARD_RETURN_HEAD = [
  CONSTITUENT_PREMARKET_COL,
  CONSTITUENT_POSTMARKET_COL,
  "1D",
  "10D",
  "1M",
  "MTD",
  "YTD",
] as const;
export const CONSTITUENT_PERIOD_COL = "Period" as const;
export const CONSTITUENT_LONG_HORIZON_COLS = ["2Y", "5Y"] as const;

/** Default when payload has no price_returns.columns (legacy fixtures). */
export const CONSTITUENT_PRICE_RETURN_COLUMNS = [
  ...CONSTITUENT_STANDARD_RETURN_HEAD,
  CONSTITUENT_PERIOD_COL,
] as const;

export type ConstituentPriceReturnColumn = string;

const CONSTITUENT_RETURN_SKIP = new Set<string>([
  ...CONSTITUENT_STANDARD_RETURN_HEAD,
  CONSTITUENT_PERIOD_COL,
  ...CONSTITUENT_LONG_HORIZON_COLS,
  "1W",
  "60D",
  "120D",
  "LstRpt %",
  "SinceLstRpt",
]);

/** Calendar → custom SelectedDates → Period → 2Y/5Y (matches group child-theme table). */
export function normalizeConstituentPriceReturnColumnOrder(cols: string[]): string[] {
  const head = CONSTITUENT_STANDARD_RETURN_HEAD.filter((k) => cols.includes(k));
  const custom = cols.filter(
    (c) => !CONSTITUENT_RETURN_SKIP.has(c) && !(head as string[]).includes(c),
  );
  const period = cols.includes(CONSTITUENT_PERIOD_COL) ? [CONSTITUENT_PERIOD_COL] : [];
  const long = CONSTITUENT_LONG_HORIZON_COLS.filter((k) => cols.includes(k));
  return [...head, ...custom, ...period, ...long];
}

export function resolveConstituentPriceReturnColumns(
  constituents: Pick<ThemeDetailConstituentV0, "price_returns">[] | undefined,
): string[] {
  const seen = new Set<string>();
  const raw: string[] = [];
  for (const c of constituents ?? []) {
    const cols = c.price_returns?.columns;
    if (cols?.length) {
      for (const col of cols) {
        const key = String(col || "").trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        raw.push(key);
      }
    }
  }
  if (!raw.length) {
    for (const c of constituents ?? []) {
      const m = c.price_returns?.metrics;
      if (!m) continue;
      for (const key of Object.keys(m)) {
        if (!key || seen.has(key)) continue;
        seen.add(key);
        raw.push(key);
      }
    }
  }
  if (!raw.length) return [...CONSTITUENT_PRICE_RETURN_COLUMNS];
  return normalizeConstituentPriceReturnColumnOrder(raw);
}

export function priceReturnMetric(
  constituent: Pick<ThemeDetailConstituentV0, "price_returns">,
  column: string,
): number | null {
  const v = constituent.price_returns?.metrics?.[column];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function hasConstituentPriceReturns(
  constituents: Pick<ThemeDetailConstituentV0, "price_returns">[] | undefined,
): boolean {
  if (!constituents?.length) return false;
  const cols = resolveConstituentPriceReturnColumns(constituents);
  return constituents.some((c) => cols.some((col) => priceReturnMetric(c, col) != null));
}
