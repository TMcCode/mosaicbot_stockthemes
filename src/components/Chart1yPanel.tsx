"use client";

import dynamic from "next/dynamic";

import { chart1yHasRenderableSeries } from "@/lib/chart1yRenderable";
import type { Chart1yPanelProps } from "@/components/Chart1yPanelContent";

import styles from "./Chart1yPanel.module.css";

function Chart1yPanelSkeleton() {
  return (
    <section className={styles.section} aria-busy="true" aria-label="Loading chart">
      <div className={styles.toolbar}>
        <span className={styles.toolbarLabel}>
          <span style={{ color: "#26fcd6" }}>Theme</span> vs S&P 500 Over the Past Year
        </span>
      </div>
      <div className={styles.chartBox} />
    </section>
  );
}

const Chart1yPanelLoaded = dynamic(
  async () => {
    try {
      const mod = await import("@/components/Chart1yPanelContent");
      return mod.Chart1yPanel;
    } catch {
      // Dev/HMR can occasionally race chunk invalidation; retry once.
      await new Promise((resolve) => setTimeout(resolve, 120));
      const mod = await import("@/components/Chart1yPanelContent");
      return mod.Chart1yPanel;
    }
  },
  { ssr: false, loading: () => <Chart1yPanelSkeleton /> },
);

export type { Chart1yPanelProps };

/**
 * Lazy-loads Lightweight Charts in a separate chunk (`ssr: false` for static export).
 * Skips loading that chunk when `chart_1y` has nothing drawable.
 */
export function Chart1yPanel(props: Chart1yPanelProps) {
  if (!chart1yHasRenderableSeries(props.chart1y)) {
    return null;
  }
  return <Chart1yPanelLoaded {...props} />;
}
