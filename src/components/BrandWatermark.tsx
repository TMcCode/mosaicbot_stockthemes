import { brandAssetPath } from "@/lib/siteUrl";

import styles from "./BrandWatermark.module.css";

type Props = {
  className?: string;
  /** Large centered chart watermark (theme-colored wordmark + SVG mark). */
  variant?: "default" | "chart";
};

/** Nav-style lockup: icon + text that follows light/dark theme colors. */
export function BrandWatermark({ className, variant = "default" }: Props) {
  const isChart = variant === "chart";
  return (
    <div
      className={[styles.wrap, isChart ? styles.chartVariant : "", className]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.mark}
        src={brandAssetPath(isChart ? "/brand/logo-icon.svg" : "/brand/logo-icon-custom.png")}
        alt=""
        width={isChart ? 64 : 16}
        height={isChart ? 64 : 16}
        loading="lazy"
        decoding="async"
      />
      <span className={styles.label}>stockthemes.ai</span>
    </div>
  );
}
