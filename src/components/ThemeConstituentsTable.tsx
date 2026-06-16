"use client";

import styles from "@/app/page.module.css";

import { HorizontalScrollArea } from "@/components/HorizontalScrollArea";
import { TickerBadge } from "@/components/TickerBadge";
import { CONSTITUENT_PRICE_RETURN_COLUMNS } from "@/lib/constituentPriceReturns";
import { formatUsdMarketCap } from "@/lib/constituentMeta";
import { CONSTITUENT_EARNINGS_COLUMNS } from "@/lib/constituentEarningsColumnHelp";
import { trendingColumnHeader } from "@/lib/trendingCompareMetrics";
import { formatWeight } from "@/lib/formatWeight";
import { publicAssetPath } from "@/lib/siteUrl";
import {
  formatConstituentPct,
  priceReturnStat,
  type ThemeConstituentTableModel,
} from "@/lib/themeConstituentTableModel";
import type { ThemeDetailV0 } from "@/types/theme.detail.v0";

type Props = {
  detail: ThemeDetailV0;
  model: ThemeConstituentTableModel;
  livePrices?: boolean;
};

export function ThemeConstituentsTable({ detail, model, livePrices = false }: Props) {
  const {
    hasWeight,
    hasMcap,
    hasPriceReturns,
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

  const priceStat = (
    rowKey: Parameters<typeof priceReturnStat>[1],
    col: (typeof CONSTITUENT_PRICE_RETURN_COLUMNS)[number],
  ) =>
    priceReturnStat(
      detail,
      rowKey,
      col,
      constituentRows.map((r) => r.priceReturns[col]),
      { livePrices },
    );

  return (
    <section className={styles.section} aria-labelledby="constituents-heading">
      <h2 id="constituents-heading">Constituents</h2>
      {detail.build_id ? (
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 0 }}>
          Build <code className={styles.code}>{detail.build_id}</code>
        </p>
      ) : null}
      <p className={styles.tableScrollHint}>Scroll or drag sideways to view all columns.</p>
      <div className={styles.tableWrap}>
        <div className={styles.tableWatermark} aria-hidden="true">
          <img
            src={publicAssetPath("/brand/logo-full-transparent.png")}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </div>
        <HorizontalScrollArea
          className={styles.constituentsScrollWrap}
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
                  {hasPriceReturns
                    ? CONSTITUENT_PRICE_RETURN_COLUMNS.map((col) => (
                        <th key={col} scope="col">
                          {trendingColumnHeader(col)}
                        </th>
                      ))
                    : null}
                  {CONSTITUENT_EARNINGS_COLUMNS.map((col) => (
                    <th key={col.id} scope="col" title={col.tooltip}>
                      {col.label}
                    </th>
                  ))}
                  {hasMcap ? <th scope="col">Mkt Cap</th> : null}
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
                      {hasPriceReturns
                        ? CONSTITUENT_PRICE_RETURN_COLUMNS.map((col) => (
                            <td key={col}>{formatConstituentPct(row.priceReturns[col])}</td>
                          ))
                        : null}
                      <td>{earnings.lastReportDateCell}</td>
                      <td>{earnings.reportDateCell}</td>
                      <td>{earnings.lastQuarterEarningsMoveCell}</td>
                      <td>
                        {earnings.earningsPerfCell}
                        {earnings.earningsPerfIsProvisional ? "*" : ""}
                      </td>
                      <td>{earnings.intraQtrCell}</td>
                      <td>{earnings.sinceQtrRptCell}</td>
                      {hasMcap ? <td>{formatUsdMarketCap(row.marketCapUsd)}</td> : null}
                    </tr>
                  );
                })}
                <tr>
                  <td>
                    <strong>Average</strong>
                  </td>
                  {hasWeight ? (
                    <td>
                      <strong>{avgWeight != null ? formatWeight(avgWeight) : "—"}</strong>
                    </td>
                  ) : null}
                  {hasPriceReturns
                    ? CONSTITUENT_PRICE_RETURN_COLUMNS.map((col) => (
                        <td key={col}>
                          <strong>{formatConstituentPct(priceStat("average", col))}</strong>
                        </td>
                      ))
                    : null}
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
                  {hasMcap ? (
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
                  {hasPriceReturns
                    ? CONSTITUENT_PRICE_RETURN_COLUMNS.map((col) => (
                        <td key={col}>
                          <strong>{formatConstituentPct(priceStat("median", col))}</strong>
                        </td>
                      ))
                    : null}
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
                  {hasMcap ? (
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
                  {hasPriceReturns
                    ? CONSTITUENT_PRICE_RETURN_COLUMNS.map((col) => (
                        <td key={col}>
                          <strong>{formatConstituentPct(priceStat("std_dev", col))}</strong>
                        </td>
                      ))
                    : null}
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
                  {hasMcap ? (
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
                  {hasPriceReturns
                    ? CONSTITUENT_PRICE_RETURN_COLUMNS.map((col) => (
                        <td key={col}>
                          <strong>{formatConstituentPct(priceStat("min", col))}</strong>
                        </td>
                      ))
                    : null}
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
                  {hasMcap ? (
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
                  {hasPriceReturns
                    ? CONSTITUENT_PRICE_RETURN_COLUMNS.map((col) => (
                        <td key={col}>
                          <strong>{formatConstituentPct(priceStat("max", col))}</strong>
                        </td>
                      ))
                    : null}
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
                  {hasMcap ? (
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
                  {hasPriceReturns
                    ? CONSTITUENT_PRICE_RETURN_COLUMNS.map((col) => (
                        <td key={col}>
                          <strong>{formatConstituentPct(priceStat("positive_tickers_pct", col))}</strong>
                        </td>
                      ))
                    : null}
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
                  {hasMcap ? <td></td> : null}
                </tr>
              </tbody>
            </table>
          </div>
        </HorizontalScrollArea>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8, padding: "0 10px 10px" }}>
          * Provisional value: before LstRpt% reaches its 2-day post-report lock window (BMO/AMC adjusted),
          EarningsPerf is calculated from current vs pre-report and then locks to final LstRpt%.
        </p>
      </div>
    </section>
  );
}
