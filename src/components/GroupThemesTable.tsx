import Link from "next/link";

import { HorizontalScrollArea } from "@/components/HorizontalScrollArea";
import { buildSelectedDateLookup, customDateHelpText } from "@/lib/customDateColumnHelp";
import { formatUsdMarketCap } from "@/lib/constituentMeta";
import type { GroupThemeTableRow } from "@/lib/groupThemesTable";
import { trendingReturnHeatStyle } from "@/lib/trendingPerfHeat";
import {
  compareColumnHeader,
  compareColumnHeaderTooltip,
  trendingColumnHeader,
  valueForTrendingColumn,
} from "@/lib/trendingCompareMetrics";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";

import styles from "@/app/page.module.css";

type Props = {
  rows: GroupThemeTableRow[];
  metricColumns: string[];
  selectedDates?: ManifestSelectedDateV0[];
};

function fmtPct(v?: number): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function metricHeaderTooltip(
  col: string,
  selectedDateByKey: Map<string, ManifestSelectedDateV0>,
): string | undefined {
  return compareColumnHeaderTooltip(col) ?? customDateHelpText(col, selectedDateByKey);
}

export function GroupThemesTable({ rows, metricColumns, selectedDates }: Props) {
  const selectedDateByKey = buildSelectedDateLookup(selectedDates);

  return (
    <>
      <p className={styles.tableScrollHint}>Scroll or drag sideways to view all columns.</p>
      <div className={styles.tableWrap}>
        <HorizontalScrollArea
          className={styles.constituentsScrollWrap}
          tabIndex={0}
          role="region"
          aria-label="Themes in group — scroll horizontally to see all columns"
        >
          <div className={styles.constituentsTableSizer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th scope="col">Theme</th>
                  <th scope="col">Tickers</th>
                  <th scope="col">Avg MCap</th>
                  <th scope="col">Total MCap</th>
                  {metricColumns.map((col) => (
                    <th
                      key={col}
                      scope="col"
                      title={metricHeaderTooltip(col, selectedDateByKey)}
                    >
                      {col === "Period" ? "1Yr %" : trendingColumnHeader(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.slug}>
                    <td>
                      <Link href={`/themes/${row.slug}`} className={styles.name} prefetch={false}>
                        {row.name}
                      </Link>
                    </td>
                    <td>{row.ticker_count != null ? row.ticker_count.toLocaleString() : "—"}</td>
                    <td>{formatUsdMarketCap(row.avg_market_cap_usd)}</td>
                    <td>{formatUsdMarketCap(row.total_market_cap_usd)}</td>
                    {metricColumns.map((col) => {
                      const v = valueForTrendingColumn(
                        col,
                        row.compare_returns ?? undefined,
                        {},
                      );
                      const heat =
                        v != null && Number.isFinite(v) ? trendingReturnHeatStyle(v) : undefined;
                      return (
                        <td key={`${row.slug}-${col}`} style={heat}>
                          {fmtPct(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HorizontalScrollArea>
      </div>
    </>
  );
}
