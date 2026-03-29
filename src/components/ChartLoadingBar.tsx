import styles from "./ChartLoadingBar.module.css";

/**
 * Shown while the Plotly chunk downloads and parses (separate from main page JS).
 */
export function ChartLoadingBar() {
  return (
    <div className={styles.wrap} role="status" aria-live="polite" aria-label="Loading chart">
      <p className={styles.label}>Loading chart…</p>
      <div className={styles.track}>
        <div className={styles.indeterminate} />
      </div>
    </div>
  );
}
