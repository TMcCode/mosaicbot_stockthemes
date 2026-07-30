"use client";

import { useMemo, useState } from "react";

import { factorDisplayLabel } from "@/lib/factorDisplayLabel";
import { factorTooltipSummaryForId } from "@/lib/factorTooltipSummaries";
import type { FactorMakeupAxisId } from "@/lib/factorMakeupAxes";
import { FACTOR_MAKEUP_SHORT_LABELS } from "@/lib/factorMakeupAxes";
import { BrandWatermark } from "@/components/BrandWatermark";

import styles from "./FactorMakeupRadar.module.css";

export type FactorMakeupRadarSeries = {
  slug: string;
  name: string;
  color: string;
  /** Scores aligned to `axisIds` (0–100); null = missing. */
  values: Array<number | null>;
  ranks?: Array<number | null>;
  totals?: Array<number | null>;
};

type Props = {
  axisIds: readonly FactorMakeupAxisId[];
  series: FactorMakeupRadarSeries[];
  ariaLabel?: string;
  selectedAxisId?: FactorMakeupAxisId | null;
  onAxisClick?: (axisId: FactorMakeupAxisId) => void;
};

const SIZE = 520;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADIUS = 168;
const LABEL_R = RADIUS + 28;
/** Modest top crop so the chart sits closer under the title without ballooning. */
const VIEW_PAD = 44;
const VIEW_TOP = 40;
const LEVELS = [20, 40, 50, 60, 80, 100];
const MEDIAN = 50;

function polar(angleRad: number, r: number): { x: number; y: number } {
  return {
    x: CX + r * Math.sin(angleRad),
    y: CY - r * Math.cos(angleRad),
  };
}

function scoreToRadius(score: number): number {
  const clamped = Math.max(0, Math.min(100, score));
  return (clamped / 100) * RADIUS;
}

function polygonPoints(
  values: Array<number | null>,
  n: number,
): string {
  return values
    .map((v, i) => {
      const angle = (i / n) * Math.PI * 2;
      const r = scoreToRadius(v == null || !Number.isFinite(v) ? 0 : v);
      const { x, y } = polar(angle, r);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function FactorMakeupRadar({
  axisIds,
  series,
  ariaLabel,
  selectedAxisId = null,
  onAxisClick,
}: Props) {
  const n = axisIds.length;
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [hoveredAxis, setHoveredAxis] = useState<number | null>(null);

  const gridRings = useMemo(
    () =>
      LEVELS.map((level) => {
        const r = scoreToRadius(level);
        const pts = Array.from({ length: n }, (_, i) => {
          const { x, y } = polar((i / n) * Math.PI * 2, r);
          return `${x.toFixed(2)},${y.toFixed(2)}`;
        }).join(" ");
        return { level, pts, isMedian: level === MEDIAN };
      }),
    [n],
  );

  const spokes = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const angle = (i / n) * Math.PI * 2;
        const tip = polar(angle, RADIUS);
        const labelPos = polar(angle, LABEL_R);
        return { i, tip, labelPos, angle };
      }),
    [n],
  );

  const tooltip = useMemo(() => {
    if (hoveredSlug == null || hoveredAxis == null) return null;
    const s = series.find((x) => x.slug === hoveredSlug);
    if (!s) return null;
    const axisId = axisIds[hoveredAxis];
    const score = s.values[hoveredAxis];
    const rank = s.ranks?.[hoveredAxis];
    const total = s.totals?.[hoveredAxis];
    return {
      theme: s.name,
      color: s.color,
      axisLabel: factorDisplayLabel(axisId, FACTOR_MAKEUP_SHORT_LABELS[axisId]),
      score,
      rank,
      total,
      method: factorTooltipSummaryForId(axisId),
    };
  }, [hoveredSlug, hoveredAxis, series, axisIds]);

  if (n < 3) return null;

  return (
    <div className={styles.wrap}>
      <svg
        className={styles.svg}
        viewBox={`${VIEW_PAD} ${VIEW_TOP} ${SIZE - 2 * VIEW_PAD} ${SIZE - VIEW_TOP - VIEW_PAD}`}
        role="img"
        aria-label={ariaLabel ?? "Factor makeup radar chart"}
      >
        <g className={styles.grid}>
          {gridRings.map((ring) => (
            <polygon
              key={`ring-${ring.level}`}
              points={ring.pts}
              className={ring.isMedian ? styles.medianRing : styles.gridRing}
            />
          ))}
          {spokes.map((s) => {
            const axisId = axisIds[s.i];
            const selected = selectedAxisId === axisId;
            return (
              <line
                key={`spoke-${s.i}`}
                x1={CX}
                y1={CY}
                x2={s.tip.x}
                y2={s.tip.y}
                className={selected ? styles.spokeSelected : styles.spoke}
              />
            );
          })}
        </g>

        {series.map((s) => {
          const dimmed = hoveredSlug != null && hoveredSlug !== s.slug;
          const active = hoveredSlug === s.slug;
          return (
            <g
              key={s.slug}
              className={styles.seriesGroup}
              opacity={dimmed ? 0.18 : 1}
              onMouseEnter={() => setHoveredSlug(s.slug)}
              onMouseLeave={() => {
                setHoveredSlug(null);
                setHoveredAxis(null);
              }}
            >
              <polygon
                points={polygonPoints(s.values, n)}
                fill={s.color}
                fillOpacity={active ? 0.22 : 0.1}
                stroke={s.color}
                strokeWidth={active ? 2.4 : 1.6}
                className={styles.seriesPoly}
              />
              {s.values.map((v, i) => {
                if (v == null || !Number.isFinite(v)) return null;
                const { x, y } = polar((i / n) * Math.PI * 2, scoreToRadius(v));
                return (
                  <circle
                    key={`${s.slug}-pt-${i}`}
                    cx={x}
                    cy={y}
                    r={active ? 4 : 3}
                    fill={s.color}
                    className={styles.point}
                    onMouseEnter={() => {
                      setHoveredSlug(s.slug);
                      setHoveredAxis(i);
                    }}
                  />
                );
              })}
            </g>
          );
        })}

        {spokes.map((s) => {
          const axisId = axisIds[s.i];
          const short = FACTOR_MAKEUP_SHORT_LABELS[axisId];
          const full = factorDisplayLabel(axisId, short);
          const tip = factorTooltipSummaryForId(axisId);
          const selected = selectedAxisId === axisId;
          const anchor =
            Math.abs(Math.sin(s.angle)) < 0.2
              ? "middle"
              : Math.sin(s.angle) > 0
                ? "start"
                : "end";
          return (
            <g
              key={`label-${axisId}`}
              className={styles.axisHit}
              onClick={() => onAxisClick?.(axisId)}
              style={{ cursor: onAxisClick ? "pointer" : "help" }}
            >
              <title>{tip ? `${full}: ${tip}` : full}</title>
              <circle
                cx={s.labelPos.x}
                cy={s.labelPos.y}
                r={18}
                fill="transparent"
              />
              <text
                x={s.labelPos.x}
                y={s.labelPos.y}
                textAnchor={anchor}
                dominantBaseline="middle"
                className={selected ? styles.axisLabelSelected : styles.axisLabel}
              >
                {short}
              </text>
            </g>
          );
        })}

        <text x={CX + 4} y={CY - scoreToRadius(MEDIAN) + 3} className={styles.medianLabel}>
          50
        </text>
      </svg>

      <div className={styles.brandMark}>
        <BrandWatermark />
      </div>

      {tooltip ? (
        <div className={styles.tooltip} role="status">
          <div className={styles.tooltipTitle}>
            <span className={styles.tooltipSwatch} style={{ background: tooltip.color }} />
            {tooltip.theme}
          </div>
          <div className={styles.tooltipAxis}>{tooltip.axisLabel}</div>
          <div className={styles.tooltipScore}>
            Score {tooltip.score == null ? "—" : Math.round(tooltip.score)}
            {tooltip.rank != null && tooltip.total != null
              ? ` · Rank #${tooltip.rank} of ${tooltip.total.toLocaleString()}`
              : null}
          </div>
          {tooltip.method ? <p className={styles.tooltipMethod}>{tooltip.method}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
