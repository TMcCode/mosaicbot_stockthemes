import Link from "next/link";
import type { ReactNode } from "react";

import { formatUsdMarketCap } from "@/lib/constituentMeta";
import type { Theme10DRankSnapshot } from "@/lib/themeCompareRank";

import styles from "./ThemeHeroMeta.module.css";

type Props = {
  tickerCount?: number | null;
  totalMarketCapUsd?: number;
  rank10d: Theme10DRankSnapshot | null;
  groupSlug?: string | null;
  groupName?: string | null;
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

export function ThemeHeroMeta({
  tickerCount,
  totalMarketCapUsd,
  rank10d,
  groupSlug,
  groupName,
}: Props) {
  const hasMcap = totalMarketCapUsd != null && totalMarketCapUsd > 0;
  const showTickers = tickerCount != null;
  const showRanks = rank10d != null;
  const groupKey = groupSlug?.trim() ?? "";
  const groupLabel = groupName?.trim() ?? "";
  const showGroupLink = Boolean(groupKey && groupLabel);
  const groupInRankLine =
    showRanks &&
    rank10d!.groupRank != null &&
    rank10d!.groupTotal != null &&
    showGroupLink;

  if (!showTickers && !hasMcap && !showRanks && !showGroupLink) {
    return null;
  }

  const statsItems: ReactNode[] = [];
  if (showTickers) {
    statsItems.push(
      <>
        <strong>{tickerCount!.toLocaleString()}</strong>{" "}
        {tickerCount === 1 ? "ticker" : "tickers"}
      </>,
    );
  }
  if (hasMcap) {
    statsItems.push(
      <>
        <strong>{formatUsdMarketCap(totalMarketCapUsd)}</strong> market cap
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
            <span className={styles.rankValue}>
              #{rank10d!.universeRank.toLocaleString()}
            </span>
            <span className={styles.rankMuted}>
              of {rank10d!.universeTotal.toLocaleString()} themes
            </span>
          </span>
          {groupInRankLine ? (
            <span className={styles.rankPill}>
              <span className={styles.rankValue}>
                #{rank10d!.groupRank!.toLocaleString()}
              </span>
              <span className={styles.rankMuted}>
                of {rank10d!.groupTotal!.toLocaleString()} in{" "}
                <Link href={`/groups/${encodeURIComponent(groupKey)}`}>
                  {groupLabel}
                </Link>
              </span>
            </span>
          ) : null}
        </div>
      ) : null}
      {showGroupLink && !groupInRankLine ? (
        <p className={styles.groupOnly}>
          Group:{" "}
          <Link href={`/groups/${encodeURIComponent(groupKey)}`}>{groupLabel}</Link>
        </p>
      ) : null}
    </div>
  );
}
