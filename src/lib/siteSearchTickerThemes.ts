/** Compact preview for nav / mobile search ticker rows. */
export const SEARCH_TICKER_THEME_PREVIEW = 4;

export type TickerThemePreviewItem = { slug: string; name: string };

/**
 * Slice ticker membership for search dropdown rows.
 * `limit: null` = show all (homepage desktop hero).
 * Index order is weight-desc when ETL has ThemeWgt; otherwise publish order.
 */
export function sliceTickerThemesForSearch(
  themeSlugs: readonly string[],
  themeNames: readonly string[] | undefined,
  limit: number | null,
): { shown: TickerThemePreviewItem[]; moreCount: number } {
  const items: TickerThemePreviewItem[] = themeSlugs.map((slug, j) => ({
    slug,
    name: themeNames?.[j] ?? slug,
  }));
  if (limit == null || limit < 0 || items.length <= limit) {
    return { shown: items, moreCount: 0 };
  }
  return {
    shown: items.slice(0, limit),
    moreCount: items.length - limit,
  };
}
