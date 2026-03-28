export function formatWeight(w: number): string {
  if (!Number.isFinite(w)) {
    return "—";
  }
  if (w >= 0 && w <= 1) {
    return `${(w * 100).toFixed(1)}%`;
  }
  return w.toFixed(4);
}
