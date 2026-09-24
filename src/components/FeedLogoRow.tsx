"use client";

import { ConstituentLogo } from "@/components/ConstituentLogo";
import { TICKERS_PREVIEW_DISPLAY_MAX } from "@/lib/constituentMeta";

import styles from "./FeedEventCard.module.css";

type Props = {
  tickers: string[];
  moreCount?: number;
  maxVisible?: number;
};

/** Compact logo strip for home feed cards — same 6-logo cap as Narrative Radar. */
export function FeedLogoRow({
  tickers,
  moreCount = 0,
  maxVisible = TICKERS_PREVIEW_DISPLAY_MAX,
}: Props) {
  const clean = tickers
    .map((t) => String(t || "").trim().toUpperCase())
    .filter(Boolean);
  const shown = clean.slice(0, maxVisible);
  const more = Math.max(0, clean.length - shown.length) + Math.max(0, moreCount);
  if (!shown.length) return null;

  return (
    <div className={styles.logoRow} aria-label="Theme holdings">
      {shown.map((ticker) => (
        <div key={ticker} className={styles.logoHit} title={ticker}>
          <ConstituentLogo ticker={ticker} priority />
          <span className={styles.logoTicker}>{ticker}</span>
        </div>
      ))}
      {more > 0 ? <span className={styles.logoMore}>+{more}</span> : null}
    </div>
  );
}
