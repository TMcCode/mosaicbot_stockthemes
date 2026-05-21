import { publicAssetPath } from "@/lib/siteUrl";

import styles from "./PageBorderDeco.module.css";

/** Soft galaxy/spring art in the gutter around the main card (all `.page` shells). */
export function PageBorderDeco() {
  return (
    <div className={styles.wrap} aria-hidden>
      <img
        className={`${styles.img} ${styles.light} ${styles.galaxyTR}`}
        src={publicAssetPath("/brand/home-deco-galaxy.svg")}
        alt=""
        width={420}
        height={315}
        decoding="async"
      />
      <img
        className={`${styles.img} ${styles.dark} ${styles.galaxyTR}`}
        src={publicAssetPath("/brand/home-deco-galaxy-dark.svg")}
        alt=""
        width={420}
        height={315}
        decoding="async"
      />
      <img
        className={`${styles.img} ${styles.light} ${styles.galaxyBL}`}
        src={publicAssetPath("/brand/home-deco-galaxy.svg")}
        alt=""
        width={320}
        height={240}
        decoding="async"
      />
      <img
        className={`${styles.img} ${styles.dark} ${styles.galaxyBL}`}
        src={publicAssetPath("/brand/home-deco-galaxy-dark.svg")}
        alt=""
        width={320}
        height={240}
        decoding="async"
      />
      <img
        className={`${styles.img} ${styles.light} ${styles.springTL}`}
        src={publicAssetPath("/brand/home-deco-spring.svg")}
        alt=""
        width={360}
        height={290}
        decoding="async"
      />
      <img
        className={`${styles.img} ${styles.dark} ${styles.springTL}`}
        src={publicAssetPath("/brand/home-deco-spring-dark.svg")}
        alt=""
        width={360}
        height={290}
        decoding="async"
      />
      <img
        className={`${styles.img} ${styles.light} ${styles.springBR}`}
        src={publicAssetPath("/brand/home-deco-spring.svg")}
        alt=""
        width={300}
        height={240}
        decoding="async"
      />
      <img
        className={`${styles.img} ${styles.dark} ${styles.springBR}`}
        src={publicAssetPath("/brand/home-deco-spring-dark.svg")}
        alt=""
        width={300}
        height={240}
        decoding="async"
      />
    </div>
  );
}
