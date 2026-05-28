/** Matches FetchEODData `SHORT_THEME_PATTERN` / `_is_short_theme_name`. */
const SHORT_THEME_PATTERN = /\bShort\s*'\d{2}\b/i;

export function isShortThemeName(themeName: string): boolean {
  return SHORT_THEME_PATTERN.test(String(themeName ?? ""));
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
