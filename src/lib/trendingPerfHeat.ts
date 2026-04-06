/**
 * Heatmap for trending return % — same endpoints as ThemeAnalysis_ComparePerformance.get_gradient_color
 * but neutral band uses white instead of yellow (red → white → green).
 */
const EFFECTIVE_MIN = -50;
const EFFECTIVE_MAX = 50;
const NEUTRAL_EPS = 0.5;

export function trendingReturnHeatStyle(value: number): { backgroundColor: string; color: string } {
  const v = value;
  if (Math.abs(v) < NEUTRAL_EPS) {
    return { backgroundColor: "rgb(255, 255, 255)", color: "#1a1a1a" };
  }
  if (v >= EFFECTIVE_MAX) {
    return { backgroundColor: "rgb(0, 128, 0)", color: "#ffffff" };
  }
  if (v <= EFFECTIVE_MIN) {
    return { backgroundColor: "rgb(255, 0, 0)", color: "#ffffff" };
  }
  if (v > 0) {
    const ratio = Math.min(1, v / EFFECTIVE_MAX);
    const r = Math.round(255 * (1 - ratio));
    const g = Math.round(255 + (128 - 255) * ratio);
    const b = Math.round(255 * (1 - ratio));
    return { backgroundColor: `rgb(${r}, ${g}, ${b})`, color: "#1a1a1a" };
  }
  const ratio = Math.min(1, (v - EFFECTIVE_MIN) / (0 - EFFECTIVE_MIN));
  const r = 255;
  const g = Math.round(255 * (1 - ratio));
  const b = Math.round(255 * (1 - ratio));
  return { backgroundColor: `rgb(${r}, ${g}, ${b})`, color: "#1a1a1a" };
}
