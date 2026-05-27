import type { ReactNode } from "react";

import type { Group10DRankSnapshot } from "@/lib/groupCompareRank";

import styles from "./ThemeHeroMeta.module.css";

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
        <strong>{themeCount!.toLocaleString()}</strong>{" "}
        {themeCount === 1 ? "theme" : "themes"}
      </>,
    );
  }
  if (showTickers) {
    statsItems.push(
      <>
        <strong>{tickerCount!.toLocaleString()}</strong>{" "}
        {tickerCount === 1 ? "ticker" : "tickers"}
      </>,
    );
  }

  return (
    <div className={styles.block}>
      <MetaRow items={statsItems} />
      {showRanks ? (
        <div className={styles.rankRow}>
          <span className={styles.rankPill}>
            <span className={styles.rankPillTag}>10D rank</span>
          </span>
          <span className={styles.rankPill}>
            <span className={styles.rankValue}>#{rank10d!.universeRank.toLocaleString()}</span>
            <span className={styles.rankMuted}>
              of {rank10d!.universeTotal.toLocaleString()} groups
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
