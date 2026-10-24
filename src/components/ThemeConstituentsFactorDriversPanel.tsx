"use client";

import { useState } from "react";

import styles from "@/app/page.module.css";
import panelStyles from "@/components/ThemeConstituentsFactorDriversPanel.module.css";
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

export default function ThemeConstituentsFactorDriversPanel({
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
  if (!attribution) {
    return <p className={styles.muted}>This attribution horizon is not available.</p>;
  }

  const maxContribution = Math.max(
    0.01,
    ...attribution.contributions.map((row) => Math.abs(row.contribution_pct)),
  );

  return (
    <div className={panelStyles.panel}>
      <div className={panelStyles.toolbar}>
        <div>
          <div className={panelStyles.eyebrow}>Return attribution</div>
          <div className={panelStyles.asOf}>
            Through {data.as_of} · {attribution.sample_size} trading sessions
          </div>
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
          <div className={panelStyles.metricLabel}>
            <span className={panelStyles.labelFull}>Actual return</span>
            <span className={panelStyles.labelShort}>Actual</span>
          </div>
          <span className={`${panelStyles.metricValue} ${valueClass(attribution.actual_return_pct)}`}>
            {formatSignedPercent(attribution.actual_return_pct)}
          </span>
        </div>
        <div
          className={panelStyles.metricCard}
          title="The portion attributed to the core factor model. Daily contributions use 252-session rolling exposures estimated only through the prior session."
        >
          <div className={panelStyles.metricLabel}>
            <span className={panelStyles.labelFull}>Factor explained</span>
            <span className={panelStyles.labelShort}>Factor</span>
          </div>
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
          <div className={panelStyles.metricLabel}>
            <span className={panelStyles.labelFull}>Theme-specific</span>
            <span className={panelStyles.labelShort}>Theme</span>
          </div>
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
          <div className={panelStyles.metricLabel}>
            <span className={panelStyles.labelFull}>Model fit (R²)</span>
            <span className={panelStyles.labelShort}>R²</span>
          </div>
          <span className={panelStyles.metricValue}>
            {attribution.model_r2 == null ? "—" : percent(attribution.model_r2 * 100)}
          </span>
        </div>
        <div
          className={panelStyles.metricCard}
          title="Share of the requested horizon with valid theme and core-factor observations."
        >
          <div className={panelStyles.metricLabel}>Coverage</div>
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

      <div className={panelStyles.disclosure}>
        Estimated from daily returns using rolling 252-session ridge exposures known before each
        return. Core contributions plus theme-specific return reconcile to actual return. Long-term
        results use reconstructed history based on current theme membership and are not
        point-in-time investable portfolio results.
      </div>
    </div>
  );
}
