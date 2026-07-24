import type { CSSProperties } from "react";

import { publicAssetPath } from "@/lib/siteUrl";

import styles from "./PageBorderDeco.module.css";

/**
 * CSS backgrounds rather than `<img>`: the browser fetches only the active theme's file.
 * Rendering both light and dark `<img>` variants downloaded (and preloaded) all four SVGs
 * on every page, half of them never visible.
 */
const decoAssetVars = {
  "--deco-galaxy": `url(${publicAssetPath("/brand/home-deco-galaxy.svg")})`,
  "--deco-galaxy-dark": `url(${publicAssetPath("/brand/home-deco-galaxy-dark.svg")})`,
  "--deco-spring": `url(${publicAssetPath("/brand/home-deco-spring.svg")})`,
  "--deco-spring-dark": `url(${publicAssetPath("/brand/home-deco-spring-dark.svg")})`,
} as CSSProperties;

/** Soft galaxy/spring art in the gutter around the main card (all `.page` shells). */
export function PageBorderDeco() {
  return (
    <div className={styles.wrap} aria-hidden style={decoAssetVars}>
      <div className={`${styles.img} ${styles.galaxy} ${styles.galaxyTR}`} />
      <div className={`${styles.img} ${styles.galaxy} ${styles.galaxyBL}`} />
      <div className={`${styles.img} ${styles.spring} ${styles.springTL}`} />
      <div className={`${styles.img} ${styles.spring} ${styles.springBR}`} />
    </div>
  );
}
