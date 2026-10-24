"use client";

import { useMemo } from "react";
import Link from "next/link";

import styles from "@/app/page.module.css";
import panelStyles from "@/components/ThemeConstituentsCorrelationPanel.module.css";
import { ConstituentLogo } from "@/components/ConstituentLogo";
import { TickerBadge } from "@/components/TickerBadge";
import { useThemeCorrelationBundle } from "@/hooks/useThemeCorrelationBundle";
import { formatDecimal } from "@/lib/themeFactorAttribution";
import type { ThemeConstituentFitV0 } from "@/types/theme.factor_attribution.v0";
import type { ThemeDetailV0 } from "@/types/theme.detail.v0";
import type { ThemeNeighborRowV0 } from "@/types/theme.theme_neighbors.v0";

type Props = {
  detail: ThemeDetailV0;
  slug: string;
  dataBaseUrl: string;
};

type CorrPair = { a: string; b: string; value: number };
type PeerAvg = { ticker: string; avg: number };

type FitDisplayRow = {
  ticker: string;
  correlation_to_theme?: number;
  market_adjusted_correlation?: number;
  beta_to_theme?: number;
  stock_specific_share?: number;
  coverage_pct?: number;
  avg_to_peers?: number;
};

const COHESION_HORIZON = "1Y" as const;

/** CSS-only matrix density — set as data-density (no layout measurement). */
function matrixDensity(tickerCount: number): "comfortable" | "compact" | "dense" {
  if (tickerCount >= 24) return "dense";
  if (tickerCount >= 16) return "compact";
  return "comfortable";
}

function percent(value: number | undefined, digits = 0): string {
  return value == null || !Number.isFinite(value) ? "—" : `${value.toFixed(digits)}%`;
}

function percentileLabel(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value);
  const mod100 = rounded % 100;
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? "th"
      : rounded % 10 === 1
        ? "st"
        : rounded % 10 === 2
          ? "nd"
          : rounded % 10 === 3
            ? "rd"
            : "th";
  return `${rounded}${suffix} percentile`;
}

function cellColor(value: number | null): string | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  const intensity = Math.min(Math.abs(value), 1);
  if (value >= 0) return `rgba(38, 252, 214, ${0.08 + intensity * 0.35})`;
  return `rgba(240, 113, 120, ${0.08 + intensity * 0.35})`;
}

function buildPairsAndPeerAvgs(
  tickers: string[],
  matrix: Array<Array<number | null>>,
): { pairs: CorrPair[]; peerAvgs: PeerAvg[] } {
  const pairs: CorrPair[] = [];
  const sums = tickers.map(() => 0);
  const counts = tickers.map(() => 0);

  for (let i = 0; i < tickers.length; i++) {
    for (let j = i + 1; j < tickers.length; j++) {
      const raw = matrix[i]?.[j] ?? matrix[j]?.[i];
      if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
      pairs.push({ a: tickers[i], b: tickers[j], value: raw });
      sums[i] += raw;
      counts[i] += 1;
      sums[j] += raw;
      counts[j] += 1;
    }
  }

  const peerAvgs: PeerAvg[] = tickers
    .map((ticker, i) => ({
      ticker,
      avg: counts[i] > 0 ? sums[i] / counts[i] : Number.NaN,
    }))
    .filter((row) => Number.isFinite(row.avg))
    .sort((a, b) => b.avg - a.avg);

  return { pairs, peerAvgs };
}

/** Split "Group '26: Theme Title" into short UI labels; full name stays in the tooltip. */
function compactThemeParts(theme: string): { group?: string; primary: string } {
  const idx = theme.indexOf(": ");
  if (idx > 0 && idx < theme.length - 2) {
    return {
      group: theme.slice(0, idx).trim(),
      primary: theme.slice(idx + 2).trim() || theme,
    };
  }
  return { primary: theme };
}

function NeighborList({
  title,
  titleHint,
  rows,
  empty,
  showGroup,
}: {
  title: string;
  titleHint?: string;
  rows: ThemeNeighborRowV0[];
  empty: string;
  /** When true, show a tiny group line (outside columns). */
  showGroup?: boolean;
}) {
  return (
    <div className={panelStyles.neighborCard}>
      <h4
        className={panelStyles.colTitle}
        title={titleHint ? `${title}. ${titleHint}` : title}
      >
        {title}
      </h4>
      {rows.length === 0 ? (
        <p className={panelStyles.moreNote}>{empty}</p>
      ) : (
        <ul className={panelStyles.neighborList}>
          {rows.map((row) => {
            const parts = compactThemeParts(row.theme);
            const tip = `${row.theme} · corr ${formatDecimal(row.correlation)}${
              row.overlapping_ticker_count != null
                ? ` · ${row.overlapping_ticker_count} overlapping tickers`
                : ""
            }`;
            return (
              <li key={row.slug} title={tip}>
                <div className={panelStyles.neighborMeta}>
                  {showGroup && parts.group ? (
                    <span className={panelStyles.neighborGroup}>{parts.group}</span>
                  ) : null}
                  <Link
                    href={`/themes/${encodeURIComponent(row.slug)}`}
                    className={panelStyles.themeLink}
                    title={tip}
                  >
                    {parts.primary}
                  </Link>
                </div>
                <span className={panelStyles.num}>{formatDecimal(row.correlation)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function ThemeConstituentsCorrelationPanel({
  detail,
  slug,
  dataBaseUrl,
}: Props) {
  const bundle = useThemeCorrelationBundle(slug, dataBaseUrl);

  const constituentMeta = useMemo(
    () =>
      new Map(
        detail.constituents.map((row) => [
          row.ticker.trim().toUpperCase(),
          {
            name: row.name?.trim(),
            logo_url: typeof row.logo_url === "string" ? row.logo_url : null,
          },
        ]),
      ),
    [detail.constituents],
  );

  const cohesion = bundle.status === "ok" ? bundle.attribution?.cohesion?.[COHESION_HORIZON] : null;
  const stock = bundle.status === "ok" ? bundle.stockCorrelations : null;
  const neighbors = bundle.status === "ok" ? bundle.neighbors : null;
  const asOf =
    bundle.status === "ok"
      ? bundle.attribution?.as_of || stock?.as_of || neighbors?.as_of
      : undefined;
  const sampleSize =
    bundle.status === "ok"
      ? bundle.attribution?.horizons?.[COHESION_HORIZON]?.sample_size
      : undefined;

  const tickers = useMemo(() => stock?.tickers.map((t) => t.ticker) ?? [], [stock]);
  const { topPairs, bottomPairs, peerAvgs } = useMemo(() => {
    if (!stock || tickers.length < 2) {
      return { topPairs: [] as CorrPair[], bottomPairs: [] as CorrPair[], peerAvgs: [] as PeerAvg[] };
    }
    const { pairs, peerAvgs: avgs } = buildPairsAndPeerAvgs(tickers, stock.matrix);
    const sorted = [...pairs].sort((a, b) => b.value - a.value);
    return {
      topPairs: sorted.slice(0, 5),
      bottomPairs: [...sorted].reverse().slice(0, 5),
      peerAvgs: avgs,
    };
  }, [stock, tickers]);

  const fitRows = useMemo(() => {
    const fitByTicker = new Map<string, ThemeConstituentFitV0>();
    for (const row of cohesion?.constituents ?? []) {
      const ticker = row.ticker.trim().toUpperCase();
      if (ticker) fitByTicker.set(ticker, row);
    }
    const peerByTicker = new Map(peerAvgs.map((row) => [row.ticker, row.avg]));

    const ordered: string[] = [];
    const seen = new Set<string>();
    const push = (raw: string | undefined) => {
      const ticker = (raw || "").trim().toUpperCase();
      if (!ticker || seen.has(ticker)) return;
      seen.add(ticker);
      ordered.push(ticker);
    };
    // Prefer theme membership order, then any fit/matrix-only leftovers.
    for (const row of detail.constituents) push(row.ticker);
    for (const ticker of fitByTicker.keys()) push(ticker);
    for (const ticker of tickers) push(ticker);

    const rows: FitDisplayRow[] = ordered.map((ticker) => {
      const fit = fitByTicker.get(ticker);
      return {
        ticker,
        correlation_to_theme: fit?.correlation_to_theme,
        market_adjusted_correlation: fit?.market_adjusted_correlation,
        beta_to_theme: fit?.beta_to_theme,
        stock_specific_share: fit?.stock_specific_share,
        coverage_pct: fit?.coverage_pct,
        avg_to_peers: peerByTicker.get(ticker),
      };
    });

    return rows.sort(
      (a, b) => (b.correlation_to_theme ?? -2) - (a.correlation_to_theme ?? -2),
    );
  }, [cohesion, detail.constituents, peerAvgs, tickers]);

  if (bundle.status === "idle" || bundle.status === "loading") {
    return <p className={styles.muted}>Loading correlation…</p>;
  }
  if (bundle.status === "absent") {
    return <p className={styles.muted}>Correlation data is not available for this theme yet.</p>;
  }
  if (bundle.status === "error") {
    return <p className={styles.muted}>Could not load correlation data.</p>;
  }

  return (
    <div className={panelStyles.panel}>
      <div className={panelStyles.toolbar}>
        <div>
          <div className={panelStyles.eyebrow}>Correlation & cohesion</div>
          {asOf ? (
            <div className={panelStyles.asOf}>
              Through {asOf}
              {sampleSize != null && Number.isFinite(sampleSize)
                ? ` · ${sampleSize} trading sessions`
                : " · 1Y"}
            </div>
          ) : (
            <div className={panelStyles.asOf}>1Y</div>
          )}
        </div>
      </div>

      {cohesion ? (
        <section className={panelStyles.cohesionSection} aria-label="Constituent cohesion">
          <div className={panelStyles.cohesionGrid}>
            <div
              className={panelStyles.metricCard}
              title="Median correlation between each ticker and the weighted theme return after excluding that ticker from its comparator."
            >
              <div className={panelStyles.metricLabel}>Median correlation</div>
              <span className={panelStyles.metricValue}>
                {formatDecimal(cohesion.median_correlation)}
              </span>
              {cohesion.global_percentile != null ? (
                <span className={panelStyles.metricContext}>
                  {percentileLabel(cohesion.global_percentile)} across all themes
                  {cohesion.group_rank != null && cohesion.group_theme_count != null ? (
                    <>
                      <br />#{cohesion.group_rank} of {cohesion.group_theme_count} within its group
                    </>
                  ) : null}
                </span>
              ) : cohesion.group_rank != null && cohesion.group_theme_count != null ? (
                <span className={panelStyles.metricContext}>
                  #{cohesion.group_rank} of {cohesion.group_theme_count} within its group
                </span>
              ) : null}
            </div>
            <div
              className={panelStyles.metricCard}
              title="Median leave-one-out correlation after residualizing both the ticker and its leave-one-out theme against the broad market. Helps distinguish theme-specific co-movement from shared equity beta."
            >
              <div className={panelStyles.metricLabel}>Market-adjusted</div>
              <span className={panelStyles.metricValue}>
                {formatDecimal(cohesion.market_adjusted_median_correlation)}
              </span>
              {cohesion.market_adjusted_global_percentile != null ? (
                <span className={panelStyles.metricContext}>
                  {percentileLabel(cohesion.market_adjusted_global_percentile)} across all themes
                  {cohesion.market_adjusted_group_rank != null &&
                  cohesion.market_adjusted_group_theme_count != null ? (
                    <>
                      <br />#{cohesion.market_adjusted_group_rank} of{" "}
                      {cohesion.market_adjusted_group_theme_count} within its group
                    </>
                  ) : null}
                </span>
              ) : cohesion.market_adjusted_group_rank != null &&
                cohesion.market_adjusted_group_theme_count != null ? (
                <span className={panelStyles.metricContext}>
                  #{cohesion.market_adjusted_group_rank} of{" "}
                  {cohesion.market_adjusted_group_theme_count} within its group
                </span>
              ) : null}
            </div>
            <div
              className={panelStyles.metricCard}
              title="Percentage of valid constituents with leave-one-out theme correlation at or above 0.50."
            >
              <div className={panelStyles.metricLabel}>Above 0.50</div>
              <span className={panelStyles.metricValue}>{percent(cohesion.pct_above_0_50)}</span>
            </div>
            <div
              className={panelStyles.metricCard}
              title="Percentage of valid constituents moving negatively relative to their leave-one-out theme comparator."
            >
              <div className={panelStyles.metricLabel}>Negative</div>
              <span className={panelStyles.metricValue}>{percent(cohesion.pct_negative)}</span>
            </div>
            <div
              className={panelStyles.metricCard}
              title="Average share of the 1Y window with overlapping valid returns for each stock, its leave-one-out theme basket, and SPY. Data-confidence measure, not a quality score."
            >
              <div className={panelStyles.metricLabel}>Fit coverage</div>
              <span className={panelStyles.metricValue}>{percent(cohesion.coverage_pct)}</span>
            </div>
          </div>
        </section>
      ) : null}

      {neighbors ? (
        <section className={panelStyles.section} aria-labelledby="theme-neighbors">
          <h3 id="theme-neighbors" className={panelStyles.sectionTitle}>
            Theme neighbors
          </h3>
          <div className={panelStyles.neighborGrid}>
            <NeighborList
              title={
                neighbors.group ? `Closest in ${neighbors.group}` : "Closest in group"
              }
              titleHint="Highest 1Y theme-return correlations with other themes in the same group."
              rows={neighbors.closest_in_group}
              empty="None"
            />
            <NeighborList
              title={
                neighbors.group ? `Furthest in ${neighbors.group}` : "Furthest in group"
              }
              titleHint="Lowest 1Y theme-return correlations with other themes in the same group."
              rows={neighbors.furthest_in_group}
              empty="None"
            />
            <NeighborList
              title="Closest across all themes"
              titleHint="Highest 1Y theme-return correlations across all other themes (in-group and outside)."
              rows={neighbors.closest_across}
              empty="None"
              showGroup
            />
            <NeighborList
              title="Furthest outside"
              titleHint="Lowest 1Y correlations (closest to −1) with themes outside this group."
              rows={neighbors.furthest_outside}
              empty="None"
              showGroup
            />
          </div>
        </section>
      ) : null}

      {stock && tickers.length >= 2 || fitRows.length > 0 ? (
        <section className={panelStyles.matrixFitRow} aria-label="Constituent correlation matrix and fit">
          {stock && tickers.length >= 2 ? (
            <div className={panelStyles.matrixCol}>
              <details className={panelStyles.matrixDetails} open>
                <summary
                  id="constituent-matrix"
                  className={panelStyles.sectionTitle}
                  title="Pairwise daily-return correlations among top holdings by theme weight. Teal = positive, red = negative."
                >
                  Constituent correlation matrix
                </summary>
                <div
                  className={panelStyles.corrLayout}
                  data-density={matrixDensity(tickers.length)}
                >
                  <div className={panelStyles.matrixScroll}>
                    <table
                      className={panelStyles.matrix}
                      data-density={matrixDensity(tickers.length)}
                    >
                      <thead>
                        <tr>
                          <th scope="col" />
                          {tickers.map((ticker) => {
                            const meta = constituentMeta.get(ticker);
                            return (
                              <th key={ticker} scope="col" title={meta?.name || ticker}>
                                {ticker}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {tickers.map((rowTicker, i) => {
                          const rowMeta = constituentMeta.get(rowTicker);
                          return (
                            <tr key={rowTicker}>
                              <th scope="row" title={rowMeta?.name || rowTicker}>
                                {rowTicker}
                              </th>
                              {tickers.map((colTicker, j) => {
                                const raw = stock.matrix[i]?.[j];
                                const value =
                                  typeof raw === "number" && Number.isFinite(raw) ? raw : null;
                                const colMeta = constituentMeta.get(colTicker);
                                const tip =
                                  value == null
                                    ? `${rowTicker} · ${colTicker}: n/a`
                                    : `${rowMeta?.name || rowTicker} · ${colMeta?.name || colTicker}: ${formatDecimal(value)}`;
                                return (
                                  <td
                                    key={`${rowTicker}-${colTicker}`}
                                    style={{ background: cellColor(value) }}
                                    title={tip}
                                  >
                                    {value == null ? "—" : formatDecimal(value)}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <aside className={panelStyles.corrSide}>
                    <div className={panelStyles.pairGrid}>
                      <div className={panelStyles.pairBlock}>
                        <h4
                          className={panelStyles.colTitle}
                          title="Most positively correlated ticker pairs among shown holdings (1Y)."
                        >
                          Closest pairs
                        </h4>
                        <ul className={panelStyles.pairList}>
                          {topPairs.map((pair) => {
                            const tip = `${constituentMeta.get(pair.a)?.name || pair.a} · ${constituentMeta.get(pair.b)?.name || pair.b}: ${formatDecimal(pair.value)}`;
                            return (
                              <li key={`hi-${pair.a}-${pair.b}`} title={tip}>
                                <span>
                                  {pair.a} · {pair.b}
                                </span>
                                <span className={panelStyles.num}>{formatDecimal(pair.value)}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <div className={panelStyles.pairBlock}>
                        <h4
                          className={panelStyles.colTitle}
                          title="Least correlated ticker pairs among shown holdings (1Y; closest to −1)."
                        >
                          Furthest pairs
                        </h4>
                        <ul className={panelStyles.pairList}>
                          {bottomPairs.map((pair) => {
                            const tip = `${constituentMeta.get(pair.a)?.name || pair.a} · ${constituentMeta.get(pair.b)?.name || pair.b}: ${formatDecimal(pair.value)}`;
                            return (
                              <li key={`lo-${pair.a}-${pair.b}`} title={tip}>
                                <span>
                                  {pair.a} · {pair.b}
                                </span>
                                <span className={panelStyles.num}>{formatDecimal(pair.value)}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </aside>
                </div>
              </details>
            </div>
          ) : null}

          {fitRows.length > 0 ? (
            <div className={panelStyles.fitCol}>
              <h3 id="fit-by-ticker" className={panelStyles.sectionTitle}>
                Fit by ticker
              </h3>
              <div className={panelStyles.fitTableWrap}>
                <table className={panelStyles.fitTable}>
                  <thead>
                    <tr>
                      <th scope="col">Ticker</th>
                      <th
                        scope="col"
                        title="Correlation to the manually weighted return of all other theme constituents. The ticker is excluded from its own comparator."
                      >
                        Theme corr
                      </th>
                      <th
                        scope="col"
                        title="Theme correlation after residualizing both the ticker and its leave-one-out theme against the broad market."
                      >
                        Mkt-adj
                      </th>
                      <th
                        scope="col"
                        title="Sensitivity to a 1% move in the leave-one-out theme return over 1Y."
                      >
                        Beta
                      </th>
                      <th
                        scope="col"
                        title="One minus correlation squared. Higher values mean more of the ticker's movement was stock-specific rather than shared with its theme."
                      >
                        Stock-spec
                      </th>
                      <th
                        scope="col"
                        title="Share of the 1Y window with overlapping valid returns for this fit."
                      >
                        Coverage
                      </th>
                      <th
                        scope="col"
                        title="Average pairwise correlation to the other holdings shown in the constituent matrix."
                      >
                        Avg peers
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fitRows.map((row) => {
                      const meta = constituentMeta.get(row.ticker);
                      const name = meta?.name || row.ticker;
                      return (
                        <tr key={row.ticker}>
                          <td>
                            <div className={panelStyles.company} title={name}>
                              <ConstituentLogo ticker={row.ticker} logoUrl={meta?.logo_url} />
                              <TickerBadge ticker={row.ticker} />
                            </div>
                          </td>
                          <td>{formatDecimal(row.correlation_to_theme)}</td>
                          <td>{formatDecimal(row.market_adjusted_correlation)}</td>
                          <td>{formatDecimal(row.beta_to_theme)}</td>
                          <td>
                            {row.stock_specific_share == null
                              ? "—"
                              : percent(row.stock_specific_share * 100)}
                          </td>
                          <td>{row.coverage_pct == null ? "—" : percent(row.coverage_pct)}</td>
                          <td>{formatDecimal(row.avg_to_peers)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
