/**
 * Shared overlay / composition chart colors (matches Chart1yLightweight).
 * Same bright-on-dark hex style as before — hues spaced so adjacent series
 * don’t collapse into near-duplicate pinks / lavenders / cyans.
 */
export const OVERLAY_CHART_PALETTE = [
  "#26fcd6", // mint (ticker / brand)
  "#6b8cff", // blue
  "#ffb84d", // orange
  "#ff5a9a", // pink
  "#9d6bff", // violet
  "#34d399", // green
  "#fbbf24", // gold
  "#ff6b45", // coral
  "#3db4ff", // sky (cooler than mint; not cyan-green)
  "#e056fd", // fuchsia (away from violet + pink)
  "#b8e63a", // chartreuse (away from green)
  "#ff4d4d", // red
] as const;

export const OVERLAY_BENCHMARK_COLOR = "rgba(173, 182, 199, 0.85)";
