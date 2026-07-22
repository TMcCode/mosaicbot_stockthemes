import { isCompareEarningsColumn, type CompareBenchmarkRow } from "@/lib/compareBenchmarkRows";
import { compareColumnHeader, valueForTrendingColumn } from "@/lib/trendingCompareMetrics";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

type CompareExportRow = {
  slug: string;
  name: string;
  tickersPreview?: string | null;
  themeCount?: number | null;
  compareReturns?: ThemeCompareReturnsV0 | null;
  marketBaseline?: boolean;
  kind?: CompareBenchmarkRow["kind"];
  ticker?: string | null;
};

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function fmtCsvNumber(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return "";
  return String(Number(v.toFixed(4)));
}

function isBenchmarkRow(row: CompareExportRow): boolean {
  return row.marketBaseline === true;
}

/** Build CSV for the currently visible compare table (filters + sort applied by caller). */
export function buildCompareThemesCsv(
  rows: CompareExportRow[],
  columns: string[],
  options?: { entityKind?: "theme" | "group" },
): string {
  const entityKind = options?.entityKind ?? "theme";
  const nameHeader = entityKind === "group" ? "Group" : "Theme";
  const headers = [
    nameHeader,
    "Slug",
    entityKind === "group" ? "Theme count" : "Tickers",
    "Row type",
    ...columns.map((col) => compareColumnHeader(col)),
  ];

  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    const isBenchmark = isBenchmarkRow(row);
    const meta =
      entityKind === "group"
        ? row.themeCount != null
          ? String(row.themeCount)
          : ""
        : (row.tickersPreview || "").trim();
    const rowType = isBenchmark
      ? row.kind === "factor_spread"
        ? "factor_spread"
        : "benchmark"
      : entityKind;
    const cells = [
      csvEscape(row.name || ""),
      csvEscape(row.slug || ""),
      csvEscape(meta),
      csvEscape(rowType),
    ];
    for (const col of columns) {
      const v =
        isBenchmark && isCompareEarningsColumn(col)
          ? undefined
          : valueForTrendingColumn(col, row.compareReturns ?? undefined, {}, row.name);
      cells.push(fmtCsvNumber(v));
    }
    lines.push(cells.join(","));
  }
  return `${lines.join("\n")}\n`;
}

export function downloadCompareThemesCsv(
  rows: CompareExportRow[],
  columns: string[],
  options?: { entityKind?: "theme" | "group"; filename?: string },
): void {
  if (typeof window === "undefined" || rows.length === 0) return;
  const entityKind = options?.entityKind ?? "theme";
  const csv = buildCompareThemesCsv(rows, columns, { entityKind });
  const stamp = new Date().toISOString().slice(0, 10);
  const name =
    options?.filename ||
    `stockthemes-${entityKind}-returns-${stamp}.csv`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
