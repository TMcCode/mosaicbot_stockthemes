import Link from "next/link";

import styles from "@/components/ThemeConstituentsTable.module.css";

type Props = {
  /** When false, omit the mobile “Scroll right” cue (e.g. Notes fits the viewport). */
  showScrollHint?: boolean;
  /** Slightly smaller type (period returns footnote). */
  compact?: boolean;
  /** Theme edit suggestion — shown after the sort hint when set. */
  suggestEditHref?: string;
};

/** Footer sort hint — desktop click copy vs mobile scroll copy. */
export function ConstituentsTableSortHint({
  showScrollHint = true,
  compact = false,
  suggestEditHref,
}: Props) {
  const editLink = suggestEditHref ? (
    <>
      {" · "}
      <Link href={suggestEditHref} className={styles.sortHintLink}>
        Suggest an edit
      </Link>
    </>
  ) : null;

  return (
    <span className={compact ? `${styles.sortHint} ${styles.sortHintCompact}` : styles.sortHint}>
      <span className={styles.sortHintDesktop}>
        Default: Wgt ↓ · Click headers to sort · Shift+click secondary
        {editLink}
      </span>
      <span className={styles.sortHintMobile}>
        {showScrollHint
          ? "Wgt ↓ · Scroll right · Tap headers to sort"
          : "Wgt ↓ · Tap headers to sort"}
        {editLink}
      </span>
    </span>
  );
}
