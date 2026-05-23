"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  TREEMAP_RETURN_PERIODS,
  pickDefaultTreemapPeriod,
  type ConstituentTreemapNode,
  type TreemapReturnColumn,
} from "@/lib/buildConstituentTreemapNodes";
import {
  buildTreemapRects,
  formatReturnPct,
  returnTileBackground,
  type TreemapLayoutNode,
} from "@/lib/treemapLayout";

import styles from "./ThemeHeroTreemap.module.css";

type Props = {
  nodes: ConstituentTreemapNode[];
  themeName: string;
  /** Pre-formatted ET timestamp (server-only); shown as small “As of …” below the map. */
  asOfLabel?: string | null;
  /** `theme` = group map tiles link to `/themes/<slug>`; `constituent` = ticker labels (default). */
  tileMode?: "constituent" | "theme";
  /** Initial color-by period (compute on server with `pickDefaultTreemapPeriod`). */
  defaultReturnPeriod?: TreemapReturnColumn;
};

function weightLabel(weight: number, total: number): string {
  if (total > 1.5) return `${Math.max(0, weight).toFixed(1)}%`;
  return `${((Math.max(0, weight) / total) * 100).toFixed(1)}%`;
}

export function ThemeHeroTreemap({
  nodes,
  themeName,
  asOfLabel,
  tileMode = "constituent",
  defaultReturnPeriod,
}: Props) {
  const availablePeriods = useMemo(() => {
    return TREEMAP_RETURN_PERIODS.filter(({ key }) =>
      nodes.some((n) => n.returns[key] != null),
    );
  }, [nodes]);

  const fallbackPeriod = useMemo(() => pickDefaultTreemapPeriod(nodes), [nodes]);
  const [period, setPeriod] = useState<TreemapReturnColumn>(
    () => defaultReturnPeriod ?? fallbackPeriod,
  );

  const activePeriod: TreemapReturnColumn | null = availablePeriods.some((p) => p.key === period)
    ? period
    : (availablePeriods[0]?.key ?? null);

  const layoutNodes = useMemo((): TreemapLayoutNode<ConstituentTreemapNode>[] => {
    return nodes
      .filter((n) => n.weight > 0)
      .map((n) => ({ data: n, weight: n.weight }));
  }, [nodes]);

  const rects = useMemo(
    () => buildTreemapRects(layoutNodes, 0, 0, 100, 100),
    [layoutNodes],
  );

  const totalWeight = nodes.reduce((s, n) => s + Math.max(0, n.weight), 0) || 1;
  const gap = 0.35;
  const periodLabel = activePeriod
    ? (TREEMAP_RETURN_PERIODS.find((p) => p.key === activePeriod)?.label ?? activePeriod)
    : null;

  if (!nodes.length) {
    return null;
  }

  return (
    <div className={styles.panel}>
      {availablePeriods.length > 1 ? (
        <div className={styles.toolbar}>
          <span className={styles.toolbarLabel}>Color by</span>
          <div className={styles.toggle} role="group" aria-label="Return period for market map colors">
            {availablePeriods.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={activePeriod === key ? styles.toggleActive : undefined}
                aria-pressed={activePeriod === key}
                onClick={() => setPeriod(key)}
              >
                {label}%
              </button>
            ))}
          </div>
        </div>
      ) : periodLabel ? (
        <p className={styles.soloLabel}>{periodLabel}% return</p>
      ) : (
        <p className={styles.soloLabel}>By weight</p>
      )}
      <div className={styles.mapWrap}>
      <div
        className={styles.map}
        role="img"
        aria-label={
          tileMode === "theme"
            ? periodLabel
              ? `${themeName} theme market map colored by ${periodLabel} percent change`
              : `${themeName} theme market map by equal weight`
            : periodLabel
              ? `${themeName} constituent market map colored by ${periodLabel} percent change`
              : `${themeName} constituent market map by weight`
        }
      >
        {rects.map((r) => {
          const n = r.data;
          const ret = activePeriod != null ? (n.returns[activePeriod] ?? null) : null;
          const left = r.x + gap / 2;
          const top = r.y + gap / 2;
          const width = Math.max(2, r.w - gap);
          const height = Math.max(2, r.h - gap);
          const href =
            tileMode === "theme" ? `/themes/${encodeURIComponent(n.ticker)}` : undefined;
          const title =
            periodLabel
              ? `${n.name} · ${periodLabel}: ${formatReturnPct(ret)} · weight ${weightLabel(n.weight, totalWeight)}`
              : `${n.name} · weight ${weightLabel(n.weight, totalWeight)}`;
          const isThemeTile = tileMode === "theme";
          const inner = (
            <div
              className={
                isThemeTile ? `${styles.cellInner} ${styles.cellInnerTheme}` : styles.cellInner
              }
            >
              {tileMode === "constituent" && n.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- CDN logo URL from ETL when present
                <img src={n.logo_url} alt="" className={styles.logo} loading="lazy" decoding="async" />
              ) : null}
              <div
                className={
                  isThemeTile ? `${styles.labelStack} ${styles.labelStackTheme}` : styles.labelStack
                }
              >
                {tileMode === "constituent" ? (
                  <span className={styles.ticker}>{n.ticker}</span>
                ) : (
                  <span className={`${styles.ticker} ${styles.themeTileLabel}`}>{n.name}</span>
                )}
                {activePeriod != null ? (
                  <span
                    className={
                      ret != null && ret > 0
                        ? `${styles.returnPct} ${styles.returnPctUp}`
                        : ret != null && ret < 0
                          ? `${styles.returnPct} ${styles.returnPctDown}`
                          : `${styles.returnPct} ${styles.returnPctFlat}`
                    }
                  >
                    {formatReturnPct(ret)}
                  </span>
                ) : null}
                <span className={styles.weightPct}>{weightLabel(n.weight, totalWeight)}</span>
              </div>
            </div>
          );
          const style = {
            left: `${left}%`,
            top: `${top}%`,
            width: `${width}%`,
            height: `${height}%`,
            background: returnTileBackground(ret),
          };
          return href ? (
            <Link
              key={n.ticker}
              href={href}
              className={`${styles.cell} ${styles.cellLink}`}
              style={style}
              title={title}
            >
              {inner}
            </Link>
          ) : (
            <div key={n.ticker} className={styles.cell} style={style} title={title}>
              {inner}
            </div>
          );
        })}
      </div>
      {asOfLabel ? (
        <div className={styles.mapCaptionRow}>
          <p className={styles.mapCaptionBelow}>As of {asOfLabel}</p>
        </div>
      ) : null}
      </div>
    </div>
  );
}
