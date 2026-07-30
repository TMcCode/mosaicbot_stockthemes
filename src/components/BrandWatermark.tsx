import { publicAssetPath } from "@/lib/siteUrl";

import styles from "./BrandWatermark.module.css";

type Props = {
  className?: string;
};

/** Nav-style lockup: icon + text that follows light/dark theme colors. */
export function BrandWatermark({ className }: Props) {
  return (
    <div
      className={[styles.wrap, className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.mark}
        src={publicAssetPath("/brand/logo-icon-custom.png")}
        alt=""
        width={16}
        height={16}
        loading="lazy"
        decoding="async"
      />
      <span className={styles.label}>stockthemes.ai</span>
    </div>
  );
}
