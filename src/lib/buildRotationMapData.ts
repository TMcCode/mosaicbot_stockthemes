import {
  pickRotationLongAxis,
  type RotationLongAxis,
} from "@/lib/rotationAxis";
import { isHeatmapSectorEligible } from "@/lib/marketHeatmapSectors";
import { applyShortThemeCompareReturnsDisplay } from "@/lib/shortThemeChart";
import {
  isPlausibleCompareReturnMetric,
  medianFinite,
} from "@/lib/compareReturnPlausible";
import type { CompareThemesRowV0 } from "@/types/compare_themes.v0";
import type { ManifestGroupSummaryV0, ManifestThemeSummaryV0 } from "@/types/manifest.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

export type RotationPointKind = "group" | "theme";

export type RotationMapPoint = {
  kind: RotationPointKind;
  slug: string;
  name: string;
  sector: string;
  groupSlug: string | null;
  groupName: string | null;
  /** 10D return minus SPY 10D (%). */
  x: number;
  /** YTD or 1Yr minus SPY (%). */
  y: number;
  /** Sizing weight (avg constituent USD mcap or group aggregate). */
  weight: number;
  themeCount?: number;
};

export type RotationMapBuildInput = {
  asOf: string;
  groups: ManifestGroupSummaryV0[];
  themes: ManifestThemeSummaryV0[];
  compareRows: CompareThemesRowV0[];
  spyCompareReturns?: ThemeCompareReturnsV0 | null;
};

export type RotationMapData = {
  longAxis: RotationLongAxis;
  groups: RotationMapPoint[];
  themesByGroupSlug: Map<string, RotationMapPoint[]>;
};

function spyMetric(
  spy: ThemeCompareReturnsV0 | null | undefined,
  key: string,
): number | null {
  const v = spy?.metrics?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function themeRelativePoint(
  row: CompareThemesRowV0,
  theme: ManifestThemeSummaryV0,
  sector: string,
  longAxis: RotationLongAxis,
  spy: ThemeCompareReturnsV0 | null | undefined,
): RotationMapPoint | null {
  const name = String(theme.name || row.name || "").trim();
  if (!name) return null;

  const display = applyShortThemeCompareReturnsDisplay(row.compare_returns ?? undefined, name);
  const m = display?.metrics;
  if (!m) return null;

  const t10 = m["10D"];
  const tLong = m[longAxis];
  const spy10 = spyMetric(spy, "10D");
  const spyLong = spyMetric(spy, longAxis);
  if (
    !isPlausibleCompareReturnMetric("10D", t10) ||
    !isPlausibleCompareReturnMetric(longAxis, tLong) ||
    !isPlausibleCompareReturnMetric("10D", spy10) ||
    !isPlausibleCompareReturnMetric(longAxis, spyLong)
  ) {
    return null;
  }

  if (spy10 == null || spyLong == null) {
    return null;
  }

  const mcap = row.avg_market_cap_usd;
  const weight =
    typeof mcap === "number" && Number.isFinite(mcap) && mcap > 0
      ? mcap
      : (theme.ticker_count ?? 1);

  const slug = String(theme.slug || row.slug || "").trim();
  if (!slug) return null;

  return {
    kind: "theme",
    slug,
    name,
    sector,
    groupSlug: String(theme.group_slug || row.group_slug || "").trim() || null,
    groupName: String(row.group_name || "").trim() || null,
    x: Math.round((t10 - spy10) * 100) / 100,
    y: Math.round((tLong - spyLong) * 100) / 100,
    weight,
  };
}

function groupSizingWeight(themePoints: RotationMapPoint[]): number {
  let weighted = 0;
  let total = 0;
  for (const p of themePoints) {
    if (p.weight > 0) {
      weighted += p.weight;
      total += 1;
    }
  }
  if (total > 0) return weighted / total;
  return themePoints.length || 1;
}

function groupAggregatePoint(
  group: ManifestGroupSummaryV0,
  sector: string,
  themePoints: RotationMapPoint[],
): RotationMapPoint | null {
  if (themePoints.length === 0) return null;
  const xs = themePoints.map((p) => p.x);
  const ys = themePoints.map((p) => p.y);
  const xMed = medianFinite(xs);
  const yMed = medianFinite(ys);
  if (xMed == null || yMed == null) return null;
  const slug = String(group.slug || "").trim();
  const name = String(group.name || "").trim();
  if (!slug || !name) return null;

  return {
    kind: "group",
    slug,
    name,
    sector,
    groupSlug: slug,
    groupName: name,
    x: Math.round(xMed * 100) / 100,
    y: Math.round(yMed * 100) / 100,
    weight: groupSizingWeight(themePoints),
    themeCount: themePoints.length,
  };
}

function resolveGroupSector(group: ManifestGroupSummaryV0): string {
  const s = String(group.spy_sector ?? "").trim();
  if (isHeatmapSectorEligible(s)) return s;
  if (s) return s;
  return "Other";
}

export function buildRotationMapData(input: RotationMapBuildInput): RotationMapData {
  const longAxis = pickRotationLongAxis(input.asOf);
  const spy = input.spyCompareReturns;

  const groupBySlug = new Map<string, ManifestGroupSummaryV0>();
  for (const g of input.groups) {
    const slug = String(g.slug || "").trim();
    if (slug) groupBySlug.set(slug, g);
  }

  const compareBySlug = new Map<string, CompareThemesRowV0>();
  for (const row of input.compareRows) {
    const slug = String(row.slug || "").trim();
    if (slug) compareBySlug.set(slug, row);
  }

  const themesByGroupSlug = new Map<string, RotationMapPoint[]>();

  for (const theme of input.themes) {
    const gslug = String(theme.group_slug || "").trim();
    if (!gslug) continue;
    const group = groupBySlug.get(gslug);
    if (!group) continue;

    const slug = String(theme.slug || "").trim();
    const row = compareBySlug.get(slug);
    if (!row?.compare_returns) continue;

    const sector = resolveGroupSector(group);
    const point = themeRelativePoint(row, theme, sector, longAxis, spy);
    if (!point) continue;

    const bucket = themesByGroupSlug.get(gslug) ?? [];
    bucket.push(point);
    themesByGroupSlug.set(gslug, bucket);
  }

  const groups: RotationMapPoint[] = [];
  for (const group of input.groups) {
    const slug = String(group.slug || "").trim();
    if (!slug) continue;
    const themePoints = themesByGroupSlug.get(slug) ?? [];
    const sector = resolveGroupSector(group);
    const gp = groupAggregatePoint(group, sector, themePoints);
    if (gp) groups.push(gp);
  }

  groups.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  for (const [, pts] of themesByGroupSlug) {
    pts.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }

  return { longAxis, groups, themesByGroupSlug };
}

/** Log-scaled dot radius in SVG user units (6–22). */
export function rotationDotRadius(
  weight: number,
  minWeight: number,
  maxWeight: number,
): number {
  const w = Math.max(weight, 1);
  const lo = Math.max(minWeight, 1);
  const hi = Math.max(maxWeight, lo);
  if (hi <= lo) return 12;
  const t = (Math.log(w) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
  return 6 + Math.min(1, Math.max(0, t)) * 16;
}

export type RotationPlotBounds = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function finalizePlotBounds(
  xs: number[],
  ys: number[],
  loP: number,
  hiP: number,
  robust: boolean,
): RotationPlotBounds {
  let xLo = robust ? percentile(xs, loP) : xs[0];
  let xHi = robust ? percentile(xs, hiP) : xs[xs.length - 1];
  let yLo = robust ? percentile(ys, loP) : ys[0];
  let yHi = robust ? percentile(ys, hiP) : ys[ys.length - 1];

  if (xLo > 0) {
    xLo = 0;
  } else if (xHi < 0) {
    xHi = 0;
  } else {
    xLo = Math.min(xLo, 0);
    xHi = Math.max(xHi, 0);
  }

  if (yLo > 0) {
    yLo = 0;
  } else if (yHi < 0) {
    yHi = 0;
  } else {
    yLo = Math.min(yLo, 0);
    yHi = Math.max(yHi, 0);
  }

  const minSpan = 6;
  if (xHi - xLo < minSpan) {
    const mid = (xHi + xLo) / 2;
    xLo = mid - minSpan / 2;
    xHi = mid + minSpan / 2;
  }
  if (yHi - yLo < minSpan) {
    const mid = (yHi + yLo) / 2;
    yLo = mid - minSpan / 2;
    yHi = mid + minSpan / 2;
  }

  const padX = Math.max(1, (xHi - xLo) * 0.08);
  const padY = Math.max(1, (yHi - yLo) * 0.08);

  return {
    xMin: Math.round((xLo - padX) * 10) / 10,
    xMax: Math.round((xHi + padX) * 10) / 10,
    yMin: Math.round((yLo - padY) * 10) / 10,
    yMax: Math.round((yHi + padY) * 10) / 10,
  };
}

/**
 * Axis limits from the central bulk of points (not min/max outliers).
 * SPY at (0,0) is included when the cloud spans both sides of zero.
 * Percentiles widen automatically until only a small tail sits off-scale.
 */
export function rotationPlotBounds(points: RotationMapPoint[]): RotationPlotBounds {
  if (points.length === 0) {
    return { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
  }

  const xs = points.map((p) => p.x).sort((a, b) => a - b);
  const ys = points.map((p) => p.y).sort((a, b) => a - b);

  const robust = points.length >= 10;
  let loP = robust ? 0.08 : 0;
  let hiP = robust ? 0.92 : 1;
  let bounds = finalizePlotBounds(xs, ys, loP, hiP, robust);

  if (robust && points.length >= 15) {
    const maxOffFrac = 0.035;
    while (loP > 0.02 || hiP < 0.98) {
      const off = points.filter((p) => rotationPointOffPlot(p, bounds)).length / points.length;
      if (off <= maxOffFrac) break;
      loP = Math.max(0.02, loP - 0.025);
      hiP = Math.min(0.98, hiP + 0.025);
      bounds = finalizePlotBounds(xs, ys, loP, hiP, true);
    }
  }

  return bounds;
}

/** Axis limits zoomed to a selected group and its themes (true positions). */
export function rotationFocusBounds(focusPoints: RotationMapPoint[]): RotationPlotBounds {
  if (focusPoints.length === 0) {
    return { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
  }

  let xLo = Math.min(...focusPoints.map((p) => p.x));
  let xHi = Math.max(...focusPoints.map((p) => p.x));
  let yLo = Math.min(...focusPoints.map((p) => p.y));
  let yHi = Math.max(...focusPoints.map((p) => p.y));

  const minSpan = 8;
  if (xHi - xLo < minSpan) {
    const mid = (xHi + xLo) / 2;
    xLo = mid - minSpan / 2;
    xHi = mid + minSpan / 2;
  }
  if (yHi - yLo < minSpan) {
    const mid = (yHi + yLo) / 2;
    yLo = mid - minSpan / 2;
    yHi = mid + minSpan / 2;
  }

  const marginX = (xHi - xLo) * 0.45;
  const marginY = (yHi - yLo) * 0.45;
  if (0 >= xLo - marginX && 0 <= xHi + marginX) {
    xLo = Math.min(xLo, 0);
    xHi = Math.max(xHi, 0);
  }
  if (0 >= yLo - marginY && 0 <= yHi + marginY) {
    yLo = Math.min(yLo, 0);
    yHi = Math.max(yHi, 0);
  }

  const padX = Math.max(1.5, (xHi - xLo) * 0.14);
  const padY = Math.max(1.5, (yHi - yLo) * 0.14);

  return {
    xMin: Math.round((xLo - padX) * 10) / 10,
    xMax: Math.round((xHi + padX) * 10) / 10,
    yMin: Math.round((yLo - padY) * 10) / 10,
    yMax: Math.round((yHi + padY) * 10) / 10,
  };
}

export function rotationTrueDisplayPositions(
  points: RotationMapPoint[],
): Map<string, RotationDisplayPoint> {
  const result = new Map<string, RotationDisplayPoint>();
  for (const point of points) {
    result.set(point.slug, { x: point.x, y: point.y, offScale: false });
  }
  return result;
}

/** X: low values left, high values right. */
export function rotationDataToSvgX(
  value: number,
  min: number,
  max: number,
  pixelLeft: number,
  pixelRight: number,
): number {
  if (max <= min) return (pixelLeft + pixelRight) / 2;
  const t = (value - min) / (max - min);
  return pixelLeft + t * (pixelRight - pixelLeft);
}

/** Y: low values bottom, high values top. */
export function rotationDataToSvgY(
  value: number,
  min: number,
  max: number,
  pixelBottom: number,
  pixelTop: number,
): number {
  if (max <= min) return (pixelTop + pixelBottom) / 2;
  const t = (value - min) / (max - min);
  return pixelBottom - t * (pixelBottom - pixelTop);
}

/** @deprecated Use rotationDataToSvgX / rotationDataToSvgY */
export function rotationDataToSvg(
  value: number,
  min: number,
  max: number,
  pixelMin: number,
  pixelMax: number,
): number {
  return rotationDataToSvgY(value, min, max, pixelMax, pixelMin);
}

export function rotationPointOffPlot(
  point: RotationMapPoint,
  bounds: RotationPlotBounds,
): boolean {
  return (
    point.x < bounds.xMin ||
    point.x > bounds.xMax ||
    point.y < bounds.yMin ||
    point.y > bounds.yMax
  );
}

export type RotationDisplayPoint = {
  x: number;
  y: number;
  offScale: boolean;
};

/** @deprecated Overview no longer pins outliers on the chart rim. */
export function rotationDisplayPositions(
  points: RotationMapPoint[],
  bounds: RotationPlotBounds,
): Map<string, RotationDisplayPoint> {
  const result = new Map<string, RotationDisplayPoint>();
  for (const point of points) {
    const offScale = rotationPointOffPlot(point, bounds);
    result.set(point.slug, {
      x: point.x,
      y: point.y,
      offScale,
    });
  }
  return result;
}

/** @deprecated Use rotationTrueDisplayPositions */
export function rotationClampToBounds(
  point: RotationMapPoint,
  bounds: RotationPlotBounds,
): { x: number; y: number; clamped: boolean } {
  const display = rotationDisplayPositions([point], bounds).get(point.slug);
  if (!display) {
    return { x: point.x, y: point.y, clamped: false };
  }
  return { x: display.x, y: display.y, clamped: display.offScale };
}

export function rotationAdaptiveDotRadius(
  weight: number,
  minWeight: number,
  maxWeight: number,
  pointCount: number,
): number {
  const maxR = pointCount > 80 ? 9 : pointCount > 45 ? 11 : 14;
  const minR = pointCount > 80 ? 4 : 5;
  const w = Math.max(weight, 1);
  const lo = Math.max(minWeight, 1);
  const hi = Math.max(maxWeight, lo);
  if (hi <= lo) return (minR + maxR) / 2;
  const t = (Math.log(w) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
  return minR + Math.min(1, Math.max(0, t)) * (maxR - minR);
}
