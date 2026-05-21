import { publicAssetPath } from "@/lib/siteUrl";

import styles from "./HomeHeroVisual.module.css";

const HERO_IMAGE = "/brand/home-hero-growth.png";

type Props = {
  /** Stretch to parent height (hero title + subtitle block). */
  fitToSlot?: boolean;
};

/** Decorative growth / skyline graphic for the home hero (not chart data). */
export function HomeHeroVisual({ fitToSlot = false }: Props) {
  return (
    <div className={`${styles.wrap} ${fitToSlot ? styles.wrapFit : ""}`}>
      <img
        className={styles.img}
        src={publicAssetPath(HERO_IMAGE)}
        alt=""
        width={1024}
        height={585}
        decoding="async"
        fetchPriority="high"
        aria-hidden
      />
    </div>
  );
}
