import Link from "next/link";

import styles from "./HomeHeroGuide.module.css";

/** Brief how-to copy under the homepage hero punchline. */
export function HomeHeroGuide() {
  return (
    <div className={styles.wrap}>
      <p>
        Search above—enter a ticker to see which themes it sits in, or type a keyword to find a
        theme and browse every constituent in the basket.
      </p>
      <p>
        Our{" "}
        <Link href="#trending-themes">trending themes</Link> and{" "}
        <Link href="#home-commentary">recent commentary</Link> below are a good place to start. We
        determine the themes we most like and tend to them daily.
      </p>
    </div>
  );
}
