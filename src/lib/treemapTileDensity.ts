/**
 * Fit treemap labels from layout cell % size — pure math, no measureText.
 * Shared by theme/stock hero maps and /heatmap.
 */
export type TreemapTileDensity = {
  titlePx: number;
  metaPx: number;
  lines: number;
  showReturn: boolean;
  showWeight: boolean;
  padPx: number;
};

/** Fit theme/constituent labels to the layout cell so dense maps don’t overflow. */
export function densityForTile(
  wPct: number,
  hPct: number,
  themeTile: boolean,
): TreemapTileDensity {
  const area = wPct * hPct;
  const minSide = Math.min(wPct, hPct);
  // Narrow strips: one ellipsis line beats mid-word wraps.
  if (themeTile && wPct < 9) {
    return {
      titlePx: 7,
      metaPx: 7,
      lines: 1,
      showReturn: false,
      showWeight: false,
      padPx: 2,
    };
  }
  if (area >= 700 || minSide >= 20) {
    return {
      titlePx: themeTile ? 10 : 11,
      metaPx: 9,
      lines: themeTile ? 3 : 1,
      showReturn: true,
      showWeight: true,
      padPx: themeTile ? 6 : 4,
    };
  }
  if (area >= 320 || minSide >= 12) {
    return {
      titlePx: themeTile ? 9 : 10,
      metaPx: 8,
      lines: themeTile ? 2 : 1,
      showReturn: true,
      showWeight: minSide >= 14,
      padPx: 4,
    };
  }
  if (area >= 140 || minSide >= 8) {
    return {
      titlePx: themeTile ? 8 : 9,
      metaPx: 7,
      lines: 1,
      showReturn: hPct >= 10,
      showWeight: false,
      padPx: 3,
    };
  }
  // Tiny cells: name only (full stats stay on `title` tooltip).
  return {
    titlePx: themeTile ? 7 : 8,
    metaPx: 7,
    lines: 1,
    showReturn: false,
    showWeight: false,
    padPx: 2,
  };
}

/**
 * /heatmap has many small nested cells — hero thresholds hide almost every return %.
 * Keep name density, but show return whenever a second line still fits.
 */
export function densityForMarketHeatmapTile(wPct: number, hPct: number): TreemapTileDensity {
  const base = densityForTile(wPct, hPct, true);
  const showReturn = wPct >= 5 && hPct >= 7;
  return {
    ...base,
    showReturn,
    metaPx: showReturn ? Math.max(base.metaPx, 7) : base.metaPx,
    // Prefer one name line when the return is on, so % doesn't crowd.
    lines: showReturn ? Math.min(base.lines, 2) : base.lines,
  };
}
