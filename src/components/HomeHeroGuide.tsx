import Link from "next/link";

import styles from "./HomeHeroGuide.module.css";

/** Brief how-to copy under the homepage hero punchline (if mounted). */
export function HomeHeroGuide() {
  return (
    <div className={styles.wrap}>
      <p>
        Type a stock you own or a theme keyword above — open the membership map, then dig into the
        themes that matter.{" "}
        <Link href="/docs/how-to">How to use</Link> walks the full loop.
      </p>
      <p>
        <Link href="#trending-themes">Trending themes</Link> and{" "}
        <Link href="#home-commentary">recent commentary</Link> below are good next stops once you’ve
        searched.
      </p>
    </div>
  );
}
