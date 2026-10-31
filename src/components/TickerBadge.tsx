"use client";

import { prefetchStockDetail } from "@/lib/prefetchStockDetail";
import { stockPagePath } from "@/lib/stockPagePath";

import styles from "./TickerBadge.module.css";

type Props = {
  ticker: string;
  /** When false, render a plain badge (no navigation). Default: link to `/stocks/[ticker]`. */
  link?: boolean;
};

export function TickerBadge({ ticker, link = true }: Props) {
  const t = ticker.trim();
  if (!t) return null;
  const badge = <span className={styles.badge}>{t}</span>;
  if (!link) return badge;
  // Hard <a>: most stock HTML is on-demand (Pages Function), not in the static export.
  return (
    <a
      href={stockPagePath(t)}
      className={styles.link}
      title={`${t} stock page`}
      onMouseEnter={() => prefetchStockDetail(t)}
      onFocus={() => prefetchStockDetail(t)}
    >
      {badge}
    </a>
  );
}
