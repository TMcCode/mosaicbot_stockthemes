"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import pageStyles from "@/app/page.module.css";
import localStyles from "@/app/rotation/page.module.css";
import { RotationQuadrantPanel } from "@/components/RotationQuadrantPanel";
import {
  projectRotationMap,
  rotationAdaptiveDotRadius,
  rotationDataToSvgX,
  rotationDataToSvgY,
  rotationFocusBounds,
  rotationPlotBounds,
  rotationPointOffPlot,
  rotationTrueDisplayPositions,
  type RotationDisplayPoint,
  type RotationMapPoint,
  type RotationMapSource,
} from "@/lib/buildRotationMapData";
import { rotationThemeLabelSuffix } from "@/lib/rotationThemeLabel";
import {
  coerceRotationLongAxis,
  coerceRotationShortAxis,
  formatRotationAxisTick,
  resolveRotationAxisOptions,
  rotationAxisMetricLabel,
  rotationAxisTicks,
  rotationMotionPriorShort,
  type RotationHorizonKey,
} from "@/lib/rotationAxis";
import { formatRotationRank10d } from "@/lib/rotationRankLabel";
import {
  buildRotationSectorColorMap,
  rotationSectorColor,
} from "@/lib/rotationSectorColors";
import { compareColumnHeader } from "@/lib/trendingCompareMetrics";
import { formatSiteDataPublished } from "@/lib/formatSiteDataPublished";
import { useRotationMapData } from "@/hooks/useRotationMapData";
import {
  classifyRotationQuadrant,
  filterGroupsByQuadrant,
  ROTATION_QUADRANT_LABELS,
  type RotationQuadrantId,
} from "@/lib/rotationQuadrants";
import { formatReturnPct } from "@/lib/treemapLayout";

import styles from "./RotationMapClient.module.css";

const PLOT = { left: 54, top: 28, right: 20, bottom: 48 };
const SVG_W = 920;
const SVG_H = 600;

type Props = {
  eyebrow: string;
};

type HoverState = {
  point: RotationMapPoint;
  sx: number;
  sy: number;
  offScale: boolean;
} | null;

function weightRangeFromPoints(points: RotationMapPoint[]): { min: number; max: number } {
  if (points.length === 0) return { min: 1, max: 1 };
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    min = Math.min(min, p.weight);
    max = Math.max(max, p.weight);
  }
  return { min: Number.isFinite(min) ? min : 1, max: Number.isFinite(max) ? max : 1 };
}

type RenderPointOpts = {
  point: RotationMapPoint;
  display: RotationDisplayPoint;
  toSvgX: (x: number) => number;
  toSvgY: (y: number) => number;
  weightRange: { min: number; max: number };
  pointCount: number;
  sectorColorMap: Map<string, string>;
  dimmed?: boolean;
  selected?: boolean;
  isTheme?: boolean;
  alwaysShowLabel?: boolean;
  labelText?: string;
  hoverSlug: string | null;
  onHover: (state: HoverState) => void;
  onLeave: (slug: string) => void;
  onClick: (point: RotationMapPoint) => void;
};

function renderPlotPoint({
  point,
  display,
  toSvgX,
  toSvgY,
  weightRange,
  pointCount,
  sectorColorMap,
  dimmed = false,
  selected = false,
  isTheme = false,
  alwaysShowLabel = false,
  labelText,
  hoverSlug,
  onHover,
  onLeave,
  onClick,
}: RenderPointOpts) {
  const cx = toSvgX(display.x);
  const cy = toSvgY(display.y);
  const baseR = rotationAdaptiveDotRadius(
    point.weight,
    weightRange.min,
    weightRange.max,
    isTheme ? Math.max(pointCount, 12) : pointCount,
  );
  const r = isTheme ? Math.max(6, Math.min(11, baseR * 0.72)) : baseR;
  const fill = rotationSectorColor(point.sector, sectorColorMap);
  const opacity = dimmed ? 0.28 : display.offScale ? 0.78 : isTheme ? 1 : 0.88;
  const showLabel = isTheme && alwaysShowLabel && hoverSlug !== point.slug;
  const displayLabel =
    labelText ??
    (point.name.length > 26 ? `${point.name.slice(0, 24)}…` : point.name);

  return (
    <g
      key={`${point.kind}-${point.slug}`}
      className={isTheme ? styles.pointTheme : styles.pointGroup}
      onMouseEnter={() => onHover({ point, sx: cx, sy: cy, offScale: display.offScale })}
      onMouseLeave={() => onLeave(point.slug)}
      onClick={(e) => {
        e.stopPropagation();
        onClick(point);
      }}
      style={{ cursor: "pointer" }}
    >
      {isTheme ? (
        <circle
          cx={cx}
          cy={cy}
          r={r + 3.5}
          fill="none"
          className={styles.themeOutlineOuter}
        />
      ) : null}
      {selected ? (
        <circle
          cx={cx}
          cy={cy}
          r={r + 5}
          fill="none"
          stroke="var(--color-accent, #26fcd6)"
          strokeWidth={2}
          opacity={0.9}
        />
      ) : null}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        fillOpacity={opacity}
        stroke={
          isTheme
            ? "#f8fafc"
            : "rgba(255,255,255,0.35)"
        }
        strokeWidth={isTheme ? 2 : 1}
      />
      {showLabel ? (
        <text
          x={cx}
          y={cy - r - (isTheme ? 8 : 5)}
          textAnchor="middle"
          className={isTheme && alwaysShowLabel ? styles.themeLabelAlways : styles.pointLabel}
        >
          {displayLabel}
        </text>
      ) : null}
    </g>
  );
}

export function RotationMapClient({ eyebrow }: Props) {
  const loadState = useRotationMapData(true);

  if (loadState.status === "loading" || loadState.status === "idle") {
    return (
      <p className={localStyles.dataLoading} role="status">
        Loading rotation map…
      </p>
    );
  }

  if (loadState.status === "error") {
    return (
      <p className={localStyles.dataLoading}>
        Could not load rotation data. Try refreshing the page.
      </p>
    );
  }

  return (
    <RotationMapChart
      eyebrow={eyebrow}
      asOf={loadState.asOf}
      source={loadState.source}
    />
  );
}

type ChartProps = {
  eyebrow: string;
  asOf: string;
  source: RotationMapSource;
};

function renderMotionArrow({
  point,
  toSvgX,
  toSvgY,
  sectorColorMap,
  dimmed = false,
  markerId,
}: {
  point: RotationMapPoint;
  toSvgX: (x: number) => number;
  toSvgY: (y: number) => number;
  sectorColorMap: Map<string, string>;
  dimmed?: boolean;
  markerId: string;
}) {
  const from = point.motionFrom;
  if (!from) return null;

  let x1 = toSvgX(from.x);
  let y1 = toSvgY(from.y);
  let x2 = toSvgX(point.x);
  let y2 = toSvgY(point.y);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 2) return null;

  const trimStart = 3;
  const trimEnd = 7;
  if (len > trimStart + trimEnd) {
    const t0 = trimStart / len;
    const t1 = (len - trimEnd) / len;
    const x1o = x1;
    const y1o = y1;
    x1 = x1o + dx * t0;
    y1 = y1o + dy * t0;
    x2 = x1o + dx * t1;
    y2 = y1o + dy * t1;
  }

  const color = rotationSectorColor(point.sector, sectorColorMap);
  return (
    <line
      key={`motion-${point.kind}-${point.slug}`}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      className={styles.motionArrow}
      stroke={color}
      strokeOpacity={dimmed ? 0.25 : 0.92}
      markerEnd={`url(#${markerId})`}
      pointerEvents="none"
    />
  );
}

function RotationMapChart({ eyebrow, asOf, source }: ChartProps) {
  const router = useRouter();
  const chartShellRef = useRef<HTMLDivElement>(null);
  const scrollToChart = useCallback(() => {
    requestAnimationFrame(() => {
      chartShellRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  const motionMarkerId = useId().replace(/:/g, "");
  const asOfLabel = formatSiteDataPublished(asOf);
  const axisOptions = useMemo(
    () => resolveRotationAxisOptions(source.availableMetrics),
    [source.availableMetrics],
  );
  const [shortAxis, setShortAxis] = useState<RotationHorizonKey>(source.defaultShortAxis);
  const [longAxis, setLongAxis] = useState<RotationHorizonKey>(source.defaultLongAxis);
  const [showMotionArrows, setShowMotionArrows] = useState(false);
  const [hiddenSectors, setHiddenSectors] = useState<Set<string>>(() => new Set());
  const [expandedGroupSlug, setExpandedGroupSlug] = useState<string | null>(null);
  const [selectedQuadrant, setSelectedQuadrant] = useState<RotationQuadrantId | null>(null);
  const [hover, setHover] = useState<HoverState>(null);
  const [search, setSearch] = useState("");
  const [offScaleOpen, setOffScaleOpen] = useState(false);

  useEffect(() => {
    setShortAxis(source.defaultShortAxis);
    setLongAxis(source.defaultLongAxis);
  }, [source.defaultShortAxis, source.defaultLongAxis, source.asOf]);

  const motionPriorShortKey = rotationMotionPriorShort(shortAxis);
  const motionPriorLabel = motionPriorShortKey
    ? compareColumnHeader(motionPriorShortKey)
    : null;

  const mapData = useMemo(
    () => projectRotationMap(source, shortAxis, longAxis, motionPriorShortKey),
    [source, shortAxis, longAxis, motionPriorShortKey],
  );

  const groupPoints = mapData.groups;

  const visibleGroupPoints = useMemo(
    () => groupPoints.filter((g) => !hiddenSectors.has(g.sector)),
    [groupPoints, hiddenSectors],
  );

  const quadrantGroups = useMemo(() => {
    if (!selectedQuadrant) return [];
    return filterGroupsByQuadrant(visibleGroupPoints, selectedQuadrant);
  }, [visibleGroupPoints, selectedQuadrant]);

  const expandedGroup = useMemo(() => {
    if (!expandedGroupSlug) return null;
    return groupPoints.find((g) => g.slug === expandedGroupSlug) ?? null;
  }, [groupPoints, expandedGroupSlug]);

  const expandedGroupThemesAll = useMemo(() => {
    if (!expandedGroupSlug) return [];
    return mapData.themesByGroupSlug.get(expandedGroupSlug) ?? [];
  }, [mapData.themesByGroupSlug, expandedGroupSlug]);

  const expandedThemes = useMemo(() => {
    if (!expandedGroupSlug) return [];
    const q = search.trim().toLowerCase();
    if (!q) return expandedGroupThemesAll;
    return expandedGroupThemesAll.filter(
      (p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    );
  }, [expandedGroupSlug, expandedGroupThemesAll, search]);

  const overviewBounds = useMemo(() => rotationPlotBounds(groupPoints), [groupPoints]);

  const offScaleGroups = useMemo(
    () => groupPoints.filter((p) => rotationPointOffPlot(p, overviewBounds)),
    [groupPoints, overviewBounds],
  );

  const isFocused = Boolean(expandedGroupSlug && expandedGroup);
  const isQuadrantFocused = Boolean(selectedQuadrant);

  const bounds = useMemo(() => {
    if (isFocused && expandedGroup) {
      return rotationFocusBounds([expandedGroup, ...expandedGroupThemesAll]);
    }
    if (isQuadrantFocused && quadrantGroups.length > 0) {
      return rotationFocusBounds(quadrantGroups);
    }
    return overviewBounds;
  }, [isFocused, expandedGroup, expandedGroupThemesAll, isQuadrantFocused, quadrantGroups, overviewBounds]);

  const groupDisplay = useMemo(() => {
    if (isFocused) return rotationTrueDisplayPositions(groupPoints);
    if (isQuadrantFocused) return rotationTrueDisplayPositions(quadrantGroups);
    return rotationTrueDisplayPositions(
      groupPoints.filter((p) => !rotationPointOffPlot(p, overviewBounds)),
    );
  }, [groupPoints, isFocused, isQuadrantFocused, quadrantGroups, overviewBounds]);

  const themeDisplay = useMemo(
    () => rotationTrueDisplayPositions(expandedThemes),
    [expandedThemes],
  );

  const groupWeightRange = useMemo(() => weightRangeFromPoints(groupPoints), [groupPoints]);

  const themeWeightRange = useMemo(
    () => weightRangeFromPoints(expandedThemes),
    [expandedThemes],
  );

  const sectorColorMap = useMemo(() => {
    const sectors = [...groupPoints, ...expandedThemes].map((p) => p.sector);
    return buildRotationSectorColorMap(sectors);
  }, [groupPoints, expandedThemes]);

  const legendSectors = useMemo(
    () => [...sectorColorMap.keys()].sort((a, b) => a.localeCompare(b)),
    [sectorColorMap],
  );

  const plotW = SVG_W - PLOT.left - PLOT.right;
  const plotH = SVG_H - PLOT.top - PLOT.bottom;
  const plotBottom = PLOT.top + plotH;
  const plotRight = PLOT.left + plotW;

  const toSvgX = (x: number) =>
    rotationDataToSvgX(x, bounds.xMin, bounds.xMax, PLOT.left, plotRight);
  const toSvgY = (y: number) =>
    rotationDataToSvgY(y, bounds.yMin, bounds.yMax, plotBottom, PLOT.top);

  const zeroX = toSvgX(0);
  const zeroY = toSvgY(0);

  const shortLabel = rotationAxisMetricLabel(shortAxis);
  const longLabel = rotationAxisMetricLabel(longAxis);

  const xSpan = bounds.xMax - bounds.xMin;
  const ySpan = bounds.yMax - bounds.yMin;

  const xTicks = useMemo(
    () => rotationAxisTicks(bounds.xMin, bounds.xMax),
    [bounds.xMin, bounds.xMax],
  );

  const yTicks = useMemo(
    () => rotationAxisTicks(bounds.yMin, bounds.yMax),
    [bounds.yMin, bounds.yMax],
  );

  function handleShortAxisChange(next: RotationHorizonKey) {
    setShortAxis(next);
    setLongAxis((prev) => coerceRotationLongAxis(next, prev, axisOptions.long));
    setHover(null);
  }

  function handleLongAxisChange(next: RotationHorizonKey) {
    setLongAxis(next);
    setShortAxis((prev) => coerceRotationShortAxis(prev, next, axisOptions.short));
    setHover(null);
  }

  function expandGroup(slug: string) {
    setSelectedQuadrant(null);
    setExpandedGroupSlug(slug);
    setSearch("");
    setHover(null);
    setOffScaleOpen(false);
  }

  function handleQuadrantGroupSelect(slug: string) {
    expandGroup(slug);
    scrollToChart();
  }

  function handleQuadrantSelect(quadrant: RotationQuadrantId) {
    setSelectedQuadrant((prev) => (prev === quadrant ? null : quadrant));
    setExpandedGroupSlug(null);
    setSearch("");
    setHover(null);
    setOffScaleOpen(false);
  }

  function collapseGroup() {
    setExpandedGroupSlug(null);
    setSearch("");
    setHover(null);
    setOffScaleOpen(false);
  }

  function handlePointLeave(slug: string) {
    setHover((h) => (h?.point.slug === slug ? null : h));
  }

  function toggleSector(sector: string) {
    setHiddenSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) next.delete(sector);
      else next.add(sector);
      return next;
    });
    setHover(null);
  }

  function isSectorVisible(sector: string): boolean {
    return !hiddenSectors.has(sector);
  }

  function handlePointClick(point: RotationMapPoint) {
    if (point.kind === "group") {
      if (expandedGroupSlug === point.slug) {
        collapseGroup();
      } else {
        expandGroup(point.slug);
      }
      return;
    }
    router.push(`/themes/${encodeURIComponent(point.slug)}`);
  }

  const motionSummaryLabel =
    motionPriorLabel && motionPriorShortKey
      ? `${motionPriorLabel} → ${compareColumnHeader(shortAxis)}`
      : null;

  function quadrantHintClass(id: RotationQuadrantId): string {
    if (!selectedQuadrant) return styles.quadrantHint;
    return selectedQuadrant === id
      ? `${styles.quadrantHint} ${styles.quadrantHintActive}`
      : `${styles.quadrantHint} ${styles.quadrantHintDim}`;
  }

  function groupInView(point: RotationMapPoint): boolean {
    if (isQuadrantFocused && selectedQuadrant) {
      return classifyRotationQuadrant(point.x, point.y) === selectedQuadrant;
    }
    if (isFocused) return true;
    return !rotationPointOffPlot(point, overviewBounds);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.rotationLayout}>
        <header className={styles.rotationHero}>
          <p className={pageStyles.eyebrow}>{eyebrow}</p>
          <h1>Theme rotation map</h1>
          <p className={`${pageStyles.introLead} ${styles.introDesktop}`}>
            Groups positioned by short-term vs longer-term performance relative to the S&amp;P 500.
            Click a group to zoom the chart and show its themes.
          </p>
          <p className={`${pageStyles.introLead} ${styles.introMobile}`}>
            Groups vs the S&amp;P 500 on short- and long-term horizons. Tap a quadrant to focus the
            map, then pick a group from the list.
          </p>
          {asOfLabel ? (
            <p className={styles.statsLine}>
              {groupPoints.length} groups · Data as of {asOfLabel}
            </p>
          ) : (
            <p className={styles.statsLine}>{groupPoints.length} groups</p>
          )}
          {groupPoints.length >= 10 && !isFocused && !isQuadrantFocused ? (
            <p className={`${styles.scaleNote} ${styles.scaleNoteDesktop}`}>
              Overview shows the central bulk of groups. Groups outside this range are listed below —
              click one to zoom to its true position.
            </p>
          ) : null}
          {groupPoints.length >= 10 && !isFocused && !isQuadrantFocused ? (
            <p className={`${styles.scaleNote} ${styles.scaleNoteMobile}`}>
              The full map is crowded on small screens — start with a quadrant, then tap a group.
            </p>
          ) : null}
          {isFocused && expandedGroup ? (
            <p className={styles.scaleNote}>
              Zoomed to <strong>{expandedGroup.name}</strong> — tap Collapse or the chart background
              to return.
            </p>
          ) : null}
          {isQuadrantFocused && selectedQuadrant ? (
            <p className={`${styles.scaleNote} ${styles.scaleNoteDesktop}`}>
              Focused on <strong>{ROTATION_QUADRANT_LABELS[selectedQuadrant]}</strong> (
              {quadrantGroups.length} groups) — click the quadrant again in the panel or anywhere
              on the chart to return to the full map.
            </p>
          ) : null}
        </header>

        <div className={styles.rotationQuadrantSlot}>
          <RotationQuadrantPanel
            groups={visibleGroupPoints}
            selectedQuadrant={selectedQuadrant}
            filteredGroups={quadrantGroups}
            onQuadrantSelect={handleQuadrantSelect}
            onGroupSelect={handleQuadrantGroupSelect}
            motionLabel={motionSummaryLabel}
            shortLabel={shortLabel}
            longLabel={longLabel}
          />
        </div>

        <div className={styles.rotationBody}>
      <div className={styles.toolbar}>
        <div className={styles.breadcrumb}>
          <span className={styles.breadcrumbCurrent}>All groups ({groupPoints.length})</span>
          {isQuadrantFocused && selectedQuadrant ? (
            <>
              <span className={styles.breadcrumbSep} aria-hidden="true">
                ·
              </span>
              <span className={styles.breadcrumbCurrent}>
                {ROTATION_QUADRANT_LABELS[selectedQuadrant]} ({quadrantGroups.length})
              </span>
            </>
          ) : null}
          {expandedGroup ? (
            <>
              <span className={styles.breadcrumbSep} aria-hidden="true">
                ·
              </span>
              <span className={styles.breadcrumbCurrent}>
                {expandedGroup.name} ({expandedThemes.length} themes)
              </span>
              <button
                type="button"
                className={styles.backBtn}
                onClick={collapseGroup}
              >
                Collapse
              </button>
            </>
          ) : null}
        </div>
        {expandedGroupSlug ? (
          <label className={styles.searchWrap}>
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Filter themes…"
              aria-label="Filter themes"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        ) : null}
      </div>

      {!isFocused && !isQuadrantFocused && offScaleGroups.length > 0 ? (
        <div className={`${styles.offScalePanel} ${styles.offScalePanelDesktop}`}>
          <button
            type="button"
            className={styles.offScaleToggle}
            aria-expanded={offScaleOpen}
            onClick={() => setOffScaleOpen((open) => !open)}
          >
            {offScaleGroups.length} group{offScaleGroups.length === 1 ? "" : "s"} outside current
            range — click to zoom in
          </button>
          {offScaleOpen ? (
            <ul className={styles.offScaleList}>
              {offScaleGroups.map((group) => (
                <li key={group.slug}>
                  <button
                    type="button"
                    className={styles.offScaleItem}
                    onClick={() => expandGroup(group.slug)}
                  >
                    <span className={styles.offScaleName}>{group.name}</span>
                    <span className={styles.offScaleMeta}>
                      {shortLabel} {formatReturnPct(group.x)} · {longLabel}{" "}
                      {formatReturnPct(group.y)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className={styles.chartShell} ref={chartShellRef}>
        <svg
          className={isFocused ? `${styles.chart} ${styles.chartExpanded}` : styles.chart}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          role="img"
          aria-label={
            isFocused
              ? "Group rotation map — click empty chart area to collapse"
              : isQuadrantFocused
                ? "Group rotation map — click empty chart area to clear quadrant focus"
                : "Group rotation map relative to SPY"
          }
          onClick={() => {
            if (isFocused) collapseGroup();
            else if (isQuadrantFocused) setSelectedQuadrant(null);
          }}
        >
          <defs>
            <marker
              id={motionMarkerId}
              viewBox="0 0 10 10"
              markerWidth="8"
              markerHeight="8"
              refX="8"
              refY="5"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M0,0 L10,5 L0,10 Z" className={styles.motionArrowHead} />
            </marker>
          </defs>
          <rect
            x={PLOT.left}
            y={PLOT.top}
            width={plotW}
            height={plotH}
            className={styles.plotBg}
            rx={8}
          />

          {/* Quadrant hints */}
          <text
            x={PLOT.left + 8}
            y={PLOT.top + 14}
            className={quadrantHintClass("long_term_leaders")}
          >
            Long-term leaders
          </text>
          <text
            x={PLOT.left + plotW - 8}
            y={PLOT.top + 14}
            className={quadrantHintClass("leaders")}
            textAnchor="end"
          >
            Leaders
          </text>
          <text x={PLOT.left + 8} y={PLOT.top + plotH - 6} className={quadrantHintClass("laggards")}>
            Laggards
          </text>
          <text
            x={PLOT.left + plotW - 8}
            y={PLOT.top + plotH - 6}
            className={quadrantHintClass("new_momentum")}
            textAnchor="end"
          >
            New momentum
          </text>

          {/* Grid */}
          {xTicks.map((v) => (
            <line
              key={`gx-${v}`}
              x1={toSvgX(v)}
              y1={PLOT.top}
              x2={toSvgX(v)}
              y2={PLOT.top + plotH}
              className={v === 0 ? styles.axisZeroLine : styles.gridLine}
            />
          ))}
          {yTicks.map((v) => (
            <line
              key={`gy-${v}`}
              x1={PLOT.left}
              y1={toSvgY(v)}
              x2={PLOT.left + plotW}
              y2={toSvgY(v)}
              className={v === 0 ? styles.axisZeroLine : styles.gridLine}
            />
          ))}

          {/* SPY origin */}
          <g transform={`translate(${zeroX}, ${zeroY})`}>
            <circle r={5} className={styles.spyMarker} />
            <text y={-10} textAnchor="middle" className={styles.spyLabel}>
              SPY
            </text>
          </g>

          {/* Motion arrows (under points) */}
          {showMotionArrows
            ? groupPoints.map((point) => {
                if (!isSectorVisible(point.sector)) return null;
                if (!groupInView(point)) return null;
                const display = groupDisplay.get(point.slug);
                if (!display) return null;
                const offFocus =
                  isFocused &&
                  point.slug !== expandedGroupSlug &&
                  rotationPointOffPlot(point, bounds);
                if (offFocus) return null;
                return renderMotionArrow({
                  point,
                  toSvgX,
                  toSvgY,
                  sectorColorMap,
                  dimmed: Boolean(
                    isFocused && expandedGroupSlug && expandedGroupSlug !== point.slug,
                  ),
                  markerId: motionMarkerId,
                });
              })
            : null}
          {showMotionArrows
            ? expandedThemes.map((point) =>
                isSectorVisible(point.sector)
                  ? renderMotionArrow({
                      point,
                      toSvgX,
                      toSvgY,
                      sectorColorMap,
                      markerId: motionMarkerId,
                    })
                  : null,
              )
            : null}

          {/* Group bubbles */}
          {groupPoints.map((point) => {
            if (!isSectorVisible(point.sector)) return null;
            if (!groupInView(point)) return null;
            const display = groupDisplay.get(point.slug);
            if (!display) return null;

            const offFocus =
              isFocused &&
              point.slug !== expandedGroupSlug &&
              rotationPointOffPlot(point, bounds);
            if (offFocus) return null;

            return renderPlotPoint({
              point,
              display,
              toSvgX,
              toSvgY,
              weightRange: groupWeightRange,
              pointCount: groupPoints.length,
              sectorColorMap,
              dimmed: Boolean(
                isFocused && expandedGroupSlug && expandedGroupSlug !== point.slug,
              ),
              selected: expandedGroupSlug === point.slug,
              hoverSlug: hover?.point.slug ?? null,
              onHover: setHover,
              onLeave: handlePointLeave,
              onClick: handlePointClick,
            });
          })}

          {/* Theme bubbles for expanded group */}
          {expandedThemes.map((point) => {
            if (!isSectorVisible(point.sector)) return null;
            return renderPlotPoint({
              point,
              display: themeDisplay.get(point.slug) ?? {
                x: point.x,
                y: point.y,
                offScale: false,
              },
              toSvgX,
              toSvgY,
              weightRange: themeWeightRange,
              pointCount: expandedThemes.length,
              sectorColorMap,
              isTheme: true,
              alwaysShowLabel: expandedThemes.length <= 20,
              labelText: rotationThemeLabelSuffix(point.name, expandedGroup?.name),
              hoverSlug: hover?.point.slug ?? null,
              onHover: setHover,
              onLeave: handlePointLeave,
              onClick: handlePointClick,
            });
          })}

          {/* X axis ticks */}
          {xTicks.map((v) => (
            <text
              key={`tx-${v}`}
              x={toSvgX(v)}
              y={SVG_H - 18}
              textAnchor="middle"
              className={styles.tickLabel}
            >
              {formatRotationAxisTick(v, xSpan)}
            </text>
          ))}
          <text
            x={PLOT.left + plotW / 2}
            y={SVG_H - 4}
            textAnchor="middle"
            className={styles.axisTitle}
          >
            {shortLabel}
          </text>

          {/* Y axis ticks */}
          {yTicks.map((v) => (
            <text
              key={`ty-${v}`}
              x={PLOT.left - 8}
              y={toSvgY(v) + 3}
              textAnchor="end"
              className={styles.tickLabel}
            >
              {formatRotationAxisTick(v, ySpan)}
            </text>
          ))}
          <text
            transform={`translate(6, ${PLOT.top + plotH / 2}) rotate(-90)`}
            textAnchor="middle"
            className={styles.axisTitleY}
          >
            {longLabel}
          </text>
        </svg>

        {hover ? (
          <div
            className={styles.tooltip}
            style={{
              left: `${(hover.sx / SVG_W) * 100}%`,
              top: `${(hover.sy / SVG_H) * 100}%`,
            }}
          >
            <div className={styles.tooltipTitle}>{hover.point.name}</div>
            <div className={styles.tooltipMeta}>{hover.point.sector}</div>
            {formatRotationRank10d(hover.point.rank10d, hover.point.kind) ? (
              <div className={styles.tooltipRank}>
                {formatRotationRank10d(hover.point.rank10d, hover.point.kind)}
              </div>
            ) : null}
            <div className={styles.tooltipRow}>
              <span>{shortLabel}</span>
              <strong>{formatReturnPct(hover.point.x)}</strong>
            </div>
            <div className={styles.tooltipRow}>
              <span>{longLabel}</span>
              <strong>{formatReturnPct(hover.point.y)}</strong>
            </div>
            {hover.point.kind === "group" && hover.point.themeCount != null ? (
              <div className={styles.tooltipHint}>
                Click to {expandedGroupSlug === hover.point.slug ? "collapse" : "zoom in & expand"}{" "}
                {hover.point.themeCount} themes
              </div>
            ) : (
              <div className={styles.tooltipHint}>Click to open theme</div>
            )}
          </div>
        ) : null}
      </div>

      <div className={styles.axisControls}>
        <div className={styles.controlRow}>
          <span className={styles.controlLabel}>Short horizon (X)</span>
          <div className={styles.toggle} role="group" aria-label="Short horizon axis">
            {axisOptions.short.map((key) => (
              <button
                key={key}
                type="button"
                className={shortAxis === key ? styles.toggleActive : undefined}
                aria-pressed={shortAxis === key}
                onClick={() => handleShortAxisChange(key)}
              >
                {compareColumnHeader(key)}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.controlRow}>
          <span className={styles.controlLabel}>Long horizon (Y)</span>
          <div className={styles.toggle} role="group" aria-label="Long horizon axis">
            {axisOptions.long.map((key) => (
              <button
                key={key}
                type="button"
                className={longAxis === key ? styles.toggleActive : undefined}
                aria-pressed={longAxis === key}
                onClick={() => handleLongAxisChange(key)}
              >
                {compareColumnHeader(key)}
              </button>
            ))}
          </div>
        </div>
        {motionPriorLabel ? (
          <label className={styles.directionCheck}>
            <input
              type="checkbox"
              checked={showMotionArrows}
              onChange={(e) => setShowMotionArrows(e.target.checked)}
            />
            Show direction ({motionPriorLabel} → {compareColumnHeader(shortAxis)})
          </label>
        ) : null}
      </div>

      {legendSectors.length > 0 ? (
        <ul className={styles.legend} aria-label="Sector colors — click to hide or show">
          {legendSectors.map((sector) => {
            const hidden = hiddenSectors.has(sector);
            return (
              <li key={sector}>
                <button
                  type="button"
                  className={`${styles.legendItem} ${hidden ? styles.legendItemHidden : ""}`}
                  aria-pressed={!hidden}
                  onClick={() => toggleSector(sector)}
                >
                  <span
                    className={styles.legendSwatch}
                    style={{ background: rotationSectorColor(sector, sectorColorMap) }}
                    aria-hidden="true"
                  />
                  {sector}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {expandedGroupSlug && expandedThemes.length === 0 ? (
        <p className={styles.empty}>No themes with complete return data in this group.</p>
      ) : null}
        </div>
      </div>
    </div>
  );
}
