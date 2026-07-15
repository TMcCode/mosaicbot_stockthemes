/** Matches `utils.theme_utils.is_short_theme` / manifest `_is_short_theme_name`. */
export function isShortThemeName(themeName: string): boolean {
  const stem = String(themeName ?? "").split(":", 1)[0];
  return /\bShort\b/i.test(stem);
}

/**
 * Invert an indexed-100 performance line (flip daily returns).
 * Mirrors `stockthemes_manifest._invert_indexed_chart_values`.
 */
export function invertIndexedChartValues(values: number[]): number[] | null {
  if (values.length < 2) return null;
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    const nxt = values[i];
    if (!Number.isFinite(prev) || !Number.isFinite(nxt) || prev === 0) return null;
    const ret = nxt / prev - 1;
    if (!Number.isFinite(ret)) return null;
    out.push(out[i - 1] * (1 - ret));
  }
  if (!out.every(Number.isFinite)) return null;
  return out.map((v) => Math.round(v * 10_000) / 10_000);
}

export type ShortThemePerformanceMeta = {
  short_display_inverted?: boolean;
};

export type ShortThemeCompareReturns = {
  metrics?: Record<string, number | null>;
  short_display_inverted?: boolean;
  /**
 * Set by ETL when Premarket/1D/Postmarket/10D were written in short-display PnL after
 * constituent overrides. Absent on legacy CDN where those keys stayed long.
 */
  short_constituent_horizons_inverted?: boolean;
};

/** Horizons overwritten from long constituent price_returns after short inversion. */
const SHORT_CONSTITUENT_HORIZON_KEYS = ["Premarket", "1D", "Postmarket", "10D"] as const;

function negateFiniteMetrics(
  metrics: Record<string, number | null>,
  keys?: readonly string[],
): Record<string, number | null> {
  const out: Record<string, number | null> = { ...metrics };
  const iter = keys ?? Object.keys(metrics);
  for (const key of iter) {
    if (!Object.prototype.hasOwnProperty.call(metrics, key)) continue;
    const val = metrics[key];
    if (typeof val === "number" && Number.isFinite(val)) {
      out[key] = Math.round(-val * 10_000) / 10_000;
    }
  }
  return out;
}

/** Negate compare-table metrics for explicit short themes (matches manifest ETL). */
export function applyShortThemeCompareReturnsDisplay<T extends ShortThemeCompareReturns>(
  block: T | null | undefined,
  themeName: string,
): T | undefined {
  if (!block?.metrics || !isShortThemeName(themeName)) {
    return block ?? undefined;
  }
  if (block.short_display_inverted === true) {
    // Legacy CDN: long-horizon metrics inverted, but Premarket/1D/Postmarket/10D still long.
    if (block.short_constituent_horizons_inverted === true) {
      return block;
    }
    const metrics = negateFiniteMetrics(block.metrics, SHORT_CONSTITUENT_HORIZON_KEYS);
    return {
      ...block,
      metrics,
      short_constituent_horizons_inverted: true,
    };
  }
  const metrics = negateFiniteMetrics(block.metrics);
  return {
    ...block,
    metrics,
    short_display_inverted: true,
    short_constituent_horizons_inverted: true,
  };
}

/**
 * Return display values for a theme performance series on charts.
 * Skips when ETL already set `short_display_inverted: true`.
 * For legacy JSON, inverts when the 1Y line is still long-oriented (materially positive).
 */
export function applyShortThemePerformanceDisplay(
  themeName: string,
  values: number[],
  meta?: ShortThemePerformanceMeta | null,
): number[] {
  if (!isShortThemeName(themeName) || values.length < 2) return values;
  if (meta?.short_display_inverted === true) return values;

  let shouldInvert = false;
  if (meta?.short_display_inverted === false) {
    shouldInvert = true;
  } else {
    const first = values[0];
    const last = values[values.length - 1];
    if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) {
      shouldInvert = true;
    } else {
      const totalRet = last / first - 1;
      // Already inverted (e.g. dev disk cache): skip. Long-oriented CDN JSON: flip.
      if (totalRet < -0.12) {
        shouldInvert = false;
      } else {
        shouldInvert = totalRet > 0.12;
      }
    }
  }

  if (!shouldInvert) return values;

  const inverted = invertIndexedChartValues(values);
  return inverted && inverted.length === values.length ? inverted : values;
}
