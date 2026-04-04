"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Chart1yPanel } from "@/components/Chart1yPanel";
import type { ThemeChart1yV0 } from "@/types/chart.v0";

import styles from "@/app/page.module.css";

type HighlightedThemeItem = {
  slug: string;
  name: string;
  chart1y?: ThemeChart1yV0;
};

type Props = {
  items: HighlightedThemeItem[];
};

export function HomeHighlightedThemes({ items }: Props) {
  const safeItems = useMemo(() => items.filter((x) => x.slug && x.name), [items]);
  const [activeIdx, setActiveIdx] = useState(0);
  if (!safeItems.length) return null;
  const active = safeItems[Math.max(0, Math.min(activeIdx, safeItems.length - 1))];

  return (
    <section className={styles.section}>
      <h2>Highlighted themes</h2>
      <div className={styles.highlightTabs}>
        {safeItems.map((item, idx) => (
          <button
            key={item.slug}
            type="button"
            className={`${styles.highlightTab} ${idx === activeIdx ? styles.highlightTabActive : ""}`}
            onClick={() => setActiveIdx(idx)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className={styles.highlightChartWrap}>
        <Chart1yPanel chart1y={active.chart1y} performanceTitle={active.name} />
      </div>
      <p className={styles.highlightLink}>
        <Link href={`/themes/${active.slug}`}>Open {active.name}</Link>
      </p>
    </section>
  );
}

