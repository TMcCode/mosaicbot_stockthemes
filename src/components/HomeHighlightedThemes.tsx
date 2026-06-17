"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";

import { HomeHighlightedThemeChart } from "@/components/HomeHighlightedThemeChart";
import type { ChartPerformanceV0, ThemeChart1yV0 } from "@/types/chart.v0";

import pageStyles from "@/app/page.module.css";
import styles from "@/components/HomeHighlightedThemes.module.css";

type HighlightedThemeItem = {
  slug: string;
  name: string;
  chart1y?: ThemeChart1yV0;
};

type Props = {
  items: HighlightedThemeItem[];
  benchmarkPerformance?: ChartPerformanceV0;
};

export function HomeHighlightedThemes({ items, benchmarkPerformance }: Props) {
  const safeItems = useMemo(() => items.filter((x) => x.slug && x.name), [items]);
  const [activeIdx, setActiveIdx] = useState(0);

  const goPrev = useCallback(() => {
    setActiveIdx((i) => {
      const n = safeItems.length;
      if (n === 0) return 0;
      const cur = Math.min(Math.max(0, i), n - 1);
      return cur <= 0 ? n - 1 : cur - 1;
    });
  }, [safeItems.length]);

  const goNext = useCallback(() => {
    setActiveIdx((i) => {
      const n = safeItems.length;
      if (n === 0) return 0;
      const cur = Math.min(Math.max(0, i), n - 1);
      return cur >= n - 1 ? 0 : cur + 1;
    });
  }, [safeItems.length]);

  if (!safeItems.length) return null;

  const idx = Math.min(Math.max(0, activeIdx), safeItems.length - 1);
  const active = safeItems[idx];
  const single = safeItems.length <= 1;

  return (
    <section className={pageStyles.section}>
      <h2>Highlighted themes</h2>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.navBtn}
          onClick={goPrev}
          disabled={single}
          aria-label="Previous trending theme chart"
        >
          ‹
        </button>
        <div className={styles.selectWrap}>
          <select
            className={styles.themeSelect}
            value={active.slug}
            onChange={(e) => {
              const next = safeItems.findIndex((x) => x.slug === e.target.value);
              if (next >= 0) setActiveIdx(next);
            }}
            aria-label="Choose a trending theme chart"
          >
            {safeItems.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className={styles.navBtn}
          onClick={goNext}
          disabled={single}
          aria-label="Next trending theme chart"
        >
          ›
        </button>
      </div>
      <div className={styles.chartWrap}>
        <HomeHighlightedThemeChart
          slug={active.slug}
          name={active.name}
          chart1y={active.chart1y}
          benchmarkPerformance={benchmarkPerformance}
        />
      </div>
      <p className={styles.footerLink}>
        <Link href={`/themes/${active.slug}`}>Open {active.name}</Link>
      </p>
    </section>
  );
}
