"use client";

import { useMemo } from "react";

import type { RotationMapPoint } from "@/lib/buildRotationMapData";
import {
  computeRotationHeatingCooling,
  countRotationQuadrants,
  ROTATION_QUADRANT_LABELS,
  type RotationQuadrantId,
} from "@/lib/rotationQuadrants";
import { formatReturnPct } from "@/lib/treemapLayout";

import styles from "./RotationQuadrantPanel.module.css";

type Props = {
  groups: RotationMapPoint[];
  selectedQuadrant: RotationQuadrantId | null;
  onQuadrantSelect: (quadrant: RotationQuadrantId) => void;
  onGroupSelect?: (slug: string) => void;
  motionLabel: string | null;
};

const QUADRANT_GRID_ORDER: RotationQuadrantId[] = [
  "long_term_leaders",
  "leaders",
  "laggards",
  "new_momentum",
];

function MoverLine({
  slug,
  name,
  deltaX,
  onSelect,
}: {
  slug: string;
  name: string;
  deltaX: number;
  onSelect?: (slug: string) => void;
}) {
  const valueClass =
    deltaX > 0 ? styles.motionValueUp : deltaX < 0 ? styles.motionValueDown : styles.motionValue;
  return (
    <li>
      <button type="button" className={styles.motionItem} onClick={() => onSelect?.(slug)}>
        <span className={styles.motionName}>{name}</span>
        <span className={`${styles.motionValue} ${valueClass}`}>{formatReturnPct(deltaX)}</span>
      </button>
    </li>
  );
}

export function RotationQuadrantPanel({
  groups,
  selectedQuadrant,
  onQuadrantSelect,
  onGroupSelect,
  motionLabel,
}: Props) {
  const counts = useMemo(() => countRotationQuadrants(groups), [groups]);
  const { heating, cooling } = useMemo(
    () => computeRotationHeatingCooling(groups, 3),
    [groups],
  );
  const hasMotion = heating.length > 0 || cooling.length > 0;

  return (
    <aside className={styles.panel} aria-label="Rotation quadrant summary">
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.toolbarLabel}>Quadrants</span>
          <p className={styles.hint}>
            <span className={styles.hintDesktop}>
              Click a quadrant to focus the map. Click again to reset.
            </span>
            <span className={styles.hintMobile}>
              Tap a quadrant to focus the map. Tap again to reset.
            </span>
          </p>
        </div>
        {selectedQuadrant ? (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => onQuadrantSelect(selectedQuadrant)}
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className={styles.quadrantGrid} role="group" aria-label="Rotation quadrants">
        {QUADRANT_GRID_ORDER.map((id) => {
          const active = selectedQuadrant === id;
          return (
            <button
              key={id}
              type="button"
              className={`${styles.quadrantCell} ${active ? styles.quadrantCellActive : ""}`}
              aria-pressed={active}
              onClick={() => onQuadrantSelect(id)}
            >
              <span className={styles.quadrantLabel}>{ROTATION_QUADRANT_LABELS[id]}</span>
              <span className={styles.quadrantCount}>{counts[id]}</span>
            </button>
          );
        })}
      </div>

      {motionLabel && hasMotion ? (
        <>
          <hr className={styles.divider} />
          <div className={styles.motionSection}>
            <p className={styles.motionHeading}>Rotation ({motionLabel})</p>
            <div className={styles.motionColumns}>
              {heating.length > 0 ? (
                <div className={styles.motionColumn}>
                  <p className={styles.motionSubheading}>Heating up</p>
                  <ul className={styles.motionList}>
                    {heating.map((m) => (
                      <MoverLine
                        key={`heat-${m.slug}`}
                        slug={m.slug}
                        name={m.name}
                        deltaX={m.deltaX}
                        onSelect={onGroupSelect}
                      />
                    ))}
                  </ul>
                </div>
              ) : null}
              {cooling.length > 0 ? (
                <div className={styles.motionColumn}>
                  <p className={styles.motionSubheading}>Cooling off</p>
                  <ul className={styles.motionList}>
                    {cooling.map((m) => (
                      <MoverLine
                        key={`cool-${m.slug}`}
                        slug={m.slug}
                        name={m.name}
                        deltaX={m.deltaX}
                        onSelect={onGroupSelect}
                      />
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : motionLabel ? (
        <>
          <hr className={styles.divider} />
          <p className={styles.motionEmpty}>No short-term rotation data for this horizon pair.</p>
        </>
      ) : null}
    </aside>
  );
}
