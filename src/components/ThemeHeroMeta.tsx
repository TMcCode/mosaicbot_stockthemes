import Link from "next/link";
import type { ReactNode } from "react";

import { formatUsdMarketCap } from "@/lib/constituentMeta";
import type { Theme10DRankSnapshot } from "@/lib/themeCompareRank";
import { formatReturnPct } from "@/lib/treemapLayout";

import styles from "./ThemeHeroMeta.module.css";

type Props = {
  /** Public one-liner (“what is this”) — shown to everyone when present. */
  intro?: string | null;
  tickerCount?: number | null;
  totalMarketCapUsd?: number;
  rank10d: Theme10DRankSnapshot | null;
  groupSlug?: string | null;
  groupName?: string | null;
};

function returnToneClass(returnPct: number): string {
  if (returnPct > 0) return styles.returnUp;
  if (returnPct < 0) return styles.returnDown;
  return styles.returnFlat;
}

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
  intro,
  tickerCount,
  totalMarketCapUsd,
  rank10d,
  groupSlug,
  groupName,
}: Props) {
  const introText = intro?.trim() ?? "";
  const hasIntro = Boolean(introText);
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

  if (!hasIntro && !showTickers && !hasMcap && !showRanks && !showGroupLink) {
    return null;
  }

  const statsItems: ReactNode[] = [];
  if (showTickers) {
    statsItems.push(
      <>
        <strong>{tickerCount!.toLocaleString()}</strong>
        {` ${tickerCount === 1 ? "ticker" : "tickers"}`}
      </>,
    );
  }
  if (hasMcap) {
    statsItems.push(
      <>
        <strong>{formatUsdMarketCap(totalMarketCapUsd)}</strong>
        {" market cap"}
      </>,
    );
  }

  return (
    <div className={styles.block}>
      {hasIntro ? <div className={styles.seoIntro}>{introText}</div> : null}
      <MetaRow items={statsItems} />
      {showRanks ? (
        <div
          className={styles.rankRow}
          aria-label={`10D ${formatReturnPct(rank10d!.returnPct)}, ranked #${rank10d!.universeRank} of ${rank10d!.universeTotal} themes`}
        >
          <span className={styles.rankPill}>
            <span className={styles.rankPillTag}>10D</span>
            <span className={`${styles.rankReturn} ${returnToneClass(rank10d!.returnPct)}`}>
              {formatReturnPct(rank10d!.returnPct)}
            </span>
          </span>
          <span className={styles.rankPill}>
            <span className={styles.rankValue}>
              #{rank10d!.universeRank.toLocaleString()}
            </span>
            <span className={styles.rankMuted}>
              <span className={styles.rankFull}>
                of {rank10d!.universeTotal.toLocaleString()} themes
              </span>
              <span className={styles.rankShort}>
                /{rank10d!.universeTotal.toLocaleString()}
              </span>
            </span>
          </span>
          {groupInRankLine ? (
            <span className={styles.rankPill}>
              <span className={styles.rankValue}>
                #{rank10d!.groupRank!.toLocaleString()}
              </span>
              <span className={styles.rankMuted}>
                <span className={styles.rankFull}>
                  of {rank10d!.groupTotal!.toLocaleString()} in{" "}
                  <Link href={`/groups/${encodeURIComponent(groupKey)}`}>
                    {groupLabel}
                  </Link>
                </span>
                <span className={styles.rankShort}>
                  /{rank10d!.groupTotal!.toLocaleString()}{" "}
                  <Link href={`/groups/${encodeURIComponent(groupKey)}`}>
                    {groupLabel}
                  </Link>
                </span>
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
