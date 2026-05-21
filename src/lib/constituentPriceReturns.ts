import type { ThemeDetailConstituentV0 } from "@/types/theme.detail.v0";

/** Standard price-return columns (matches compare / ticker_performance_latest.parquet). */
export const CONSTITUENT_PRICE_RETURN_COLUMNS = ["1D", "10D", "MTD", "YTD", "Period"] as const;

export type ConstituentPriceReturnColumn = (typeof CONSTITUENT_PRICE_RETURN_COLUMNS)[number];

export function priceReturnMetric(
  constituent: Pick<ThemeDetailConstituentV0, "price_returns">,
  column: ConstituentPriceReturnColumn,
): number | null {
  const v = constituent.price_returns?.metrics?.[column];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function hasConstituentPriceReturns(
  constituents: Pick<ThemeDetailConstituentV0, "price_returns">[] | undefined,
): boolean {
  if (!constituents?.length) return false;
  return constituents.some((c) =>
    CONSTITUENT_PRICE_RETURN_COLUMNS.some((col) => priceReturnMetric(c, col) != null),
  );
}
