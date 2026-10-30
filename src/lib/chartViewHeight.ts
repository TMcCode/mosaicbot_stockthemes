/** Shared plot height for theme Chart1y + stock performance charts. */
export const CHART_VIEW_HEIGHT_DESKTOP = 420;
/** Phone: slightly shorter so the chart doesn’t dominate the fold. */
export const CHART_VIEW_HEIGHT_MOBILE = 320;
export const CHART_VIEW_HEIGHT_MQ = "(max-width: 640px)";

export function chartViewHeight(): number {
  if (typeof window === "undefined") return CHART_VIEW_HEIGHT_DESKTOP;
  return window.matchMedia(CHART_VIEW_HEIGHT_MQ).matches
    ? CHART_VIEW_HEIGHT_MOBILE
    : CHART_VIEW_HEIGHT_DESKTOP;
}
