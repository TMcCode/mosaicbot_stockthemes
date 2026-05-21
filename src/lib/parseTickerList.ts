/** Split comma/newline-separated tickers; uppercase, dedupe. */
export function parseTickerList(raw: string): string[] {
  const parts = raw
    .split(/[\n,;]+/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  return [...new Set(parts)];
}

/** One theme name per line (or comma-separated). */
export function parseThemeNameList(raw: string): string[] {
  const parts = raw
    .split(/[\n,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  return [...new Set(parts)];
}
