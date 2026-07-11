/**
 * Format theme constituent ThemeWgt for display.
 *
 * ETL publishes weights as percent points that sum to ~100 (e.g. 12.5 = 12.5%).
 * Do not treat values in (0, 1] as fractions — that turns a 1% weight into "100%".
 */
export function formatWeight(w: number): string {
  if (!Number.isFinite(w)) {
    return "—";
  }
  return `${w.toFixed(1)}%`;
}
