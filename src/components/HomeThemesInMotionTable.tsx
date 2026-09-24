"use client";

import Link from "next/link";

import { WatchlistStar } from "@/components/WatchlistStar";
import { formatSiteDataPublished } from "@/lib/formatSiteDataPublished";
import type { ThemesInMotionRowV0 } from "@/types/themes_in_motion.v0";

import styles from "./HomeThemesInMotionTable.module.css";

function fmtPct(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return "—";
  const n = Number(v);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

type Props = {
  rows: ThemesInMotionRowV0[];
  /** Homepage shows 10; view-all can pass a larger cap (or Infinity). */
  maxRows?: number;
  /** Motions bake `as_of` (ISO) — shown lightly; cadence is not price-only. */
  asOf?: string | null;
};

export function HomeThemesInMotionTable({ rows, maxRows = 10, asOf }: Props) {
  const shown = maxRows === Number.POSITIVE_INFINITY ? rows : rows.slice(0, maxRows);
  const asOfLabel = asOf?.trim() ? formatSiteDataPublished(asOf.trim()) : null;
  return (
    <section className={styles.section} aria-labelledby="themes-in-motion-heading">
      <div className={styles.head}>
        <h2 id="themes-in-motion-heading" className={styles.title}>
          Themes in Motion
        </h2>
        <div className={styles.links}>
          <Link href="/themes-in-motion" className={styles.link}>
            View all →
          </Link>
        </div>
      </div>
      <p className={styles.scrollHint}>Swipe for more metrics</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.stickyCol}>Theme</th>
              <th className={styles.hideOnNarrow}>1M</th>
              <th>120D</th>
              <th className={styles.hideOnNarrow}>YTD</th>
              <th>Revisions</th>
              <th>Breadth</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  Motions list not published yet.
                </td>
              </tr>
            ) : (
              shown.map((r) => (
                <tr key={r.slug || r.name}>
                  <td className={styles.stickyCol}>
                    <div className={styles.themeCell}>
                      {r.slug ? (
                        <WatchlistStar
                          compact
                          itemType="theme"
                          itemKey={r.slug}
                          label={r.name}
                          signInNext={`/themes/${r.slug}`}
                        />
                      ) : null}
                      <Link
                        href={r.slug ? `/themes/${r.slug}` : "/themes"}
                        className={styles.themeLink}
                      >
                        {r.name}
                      </Link>
                    </div>
                  </td>
                  <td className={`${styles.num} ${styles.hideOnNarrow}`}>{fmtPct(r.return_1m)}</td>
                  <td className={styles.num}>{fmtPct(r.return_120d)}</td>
                  <td className={`${styles.num} ${styles.hideOnNarrow}`}>{fmtPct(r.return_ytd)}</td>
                  <td>{r.revisions_label || "—"}</td>
                  <td>
                    {r.breadth_label ||
                      (r.breadth_pct != null ? `${Math.round(r.breadth_pct)}%` : "—")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {asOfLabel ? (
        <div className={styles.asOf}>
          As of <time dateTime={asOf!.trim()}>{asOfLabel}</time>
        </div>
      ) : null}
    </section>
  );
}
