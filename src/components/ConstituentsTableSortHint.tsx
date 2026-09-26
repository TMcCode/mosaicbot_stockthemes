import styles from "@/components/ThemeConstituentsTable.module.css";

type Props = {
  /** When false, omit the mobile “Scroll right” cue (e.g. Notes fits the viewport). */
  showScrollHint?: boolean;
};

/** Footer sort hint — desktop click copy vs mobile scroll copy. */
export function ConstituentsTableSortHint({ showScrollHint = true }: Props) {
  return (
    <span className={styles.sortHint}>
      <span className={styles.sortHintDesktop}>
        Default: Wgt ↓ · Click headers to sort · Shift+click secondary
      </span>
      <span className={styles.sortHintMobile}>
        {showScrollHint
          ? "Wgt ↓ · Scroll right · Tap headers to sort"
          : "Wgt ↓ · Tap headers to sort"}
      </span>
    </span>
  );
}
