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
  // Negative ramp should mirror positive ramp: small losses stay near white.
  const ratio = Math.min(1, Math.abs(v) / Math.abs(EFFECTIVE_MIN));
  const r = 255;
  const g = Math.round(255 * (1 - ratio));
  const b = Math.round(255 * (1 - ratio));
  return { backgroundColor: `rgb(${r}, ${g}, ${b})`, color: "#1a1a1a" };
}

function parseRgb(color: string): { r: number; g: number; b: number } | null {
  const m = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(color.trim());
  if (!m) return null;
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
}

/**
 * Soft full-card wash from the same heat ramp (no extra network / layout work).
 * Used by Narrative Radar home cards from already-baked ``return_1m``.
 */
export function trendingReturnCardGradientStyle(
  value: number,
): { backgroundImage: string } | undefined {
  if (!Number.isFinite(value)) return undefined;
  const { backgroundColor } = trendingReturnHeatStyle(value);
  const rgb = parseRgb(backgroundColor);
  if (!rgb) return undefined;
  const { r, g, b } = rgb;
  // Keep text readable on dark/light cards: tint only, don't flood.
  const strong = Math.min(0.34, 0.12 + Math.min(1, Math.abs(value) / 25) * 0.22);
  const mid = strong * 0.45;
  return {
    backgroundImage: `linear-gradient(155deg, rgba(${r},${g},${b},${strong.toFixed(3)}) 0%, rgba(${r},${g},${b},${mid.toFixed(3)}) 42%, transparent 78%)`,
    // Border stays in CSS so `.card:hover` can highlight clickability.
  };
}
