import type { ReactNode } from "react";

import type { Group10DRankSnapshot } from "@/lib/groupCompareRank";
import { formatReturnPct } from "@/lib/treemapLayout";

import styles from "./ThemeHeroMeta.module.css";

function returnToneClass(returnPct: number): string {
  if (returnPct > 0) return styles.returnUp;
  if (returnPct < 0) return styles.returnDown;
  return styles.returnFlat;
}

type Props = {
  themeCount?: number | null;
  tickerCount?: number | null;
  rank10d: Group10DRankSnapshot | null;
};

function MetaRow({ items }: { items: ReactNode[] }) {
  const nodes = items.filter((item) => item != null && item !== false);
  if (!nodes.length) return null;
  return (
    <div className={styles.row}>
      {nodes.map((item, index) => (
        <span key={index} className={styles.item}>
          {index > 0 ? (
            <span className={styles.sep} aria-hidden="true">
              ·
            </span>
          ) : null}
          {item}
        </span>
      ))}
    </div>
  );
}

export function GroupHeroMeta({ themeCount, tickerCount, rank10d }: Props) {
  const showThemes = themeCount != null;
  const showTickers = tickerCount != null;
  const showRanks = rank10d != null;

  if (!showThemes && !showTickers && !showRanks) {
    return null;
  }

  const statsItems: ReactNode[] = [];
  if (showThemes) {
    statsItems.push(
      <>
        <strong>{themeCount!.toLocaleString()}</strong>
        {` ${themeCount === 1 ? "theme" : "themes"}`}
      </>,
    );
  }
  if (showTickers) {
    statsItems.push(
      <>
        <strong>{tickerCount!.toLocaleString()}</strong>
        {` ${tickerCount === 1 ? "ticker" : "tickers"}`}
      </>,
    );
  }

  return (
    <div className={styles.block}>
      <MetaRow items={statsItems} />
      {showRanks ? (
        <div
          className={styles.rankRow}
          aria-label={`10D ${formatReturnPct(rank10d!.returnPct)}, ranked #${rank10d!.universeRank} of ${rank10d!.universeTotal} groups`}
        >
          <span className={styles.rankPill}>
            <span className={styles.rankPillTag}>10D</span>
            <span className={`${styles.rankReturn} ${returnToneClass(rank10d!.returnPct)}`}>
              {formatReturnPct(rank10d!.returnPct)}
            </span>
          </span>
          <span className={styles.rankPill}>
            <span className={styles.rankValue}>#{rank10d!.universeRank.toLocaleString()}</span>
            <span className={styles.rankMuted}>
              <span className={styles.rankFull}>
                of {rank10d!.universeTotal.toLocaleString()} groups
              </span>
              <span className={styles.rankShort}>
                /{rank10d!.universeTotal.toLocaleString()}
              </span>
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
