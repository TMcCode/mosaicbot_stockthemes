"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  FactorMakeupThemeCombobox,
  type FactorMakeupThemePick,
} from "@/components/FactorMakeupThemeCombobox";
import type { FactorMakeupRadarSeries } from "@/components/FactorMakeupRadar";
import { FactorMakeupScoreTable } from "@/components/FactorMakeupScoreTable";
import {
  FACTOR_MAKEUP_AXIS_IDS,
  type FactorMakeupAxisId,
} from "@/lib/factorMakeupAxes";
import {
  loadThemeFactorMakeupBundle,
  type ThemeFactorMakeupScores,
} from "@/lib/loadThemeFactorVectors";
import { OVERLAY_CHART_PALETTE } from "@/lib/overlayChartPalette";

import pageStyles from "@/components/FactorsPageClient.module.css";
import styles from "./FactorMakeupPanel.module.css";

const FactorMakeupRadar = dynamic(
  () => import("@/components/FactorMakeupRadar").then((m) => m.FactorMakeupRadar),
  {
    ssr: false,
    loading: () => (
      <div className={styles.radarLoading} aria-busy="true" aria-label="Loading radar chart" />
    ),
  },
);

export type FactorMakeupTheme = {
  slug: string;
  theme: string;
};

type Props = {
  dataBaseUrl: string;
  themes: FactorMakeupTheme[];
  maxThemes: number;
  onThemesChange: (next: FactorMakeupTheme[]) => void;
};

export function FactorMakeupPanel({
  dataBaseUrl,
  themes,
  maxThemes,
  onThemesChange,
}: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [index, setIndex] = useState<Map<string, ThemeFactorMakeupScores> | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [selectedAxisId, setSelectedAxisId] = useState<FactorMakeupAxisId | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus((prev) => (prev === "ok" ? prev : "loading"));
    void loadThemeFactorMakeupBundle(dataBaseUrl).then((bundle) => {
      if (cancelled) return;
      if (!bundle) {
        setStatus("error");
        return;
      }
      setIndex(bundle.bySlug);
      setAsOf(bundle.asOf);
      setStatus("ok");
    });
    return () => {
      cancelled = true;
    };
  }, [dataBaseUrl]);

  const selectedSlugs = useMemo(() => new Set(themes.map((t) => t.slug)), [themes]);

  const radarSeries: FactorMakeupRadarSeries[] = useMemo(() => {
    if (!index) return [];
    return themes.map((t, idx) => {
      const row = index.get(t.slug);
      const values = FACTOR_MAKEUP_AXIS_IDS.map((id) =>
        row?.scores[id] != null ? row.scores[id]! : null,
      );
      const ranks = FACTOR_MAKEUP_AXIS_IDS.map((id) =>
        row?.ranks[id] != null ? row.ranks[id]! : null,
      );
      const totals = FACTOR_MAKEUP_AXIS_IDS.map((id) =>
        row?.totals[id] != null ? row.totals[id]! : null,
      );
      return {
        slug: t.slug,
        name: row?.theme || t.theme,
        color: OVERLAY_CHART_PALETTE[idx % OVERLAY_CHART_PALETTE.length],
        values,
        ranks,
        totals,
      };
    });
  }, [themes, index]);

  const missingSlugs = useMemo(() => {
    if (!index) return [];
    return themes.filter((t) => !index.has(t.slug)).map((t) => t.theme || t.slug);
  }, [themes, index]);

  const onAdd = (pick: FactorMakeupThemePick) => {
    if (selectedSlugs.has(pick.slug) || themes.length >= maxThemes) return;
    onThemesChange([...themes, { slug: pick.slug, theme: pick.name }]);
  };

  const onRemove = (slug: string) => {
    onThemesChange(themes.filter((t) => t.slug !== slug));
  };

  const displayName = (t: FactorMakeupTheme) => index?.get(t.slug)?.theme || t.theme;

  const onSelectAxis = (axisId: FactorMakeupAxisId | null) => {
    setSelectedAxisId(axisId);
  };

  const onAxisClick = (axisId: FactorMakeupAxisId) => {
    setSelectedAxisId((prev) => (prev === axisId ? null : axisId));
  };

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <div className={styles.searchBlock}>
          <span className={pageStyles.label}>Themes</span>
          <FactorMakeupThemeCombobox
            selectedSlugs={selectedSlugs}
            atLimit={themes.length >= maxThemes}
            maxThemes={maxThemes}
            onAdd={onAdd}
          />
        </div>
        <div className={styles.metaBlock}>
          <span className={styles.count}>
            {themes.length}/{maxThemes} selected
          </span>
          {themes.length ? (
            <button
              type="button"
              className={pageStyles.clearBtn}
              onClick={() => onThemesChange([])}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {themes.length > 0 ? (
        <ul className={styles.chipList} aria-label="Selected themes">
          {themes.map((t, idx) => (
            <li key={t.slug} className={styles.chip}>
              <span
                className={styles.chipSwatch}
                style={{ background: OVERLAY_CHART_PALETTE[idx % OVERLAY_CHART_PALETTE.length] }}
              />
              <Link href={`/themes/${t.slug}`} className={styles.chipLink}>
                {displayName(t)}
              </Link>
              <button
                type="button"
                className={styles.chipRemove}
                aria-label={`Remove ${displayName(t)}`}
                onClick={() => onRemove(t.slug)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {status === "loading" || status === "idle" ? (
        <p className={styles.empty}>Loading factor scores…</p>
      ) : null}
      {status === "error" ? (
        <p className={styles.empty}>Could not load factor makeup data.</p>
      ) : null}

      {status === "ok" && themes.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Pick themes to compare factor makeup</p>
          <p className={styles.emptyCopy}>
            Search and add up to {maxThemes} themes. Each polygon shows co-movement with
            factor ETF spreads (0–100; 50 = median).
          </p>
        </div>
      ) : null}

      {status === "ok" && themes.length > 0 ? (
        <>
          <div className={styles.compareLayout}>
            <div className={styles.radarCol}>
              <div className={styles.panelHead}>
                <h3 className={styles.panelTitle}>Factor radar</h3>
              </div>
              <FactorMakeupRadar
                axisIds={FACTOR_MAKEUP_AXIS_IDS}
                series={radarSeries}
                ariaLabel="Theme factor makeup radar"
                selectedAxisId={selectedAxisId}
                onAxisClick={onAxisClick}
              />
            </div>
            <div className={styles.tableCol}>
              <FactorMakeupScoreTable
                series={radarSeries}
                selectedAxisId={selectedAxisId}
                onSelectAxis={onSelectAxis}
              />
            </div>
          </div>
          {missingSlugs.length ? (
            <p className={styles.warn}>No factor scores for: {missingSlugs.join(", ")}</p>
          ) : null}
          <p className={styles.caption}>
            Co-movement scores vs factor ETF spreads · dashed ring = median (50)
            {asOf ? ` · As of ${asOf.slice(0, 10)}` : ""}
          </p>
        </>
      ) : null}
    </div>
  );
}
