import Link from "next/link";

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
  return (
    <Link href={stockPagePath(t)} className={styles.link} prefetch={false} title={`${t} stock page`}>
      {badge}
    </Link>
  );
}
