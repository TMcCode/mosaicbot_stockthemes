"use client";

import { useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import panelStyles from "@/components/ThemeConstituentsFactorDriversPanel.module.css";
import { TickerBadge } from "@/components/TickerBadge";
import { useThemeFactorAttributionSidecar } from "@/hooks/useThemeFactorAttributionSidecar";
import {
  availableFactorAttributionHorizons,
  formatDecimal,
  formatSignedPercent,
} from "@/lib/themeFactorAttribution";
import type { ThemeFactorAttributionHorizon } from "@/types/theme.factor_attribution.v0";
import type { ThemeDetailV0 } from "@/types/theme.detail.v0";

type Props = {
  detail: ThemeDetailV0;
  slug: string;
  dataBaseUrl: string;
};

function valueClass(value: number | undefined): string {
  if (value == null || value === 0) return "";
  return value > 0 ? panelStyles.positive : panelStyles.negative;
}

function percent(value: number | undefined, digits = 0): string {
  return value == null || !Number.isFinite(value) ? "—" : `${value.toFixed(digits)}%`;
}

function percentile(value: number | undefined): string {
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

export default function ThemeConstituentsFactorDriversPanel({
  detail,
  slug,
  dataBaseUrl,
}: Props) {
  const sidecarState = useThemeFactorAttributionSidecar(slug, dataBaseUrl);
  const [requestedHorizon, setRequestedHorizon] =
    useState<ThemeFactorAttributionHorizon>("1Y");

  const availableHorizons =
    sidecarState.status === "ok"
      ? availableFactorAttributionHorizons(sidecarState.data)
      : [];
  const horizon = availableHorizons.includes(requestedHorizon)
    ? requestedHorizon
    : availableHorizons.includes("1Y")
      ? "1Y"
      : availableHorizons[0];

  const constituentMeta = useMemo(
    () =>
      new Map(
        detail.constituents.map((row) => [
          row.ticker.trim().toUpperCase(),
          { name: row.name?.trim(), weight: row.weight },
        ]),
      ),
    [detail.constituents],
  );

  if (sidecarState.status === "idle" || sidecarState.status === "loading") {
    return <p className={styles.muted}>Loading factor drivers…</p>;
  }
  if (sidecarState.status === "absent") {
    return <p className={styles.muted}>Factor drivers are not available for this theme yet.</p>;
  }
  if (sidecarState.status === "error") {
    return <p className={styles.muted}>Could not load factor drivers.</p>;
  }
  if (!horizon) {
    return <p className={styles.muted}>Factor drivers are not available for this theme yet.</p>;
  }

  const data = sidecarState.data;
  const attribution = data.horizons[horizon];
  const cohesion = data.cohesion[horizon];
  if (!attribution) {
    return <p className={styles.muted}>This attribution horizon is not available.</p>;
  }

  const maxContribution = Math.max(
    0.01,
    ...attribution.contributions.map((row) => Math.abs(row.contribution_pct)),
  );
  const fitRows = [...(cohesion?.constituents ?? [])].sort(
    (a, b) => (b.correlation_to_theme ?? -2) - (a.correlation_to_theme ?? -2),
  );

  return (
    <div className={panelStyles.panel}>
      <div className={panelStyles.toolbar}>
        <div>
          <p className={panelStyles.eyebrow}>Return attribution</p>
          <p className={panelStyles.asOf}>
            Through {data.as_of} · {attribution.sample_size} trading sessions
          </p>
        </div>
        <label className={panelStyles.horizonControl}>
          Horizon
          <select
            value={horizon}
            onChange={(event) =>
              setRequestedHorizon(event.target.value as ThemeFactorAttributionHorizon)
            }
            aria-label="Factor Drivers horizon"
          >
            {availableHorizons.map((key) => (
              <option key={key} value={key}>
                {key === "1M" ? "1M (noisy)" : key}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={panelStyles.summaryGrid}>
        <div
          className={panelStyles.metricCard}
          title={`The theme's compounded return over the selected ${horizon} horizon.`}
        >
          <p className={panelStyles.metricLabel}>Actual return</p>
          <span className={`${panelStyles.metricValue} ${valueClass(attribution.actual_return_pct)}`}>
            {formatSignedPercent(attribution.actual_return_pct)}
          </span>
        </div>
        <div
          className={panelStyles.metricCard}
          title="The portion attributed to the core factor model. Daily contributions use 252-session rolling exposures estimated only through the prior session."
        >
          <p className={panelStyles.metricLabel}>Factor explained</p>
          <span
            className={`${panelStyles.metricValue} ${valueClass(attribution.explained_return_pct)}`}
          >
            {formatSignedPercent(attribution.explained_return_pct)}
          </span>
        </div>
        <div
          className={panelStyles.metricCard}
          title="Actual return minus core factor contributions. This can include earnings, company news, omitted factors, changing constituent behavior, and model error; it is not labeled alpha."
        >
          <p className={panelStyles.metricLabel}>Theme-specific</p>
          <span
            className={`${panelStyles.metricValue} ${valueClass(attribution.theme_specific_return_pct)}`}
          >
            {formatSignedPercent(attribution.theme_specific_return_pct)}
          </span>
        </div>
        <div
          className={panelStyles.metricCard}
          title="Realized model fit over the selected horizon. Higher means daily core factor contributions tracked more of the theme's movement; negative values indicate a poor fit."
        >
          <p className={panelStyles.metricLabel}>Model fit (R²)</p>
          <span className={panelStyles.metricValue}>
            {attribution.model_r2 == null ? "—" : percent(attribution.model_r2 * 100)}
          </span>
        </div>
        <div
          className={panelStyles.metricCard}
          title="Share of the requested horizon with valid theme and core-factor observations."
        >
          <p className={panelStyles.metricLabel}>Coverage</p>
          <span className={panelStyles.metricValue}>{percent(attribution.coverage_pct)}</span>
        </div>
      </div>

      <section className={panelStyles.section} aria-labelledby="core-factor-contributions">
        <h3 id="core-factor-contributions" className={panelStyles.sectionTitle}>
          Core factor contributions
        </h3>
        <div className={panelStyles.tableScroll}>
          <table className={panelStyles.contributionTable}>
            <thead>
              <tr>
                <th
                  scope="col"
                  title="The non-duplicated core factor. Growth versus Value is represented once as a signed axis."
                >
                  Factor
                </th>
                <th
                  scope="col"
                  title={`The factor proxy's compounded return during ${horizon}. This is the factor move, not its contribution.`}
                >
                  Factor move
                </th>
                <th
                  scope="col"
                  title="Average rolling sensitivity during the selected horizon. Positive beta means the theme generally moved with the factor; negative beta means it generally moved against it."
                >
                  Avg beta
                </th>
                <th
                  scope="col"
                  title="Estimated percentage-point contribution after geometrically linking daily beta × factor-return contributions. Positive helped the theme; negative detracted."
                >
                  Contribution
                </th>
              </tr>
            </thead>
            <tbody>
              {attribution.contributions.map((row) => (
                <tr key={row.factor_id}>
                  <td className={panelStyles.factorCell}>
                    <strong>{row.label}</strong>
                    <div className={panelStyles.barTrack} aria-hidden="true">
                      <div
                        className={`${panelStyles.barFill} ${
                          row.contribution_pct < 0 ? panelStyles.barFillNegative : ""
                        }`}
                        style={{
                          width: `${Math.max(
                            2,
                            (Math.abs(row.contribution_pct) / maxContribution) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td className={valueClass(row.factor_return_pct)}>
                    {formatSignedPercent(row.factor_return_pct)}
                  </td>
                  <td>{formatDecimal(row.average_beta)}</td>
                  <td className={valueClass(row.contribution_pct)}>
                    {formatSignedPercent(row.contribution_pct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {cohesion ? (
        <section className={panelStyles.section} aria-labelledby="constituent-cohesion">
          <h3 id="constituent-cohesion" className={panelStyles.sectionTitle}>
            Constituent cohesion
          </h3>
          <div className={panelStyles.cohesionGrid}>
            <div
              className={panelStyles.metricCard}
              title="Median correlation between each ticker and the weighted theme return after excluding that ticker from its comparator."
            >
              <p className={panelStyles.metricLabel}>Median correlation</p>
              <span className={panelStyles.metricValue}>
                {formatDecimal(cohesion.median_correlation)}
              </span>
              {cohesion.global_percentile != null ? (
                <span className={panelStyles.metricContext}>
                  {percentile(cohesion.global_percentile)} across all themes
                  {cohesion.group_rank != null && cohesion.group_theme_count != null ? (
                    <>
                      <br />#{cohesion.group_rank} of {cohesion.group_theme_count} within its group
                    </>
                  ) : null}
                </span>
              ) : null}
            </div>
            <div
              className={panelStyles.metricCard}
              title="Median leave-one-out correlation after removing each series' relationship with the broad market. This helps distinguish theme-specific co-movement from shared equity beta."
            >
              <p className={panelStyles.metricLabel}>Market-adjusted</p>
              <span className={panelStyles.metricValue}>
                {formatDecimal(cohesion.market_adjusted_median_correlation)}
              </span>
              {cohesion.market_adjusted_global_percentile != null ? (
                <span className={panelStyles.metricContext}>
                  {percentile(cohesion.market_adjusted_global_percentile)} across all themes
                  {cohesion.market_adjusted_group_rank != null &&
                  cohesion.market_adjusted_group_theme_count != null ? (
                    <>
                      <br />#{cohesion.market_adjusted_group_rank} of{" "}
                      {cohesion.market_adjusted_group_theme_count} within its group
                    </>
                  ) : null}
                </span>
              ) : null}
            </div>
            <div
              className={panelStyles.metricCard}
              title="Percentage of valid constituents with leave-one-out theme correlation at or above 0.50."
            >
              <p className={panelStyles.metricLabel}>Above 0.50</p>
              <span className={panelStyles.metricValue}>
                {percent(cohesion.pct_above_0_50)}
              </span>
            </div>
            <div
              className={panelStyles.metricCard}
              title="Percentage of valid constituents moving negatively relative to their leave-one-out theme comparator."
            >
              <p className={panelStyles.metricLabel}>Negative</p>
              <span className={panelStyles.metricValue}>{percent(cohesion.pct_negative)}</span>
            </div>
            <div
              className={panelStyles.metricCard}
              title={`Average share of the selected ${horizon} period with overlapping valid returns for each stock, its leave-one-out theme basket, and SPY. ${Math.round(cohesion.coverage_pct)}% is approximately ${Math.round((attribution.sample_size * cohesion.coverage_pct) / 100)} of ${attribution.sample_size} sessions per constituent. Foreign-market calendars, newer listings, suspended trading, and missing prices can reduce coverage. This is a data-confidence measure, not a quality score.`}
            >
              <p className={panelStyles.metricLabel}>Fit coverage</p>
              <span className={panelStyles.metricValue}>{percent(cohesion.coverage_pct)}</span>
            </div>
          </div>

          <div className={panelStyles.tableScroll}>
            <table className={panelStyles.fitTable}>
              <thead>
                <tr>
                  <th scope="col">Company</th>
                  <th
                    scope="col"
                    title="Correlation to the manually weighted return of all other theme constituents. The ticker is excluded from its own comparator."
                  >
                    Theme correlation
                  </th>
                  <th
                    scope="col"
                    title="Theme correlation after residualizing both the ticker and its leave-one-out theme against the broad market."
                  >
                    Market-adjusted
                  </th>
                  <th
                    scope="col"
                    title="Sensitivity to a 1% move in the leave-one-out theme return over the selected horizon."
                  >
                    Theme beta
                  </th>
                  <th
                    scope="col"
                    title="One minus correlation squared. Higher values indicate that more of the ticker's movement was stock-specific rather than shared with its theme."
                  >
                    Stock-specific
                  </th>
                  <th scope="col" title="Share of the requested horizon with valid observations.">
                    Coverage
                  </th>
                </tr>
              </thead>
              <tbody>
                {fitRows.map((row) => {
                  const meta = constituentMeta.get(row.ticker);
                  return (
                    <tr key={row.ticker}>
                      <td>
                        <div className={panelStyles.company}>
                          <span className={panelStyles.companyName}>
                            {meta?.name || row.ticker}
                          </span>
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
                      <td>{percent(row.coverage_pct)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <p className={panelStyles.disclosure}>
        Estimated from daily returns using rolling 252-session ridge exposures known before each
        return. Core contributions plus theme-specific return reconcile to actual return. Long-term
        results use reconstructed history based on current theme membership and are not
        point-in-time investable portfolio results. Cohesion describes how tightly constituents
        traded together; low cohesion is not automatically poor quality.
      </p>
    </div>
  );
}
