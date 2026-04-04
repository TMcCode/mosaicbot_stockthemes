import styles from "./TickerBadge.module.css";

export function TickerBadge({ ticker }: { ticker: string }) {
  const t = ticker.trim();
  if (!t) return null;
  return <span className={styles.badge}>{t}</span>;
}
