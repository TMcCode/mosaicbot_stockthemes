import Link from "next/link";

import { splitThemeDisplayName } from "@/lib/rotationThemeLabel";
import type { GroupTopTickerYtdV0 } from "@/types/group.detail.v0";

import styles from "./GroupHeroSummary.module.css";

type Props = {
  intro?: string | null;
  topTickers: GroupTopTickerYtdV0[];
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

export function GroupHeroSummary({ intro, topTickers, fillRail = false }: Props) {
  const introText = intro?.trim();
  const hasIntro = Boolean(introText);
  const hasTickers = topTickers.length > 0;

  if (!hasIntro && !hasTickers) {
    return null;
  }

  return (
    <div className={fillRail ? styles.heroFillRail : styles.heroWrap}>
      {hasIntro ? <div className={styles.intro}>{introText}</div> : null}
      {hasTickers ? (
        <div className={styles.panel}>
          <div className={styles.tickersBlock}>
            <div className={styles.sectionLabel}>Top tickers (YTD)</div>
            <ul className={styles.tickerList}>
              {topTickers.map((row) => {
                const { title, groupPrefix } = splitThemeDisplayName(row.theme_name);
                return (
                  <li key={row.ticker}>
                    <Link
                      href={`/themes/${encodeURIComponent(row.theme_slug)}`}
                      className={styles.tickerRow}
                    >
                      <span className={styles.tickerText}>
                        <span className={styles.tickerMain}>
                          <span className={styles.tickerTheme}>{title}</span>
                          <span className={styles.tickerSep} aria-hidden="true">
                            ·
                          </span>
                          <span className={styles.tickerSymbol}>{row.ticker}</span>
                        </span>
                        {groupPrefix ? (
                          <span className={styles.tickerGroup}>{groupPrefix}</span>
                        ) : null}
                      </span>
                      <span className={`${styles.tickerReturn} ${returnClass(row.ytd_pct)}`}>
                        {fmtPct(row.ytd_pct)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
