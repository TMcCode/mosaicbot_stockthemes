"use client";

import { useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import tableStyles from "@/components/ThemeConstituentsTable.module.css";

import { HorizontalScrollArea } from "@/components/HorizontalScrollArea";
import { TickerBadge } from "@/components/TickerBadge";
import { formatUsdMarketCap } from "@/lib/constituentMeta";
import { CONSTITUENT_EARNINGS_COLUMNS } from "@/lib/constituentEarningsColumnHelp";
import { buildSelectedDateLookup, metricColumnHeaderTooltip } from "@/lib/customDateColumnHelp";
import { trendingColumnHeader } from "@/lib/trendingCompareMetrics";
import { formatWeight } from "@/lib/formatWeight";
import { publicAssetPath } from "@/lib/siteUrl";
import {
  formatConstituentPct,
  priceReturnStat,
  type ThemeConstituentTableModel,
} from "@/lib/themeConstituentTableModel";
import {
  hasThemeManualWeightReturns,
  THEME_EARNINGS_COMPARE_METRIC,
  themeManualWeightReturnPct,
} from "@/lib/themeConstituentThemeReturn";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";
import type { ThemeDetailV0 } from "@/types/theme.detail.v0";

type TableView = "returns" | "earnings";

type Props = {
  detail: ThemeDetailV0;
  model: ThemeConstituentTableModel;
  livePrices?: boolean;
  selectedDates?: ManifestSelectedDateV0[];
};

export function ThemeConstituentsTable({
  detail,
  model,
  livePrices = false,
  selectedDates,
}: Props) {
  const [view, setView] = useState<TableView>("returns");
  const selectedDateByKey = useMemo(
    () => buildSelectedDateLookup(selectedDates),
    [selectedDates],
  );

  const {
    hasWeight,
    hasMcap,
    hasPriceReturns,
    priceReturnColumns,
    constituentRows,
    avgEarningsPerf,
    avgLastQuarterEarningsMove,
    avgIntraQtr,
    avgSinceQtrRpt,
    avgMarketCap,
    avgWeight,
    stdEarningsPerf,
    stdLastQuarterEarningsMove,
    stdIntraQtr,
    stdSinceQtrRpt,
    stdMarketCap,
    stdWeight,
    posEarningsPerf,
    posLastQuarterEarningsMove,
    posIntraQtr,
    posSinceQtrRpt,
    medianEarningsPerf,
    medianLastQuarterEarningsMove,
    medianIntraQtr,
    medianSinceQtrRpt,
    medianMarketCap,
    medianWeight,
    minEarningsPerf,
    minLastQuarterEarningsMove,
    minIntraQtr,
    minSinceQtrRpt,
    minMarketCap,
    minWeight,
    maxEarningsPerf,
    maxLastQuarterEarningsMove,
    maxIntraQtr,
    maxSinceQtrRpt,
    maxMarketCap,
    maxWeight,
  } = model;

  const showReturns = view === "returns";
  const showEarnings = view === "earnings";
  const themeCompare = detail.compare_returns;
  const showThemeReturnRow = hasThemeManualWeightReturns(
    themeCompare,
    priceReturnColumns,
    view,
  );

  const themeReturnPct = (columnKey: string) =>
    formatConstituentPct(themeManualWeightReturnPct(columnKey, themeCompare, detail.name));

  const priceStat = (
    rowKey: Parameters<typeof priceReturnStat>[1],
    col: string,
  ) =>
    priceReturnStat(
      detail,
      rowKey,
      col,
      constituentRows.map((r) => r.priceReturns[col] ?? null),
      { livePrices },
    );

  const priceHeader = (col: string) => {
    const tooltip = metricColumnHeaderTooltip(col, selectedDateByKey);
    return (
      <th key={col} scope="col" title={tooltip}>
        {trendingColumnHeader(col)}
      </th>
    );
  };

  return (
    <section className={styles.section} aria-labelledby="constituents-heading">
      <div className={tableStyles.sectionHeader}>
        <h2 id="constituents-heading">{detail.name} Constituents</h2>
        <div className={tableStyles.toggle} role="group" aria-label="Constituents table columns">
          <button
            type="button"
            className={showReturns ? tableStyles.active : undefined}
            aria-pressed={showReturns}
            title="Returns over calendar windows and custom event dates (1D, MTD, YTD, etc.)"
            onClick={() => setView("returns")}
          >
            Period Returns
          </button>
          <button
            type="button"
            className={showEarnings ? tableStyles.active : undefined}
            aria-pressed={showEarnings}
            title="Returns around report dates and the current earnings quarter"
            onClick={() => setView("earnings")}
          >
            Earnings Returns
          </button>
        </div>
      </div>
      <div className={styles.tableWrap}>
        <HorizontalScrollArea
          className={styles.constituentsScrollWrap}
          data-constituents-view={view}
          tabIndex={0}
          role="region"
          aria-label="Constituents table — scroll horizontally to see all columns"
        >
          <div className={styles.constituentsTableSizer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th scope="col">Company</th>
                  {hasWeight ? <th scope="col">Wgt</th> : null}
                  {showReturns && hasPriceReturns
                    ? priceReturnColumns.map((col) => priceHeader(col))
                    : null}
                  {showEarnings
                    ? CONSTITUENT_EARNINGS_COLUMNS.map((col) => (
                        <th key={col.id} scope="col" title={col.tooltip}>
                          {col.label}
                        </th>
                      ))
                    : null}
                  {showReturns && hasMcap ? <th scope="col">Mkt Cap</th> : null}
                </tr>
              </thead>
              <tbody>
                {constituentRows.map((row) => {
                  const c = row.constituent;
                  const earnings = row.earnings;
                  return (
                    <tr key={c.ticker}>
                      <td>
                        <div className={styles.companyCell}>
                          <span className={styles.companyName}>{c.name?.trim() || "—"}</span>
                          <TickerBadge ticker={c.ticker} />
                        </div>
                      </td>
                      {hasWeight ? (
                        <td>{c.weight != null ? formatWeight(c.weight) : "—"}</td>
                      ) : null}
                      {showReturns && hasPriceReturns
                        ? priceReturnColumns.map((col) => (
                            <td key={col}>{formatConstituentPct(row.priceReturns[col])}</td>
                          ))
                        : null}
                      {showEarnings ? (
                        <>
                          <td>{earnings.lastReportDateCell}</td>
                          <td>{earnings.reportDateCell}</td>
                          <td>{earnings.lastQuarterEarningsMoveCell}</td>
                          <td>
                            {earnings.earningsPerfCell}
                            {earnings.earningsPerfIsProvisional ? "*" : ""}
                          </td>
                          <td>{earnings.intraQtrCell}</td>
                          <td>{earnings.sinceQtrRptCell}</td>
                        </>
                      ) : null}
                      {showReturns && hasMcap ? (
                        <td>{formatUsdMarketCap(row.marketCapUsd)}</td>
                      ) : null}
                    </tr>
                  );
                })}
                {showThemeReturnRow ? (
                  <tr className={tableStyles.themeReturnRow}>
                    <td>
                      <strong
                        className={tableStyles.themeReturnLabel}
                        title="Manual theme-weight return — same as Theme returns table and the performance chart"
                      >
                        Theme return
                      </strong>
                    </td>
                    {hasWeight ? <td>—</td> : null}
                    {showReturns && hasPriceReturns
                      ? priceReturnColumns.map((col) => (
                          <td key={col}>
                            <strong>{themeReturnPct(col)}</strong>
                          </td>
                        ))
                      : null}
                    {showEarnings
                      ? CONSTITUENT_EARNINGS_COLUMNS.map((col) => {
                          const compareKey = THEME_EARNINGS_COMPARE_METRIC[col.id];
                          return (
                            <td key={col.id}>
                              <strong>
                                {compareKey ? themeReturnPct(compareKey) : "—"}
                              </strong>
                            </td>
                          );
                        })
                      : null}
                    {showReturns && hasMcap ? <td>—</td> : null}
                  </tr>
                ) : null}
                <tr>
                  <td>
                    <strong>Average</strong>
                  </td>
                  {hasWeight ? (
                    <td>
                      <strong>{avgWeight != null ? formatWeight(avgWeight) : "—"}</strong>
                    </td>
                  ) : null}
                  {showReturns && hasPriceReturns
                    ? priceReturnColumns.map((col) => (
                        <td key={col}>
                          <strong>{formatConstituentPct(priceStat("average", col))}</strong>
                        </td>
                      ))
                    : null}
                  {showEarnings ? (
                    <>
                      <td></td>
                      <td></td>
                      <td>
                        <strong>{formatConstituentPct(avgLastQuarterEarningsMove)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(avgEarningsPerf)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(avgIntraQtr)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(avgSinceQtrRpt)}</strong>
                      </td>
                    </>
                  ) : null}
                  {showReturns && hasMcap ? (
                    <td>
                      <strong>{formatUsdMarketCap(avgMarketCap)}</strong>
                    </td>
                  ) : null}
                </tr>
                <tr>
                  <td>
                    <strong>Median</strong>
                  </td>
                  {hasWeight ? (
                    <td>
                      <strong>{medianWeight != null ? formatWeight(medianWeight) : "—"}</strong>
                    </td>
                  ) : null}
                  {showReturns && hasPriceReturns
                    ? priceReturnColumns.map((col) => (
                        <td key={col}>
                          <strong>{formatConstituentPct(priceStat("median", col))}</strong>
                        </td>
                      ))
                    : null}
                  {showEarnings ? (
                    <>
                      <td></td>
                      <td></td>
                      <td>
                        <strong>{formatConstituentPct(medianLastQuarterEarningsMove)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(medianEarningsPerf)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(medianIntraQtr)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(medianSinceQtrRpt)}</strong>
                      </td>
                    </>
                  ) : null}
                  {showReturns && hasMcap ? (
                    <td>
                      <strong>{formatUsdMarketCap(medianMarketCap)}</strong>
                    </td>
                  ) : null}
                </tr>
                <tr>
                  <td>
                    <strong>Std Dev</strong>
                  </td>
                  {hasWeight ? (
                    <td>
                      <strong>{stdWeight != null ? formatWeight(stdWeight) : "—"}</strong>
                    </td>
                  ) : null}
                  {showReturns && hasPriceReturns
                    ? priceReturnColumns.map((col) => (
                        <td key={col}>
                          <strong>{formatConstituentPct(priceStat("std_dev", col))}</strong>
                        </td>
                      ))
                    : null}
                  {showEarnings ? (
                    <>
                      <td></td>
                      <td></td>
                      <td>
                        <strong>{formatConstituentPct(stdLastQuarterEarningsMove)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(stdEarningsPerf)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(stdIntraQtr)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(stdSinceQtrRpt)}</strong>
                      </td>
                    </>
                  ) : null}
                  {showReturns && hasMcap ? (
                    <td>
                      <strong>{formatUsdMarketCap(stdMarketCap)}</strong>
                    </td>
                  ) : null}
                </tr>
                <tr>
                  <td>
                    <strong>Min</strong>
                  </td>
                  {hasWeight ? (
                    <td>
                      <strong>{minWeight != null ? formatWeight(minWeight) : "—"}</strong>
                    </td>
                  ) : null}
                  {showReturns && hasPriceReturns
                    ? priceReturnColumns.map((col) => (
                        <td key={col}>
                          <strong>{formatConstituentPct(priceStat("min", col))}</strong>
                        </td>
                      ))
                    : null}
                  {showEarnings ? (
                    <>
                      <td></td>
                      <td></td>
                      <td>
                        <strong>{formatConstituentPct(minLastQuarterEarningsMove)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(minEarningsPerf)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(minIntraQtr)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(minSinceQtrRpt)}</strong>
                      </td>
                    </>
                  ) : null}
                  {showReturns && hasMcap ? (
                    <td>
                      <strong>{formatUsdMarketCap(minMarketCap)}</strong>
                    </td>
                  ) : null}
                </tr>
                <tr>
                  <td>
                    <strong>Max</strong>
                  </td>
                  {hasWeight ? (
                    <td>
                      <strong>{maxWeight != null ? formatWeight(maxWeight) : "—"}</strong>
                    </td>
                  ) : null}
                  {showReturns && hasPriceReturns
                    ? priceReturnColumns.map((col) => (
                        <td key={col}>
                          <strong>{formatConstituentPct(priceStat("max", col))}</strong>
                        </td>
                      ))
                    : null}
                  {showEarnings ? (
                    <>
                      <td></td>
                      <td></td>
                      <td>
                        <strong>{formatConstituentPct(maxLastQuarterEarningsMove)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(maxEarningsPerf)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(maxIntraQtr)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(maxSinceQtrRpt)}</strong>
                      </td>
                    </>
                  ) : null}
                  {showReturns && hasMcap ? (
                    <td>
                      <strong>{formatUsdMarketCap(maxMarketCap)}</strong>
                    </td>
                  ) : null}
                </tr>
                <tr>
                  <td>
                    <strong>% Positive Tickers</strong>
                  </td>
                  {hasWeight ? <td></td> : null}
                  {showReturns && hasPriceReturns
                    ? priceReturnColumns.map((col) => (
                        <td key={col}>
                          <strong>{formatConstituentPct(priceStat("positive_tickers_pct", col))}</strong>
                        </td>
                      ))
                    : null}
                  {showEarnings ? (
                    <>
                      <td></td>
                      <td></td>
                      <td>
                        <strong>{formatConstituentPct(posLastQuarterEarningsMove)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(posEarningsPerf)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(posIntraQtr)}</strong>
                      </td>
                      <td>
                        <strong>{formatConstituentPct(posSinceQtrRpt)}</strong>
                      </td>
                    </>
                  ) : null}
                  {showReturns && hasMcap ? <td></td> : null}
                </tr>
              </tbody>
            </table>
          </div>
        </HorizontalScrollArea>
        <div className={styles.tableFooter}>
          {showEarnings ? (
            <p className={styles.tableFootnote}>
              * Provisional value: before LstRpt% reaches its 2-day post-report lock window (BMO/AMC adjusted),
              EarningsPerf is calculated from current vs pre-report and then locks to final LstRpt%.
            </p>
          ) : null}
          <div className={styles.tableWatermark} aria-hidden="true">
            <img
              src={publicAssetPath("/brand/logo-full-transparent.png")}
              alt=""
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
