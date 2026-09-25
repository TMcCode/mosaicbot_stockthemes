"use client";

import dynamic from "next/dynamic";

import type { ComponentProps } from "react";

type ThemesInMotionMacroChartProps = ComponentProps<
  typeof import("@/components/ThemesInMotionMacroChart").ThemesInMotionMacroChart
>;

const ThemesInMotionMacroChartDynamic = dynamic(
  () =>
    import("@/components/ThemesInMotionMacroChart").then(
      (m) => m.ThemesInMotionMacroChart,
    ),
  {
    loading: () => (
      <section
        aria-busy="true"
        aria-label="Loading market backdrop chart"
        style={{ minHeight: 480 }}
      />
    ),
  },
);

/** Code-split LW Charts off the home critical path (DeferRender mounts this near viewport). */
export function LazyThemesInMotionMacroChart(props: ThemesInMotionMacroChartProps) {
  return <ThemesInMotionMacroChartDynamic {...props} />;
}
