import type { CompareThemesLoadResult } from "@/lib/loadCompareThemes";
import { normalizeCompareColumnOrder, resolveTrendingColumnOrder } from "@/lib/trendingCompareMetrics";
import type { CompareThemesRowV0 } from "@/types/compare_themes.v0";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

const EXCLUDED_COLUMNS = new Set(["LstRpt %", "SinceLstRpt"]);

export type MyWatchlistCompareRow = {
  slug: string;
  name: string;
  groupName?: string | null;
  compareReturns?: ThemeCompareReturnsV0 | null;
};

export type MyWatchlistCompareData =
  | {
      available: true;
      asOf: string;
      columns: string[];
      rows: MyWatchlistCompareRow[];
      selectedDates: ManifestSelectedDateV0[];
    }
  | { available: false; message: string };

function mapCompareRow(r: CompareThemesRowV0): MyWatchlistCompareRow {
  return {
    slug: String(r.slug || "").trim(),
    name: String(r.name || "").trim(),
    groupName: r.group_name ?? null,
    compareReturns: r.compare_returns ?? null,
  };
}

function resolveColumns(
  compareColumns: string[] | undefined,
  rows: MyWatchlistCompareRow[],
): string[] {
  const fallbackCols = resolveTrendingColumnOrder(
    rows.map((r) => ({ compare_returns: r.compareReturns ?? undefined })),
  );
  const cols =
    Array.isArray(compareColumns) && compareColumns.length ? compareColumns : fallbackCols;
  return normalizeCompareColumnOrder(cols.filter((c) => !EXCLUDED_COLUMNS.has(c)));
}

/** Build-time compare bundle for /my (same source as /compare, no browser fetch). */
export function prepareMyWatchlistCompareData(
  compareRes: CompareThemesLoadResult | null,
  selectedDates: ManifestSelectedDateV0[] | undefined,
): MyWatchlistCompareData {
  if (!compareRes?.bundle) {
    return {
      available: false,
      message: "Compare data is not available in this environment.",
    };
  }
  const compare = compareRes.bundle;
  const rows = compare.rows.map(mapCompareRow);
  return {
    available: true,
    asOf: compare.as_of,
    columns: resolveColumns(compare.columns, rows),
    rows,
    selectedDates: Array.isArray(selectedDates) ? selectedDates : [],
  };
}
