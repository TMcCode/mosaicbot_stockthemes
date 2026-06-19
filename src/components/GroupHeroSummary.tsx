import Link from "next/link";

import type { GroupTopTickerYtdV0 } from "@/types/group.detail.v0";

import styles from "./GroupHeroSummary.module.css";

type Props = {
  intro?: string | null;
  topTickers: GroupTopTickerYtdV0[];
  groupSlug: string;
  /** Stretch panel to align bottom with hero treemap rail. */
  fillRail?: boolean;
};

function fmtPct(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

function returnClass(v: number): string {
  if (v > 0) return styles.returnUp;
  if (v < 0) return styles.returnDown;
  return styles.returnFlat;
}

export function GroupHeroSummary({ intro, topTickers, groupSlug, fillRail = false }: Props) {
  const introText = intro?.trim();
  const hasIntro = Boolean(introText);
  const hasTickers = topTickers.length > 0;

  if (!hasIntro && !hasTickers) {
    return null;
  }

  return (
    <div className={fillRail ? styles.heroFillRail : styles.heroWrap}>
      <div className={styles.panel}>
        {hasIntro ? <p className={styles.intro}>{introText}</p> : null}

        {hasTickers ? (
          <div className={styles.tickersBlock}>
            <p className={styles.sectionLabel}>Top tickers (YTD)</p>
            <ul className={styles.tickerList}>
              {topTickers.map((row) => (
                <li key={row.ticker}>
                  <Link href={`/themes/${encodeURIComponent(row.theme_slug)}`} className={styles.tickerRow}>
                    <span className={styles.tickerTheme}>{row.theme_name}</span>
                    <span className={styles.tickerSep} aria-hidden="true">
                      ·
                    </span>
                    <span className={styles.tickerSymbol}>{row.ticker}</span>
                    <span className={`${styles.tickerReturn} ${returnClass(row.ytd_pct)}`}>
                      {fmtPct(row.ytd_pct)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <nav className={styles.quickLinks} aria-label="Group quick links">
          <Link href="/compare">Theme returns</Link>
          <span aria-hidden="true">·</span>
          <Link href="/rotation">Rotation map</Link>
          <span aria-hidden="true">·</span>
          <Link href="/heatmap">Heatmap</Link>
          <span aria-hidden="true">·</span>
          <Link href="/overlay">Compare chart</Link>
          <span aria-hidden="true">·</span>
          <Link href={`/groups/${encodeURIComponent(groupSlug)}#group-themes-heading`}>
            All themes
          </Link>
        </nav>
      </div>
    </div>
  );
}
