import { ColorType, type IChartApi } from "lightweight-charts";

import type { StockthemesTheme } from "@/lib/themeStorage";

/** Pane / chrome colors for Lightweight Charts — apply via applyOptions on theme flip (no rebuild). */
export type ChartThemeColors = {
  background: string;
  text: string;
  grid: string;
  border: string;
  crosshairLabelBg: string;
};

const DARK: ChartThemeColors = {
  background: "#0f1115",
  text: "#a6abb9",
  grid: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.08)",
  crosshairLabelBg: "#0f1115",
};

const LIGHT: ChartThemeColors = {
  background: "#f7f6fc",
  text: "#5c5978",
  grid: "rgba(30, 28, 54, 0.08)",
  border: "rgba(59, 77, 161, 0.14)",
  crosshairLabelBg: "#f7f6fc",
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

