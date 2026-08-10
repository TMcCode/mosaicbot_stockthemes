import {
  ColorType,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
} from "lightweight-charts";

import type { StockthemesTheme } from "@/lib/themeStorage";

/** Pane / chrome colors for Lightweight Charts — apply via applyOptions on theme flip (no rebuild). */
export type ChartThemeColors = {
  background: string;
  text: string;
  grid: string;
  border: string;
  crosshairLabelBg: string;
  /** Stronger than `grid` — indexed charts’ 100 baseline. */
  indexedBaseline: string;
};

const DARK: ChartThemeColors = {
  background: "#0f1115",
  text: "#a6abb9",
  grid: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.08)",
  crosshairLabelBg: "#0f1115",
  // Above grid (~0.06) but below series ink — “start = 100,” not a loud rule.
  indexedBaseline: "rgba(166, 171, 185, 0.55)",
};

const LIGHT: ChartThemeColors = {
  background: "#f7f6fc",
  text: "#5c5978",
  grid: "rgba(30, 28, 54, 0.08)",
  border: "rgba(59, 77, 161, 0.14)",
  crosshairLabelBg: "#f7f6fc",
  indexedBaseline: "rgba(92, 89, 120, 0.45)",
};

export function chartThemeColors(theme: StockthemesTheme): ChartThemeColors {
  return theme === "light" ? LIGHT : DARK;
}

/** Partial chart options for createChart / applyOptions. */
export function chartThemeOptions(theme: StockthemesTheme): Parameters<IChartApi["applyOptions"]>[0] {
  const c = chartThemeColors(theme);
  return {
    layout: {
      background: { type: ColorType.Solid, color: c.background },
      textColor: c.text,
    },
    grid: {
      vertLines: { color: c.grid },
      horzLines: { color: c.grid },
    },
    rightPriceScale: {
      borderColor: c.border,
    },
    timeScale: {
      borderColor: c.border,
    },
    crosshair: {
      vertLine: { labelBackgroundColor: c.crosshairLabelBg },
      horzLine: { labelBackgroundColor: c.crosshairLabelBg },
    },
  };
}

/** Cheap theme flip: recolors an existing chart instance (no series rebuild). */
export function applyChartTheme(chart: IChartApi, theme: StockthemesTheme): void {
  chart.applyOptions(chartThemeOptions(theme));
}

/** Options for the rebased-to-100 reference line on indexed performance charts. */
export function indexedBaselinePriceLineOptions(theme: StockthemesTheme) {
  const c = chartThemeColors(theme);
  return {
    price: 100,
    color: c.indexedBaseline,
    lineWidth: 1 as const,
    lineStyle: LineStyle.Solid,
    axisLabelVisible: false,
    title: "",
  };
}

/**
 * Bold 100-index baseline. Must attach to a series that already has data on the
 * shared price scale — an empty host series maps 100 to the wrong Y position.
 */
export function attachIndexedBaseline(
  series: ISeriesApi<"Line">,
  theme: StockthemesTheme,
): IPriceLine {
  return series.createPriceLine(indexedBaselinePriceLineOptions(theme));
}

export function applyIndexedBaselineTheme(line: IPriceLine, theme: StockthemesTheme): void {
  line.applyOptions(indexedBaselinePriceLineOptions(theme));
}
