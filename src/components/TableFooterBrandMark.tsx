import { BrandWatermark } from "@/components/BrandWatermark";

import styles from "./TableFooterBrandMark.module.css";

type Props = {
  className?: string;
};

/**
 * Table footer brand: full icon + stockthemes.ai on desktop;
 * icon-only on narrow widths to avoid overlapping sort hints.
 */
export function TableFooterBrandMark({ className }: Props) {
  return (
    <BrandWatermark
      className={[styles.lockup, className].filter(Boolean).join(" ")}
    />
  );
}
