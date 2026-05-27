export function formatWeight(w: number): string {
  if (!Number.isFinite(w)) {
    return "—";
  }
  const pct = w >= 0 && w <= 1 ? w * 100 : w;
  return `${pct.toFixed(1)}%`;
}
