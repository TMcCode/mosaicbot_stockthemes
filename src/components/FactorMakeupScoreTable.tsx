"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef } from "react";

import { factorDisplayLabel } from "@/lib/factorDisplayLabel";
import { factorTooltipSummaryForId } from "@/lib/factorTooltipSummaries";
import {
  FACTOR_MAKEUP_AXIS_IDS,
  FACTOR_MAKEUP_SHORT_LABELS,
  type FactorMakeupAxisId,
} from "@/lib/factorMakeupAxes";
import type { FactorMakeupRadarSeries } from "@/components/FactorMakeupRadar";
import { splitThemeDisplayName } from "@/lib/rotationThemeLabel";
import { BrandWatermark } from "@/components/BrandWatermark";

import styles from "./FactorMakeupScoreTable.module.css";

type Props = {
  series: FactorMakeupRadarSeries[];
  selectedAxisId: FactorMakeupAxisId | null;
  onSelectAxis: (axisId: FactorMakeupAxisId | null) => void;
};

/** Aligns with radar median ring (50). Neutral band avoids noisy coloring. */
const SCORE_MEDIAN = 50;
const SCORE_ABOVE = 60;
const SCORE_BELOW = 40;

function scoreTone(score: number | null): "above" | "below" | "neutral" {
  if (score == null || !Number.isFinite(score)) return "neutral";
  if (score >= SCORE_ABOVE) return "above";
  if (score <= SCORE_BELOW) return "below";
  return "neutral";
}

export function FactorMakeupScoreTable({ series, selectedAxisId, onSelectAxis }: Props) {
  const selectedRowRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    if (!selectedAxisId || !selectedRowRef.current) return;
    selectedRowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedAxisId]);

  if (!series.length) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h3 className={styles.title}>Factor scores</h3>
        {selectedAxisId ? (
          <Link
            href={`/factors?factor=${encodeURIComponent(selectedAxisId)}`}
            className={styles.rankingsLink}
          >
            Rankings for {FACTOR_MAKEUP_SHORT_LABELS[selectedAxisId]}
          </Link>
        ) : (
          <span className={styles.headHint}>Click a factor to highlight</span>
        )}
      </div>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col" rowSpan={2} className={styles.factorCol}>
                Factor
              </th>
              {series.map((s) => {
                const { title, groupPrefix } = splitThemeDisplayName(s.name);
                return (
                  <th
                    key={s.slug}
                    scope="colgroup"
                    colSpan={2}
                    className={styles.themeCol}
                    title={s.name}
                  >
                    <span className={styles.themeHead}>
                      <span className={styles.swatch} style={{ background: s.color }} />
                      <span className={styles.themeNameStack}>
                        {groupPrefix ? (
                          <>
                            <span className={styles.themeGroupLine}>{groupPrefix}</span>
                            <span className={styles.themeTitleLine}>{title}</span>
                          </>
                        ) : (
                          <span className={styles.themeTitleLine}>{title}</span>
                        )}
                      </span>
                    </span>
                  </th>
                );
              })}
            </tr>
            <tr>
              {series.map((s) => (
                <Fragment key={`${s.slug}-sub`}>
                  <th scope="col" className={styles.subCol}>
                    Score
                  </th>
                  <th scope="col" className={styles.subCol}>
                    Rank
                  </th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {FACTOR_MAKEUP_AXIS_IDS.map((axisId, axisIdx) => {
              const selected = selectedAxisId === axisId;
              const tip = factorTooltipSummaryForId(axisId);
              const full = factorDisplayLabel(axisId, FACTOR_MAKEUP_SHORT_LABELS[axisId]);
              return (
                <tr
                  key={axisId}
                  ref={selected ? selectedRowRef : undefined}
                  className={selected ? styles.rowSelected : undefined}
                  onClick={() => onSelectAxis(selected ? null : axisId)}
                >
                  <th scope="row" className={styles.factorCell} title={tip ?? full}>
                    <button
                      type="button"
                      className={styles.factorBtn}
                      aria-pressed={selected}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAxis(selected ? null : axisId);
                      }}
                    >
                      {FACTOR_MAKEUP_SHORT_LABELS[axisId]}
                    </button>
                  </th>
                  {series.map((s) => {
                    const score = s.values[axisIdx];
                    const rank = s.ranks?.[axisIdx];
                    const total = s.totals?.[axisIdx];
                    const tone = scoreTone(score);
                    const scoreClass = [
                      styles.scoreCell,
                      tone === "above" ? styles.scoreAbove : "",
                      tone === "below" ? styles.scoreBelow : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    const titleParts = [
                      s.name,
                      full,
                      score == null ? "—" : `Score ${Math.round(score)}`,
                    ];
                    if (rank != null && total != null) {
                      titleParts.push(`Rank #${rank} of ${total}`);
                    }
                    const title = titleParts.join(" · ");
                    return (
                      <Fragment key={`${s.slug}-${axisId}`}>
                        <td className={scoreClass} title={title}>
                          {score == null || !Number.isFinite(score) ? "—" : Math.round(score)}
                        </td>
                        <td className={styles.rankCell} title={title}>
                          {rank != null && Number.isFinite(rank) ? `#${rank}` : "—"}
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className={styles.footer}>
        <p className={styles.legend}>
          <span className={styles.legendHigh}>≥{SCORE_ABOVE}</span>
          <span className={styles.legendLow}>≤{SCORE_BELOW}</span>
          vs median {SCORE_MEDIAN} (same scale as the radar)
        </p>
        <div className={styles.tableWatermark}>
          <BrandWatermark />
        </div>
      </div>
    </div>
  );
}
