import Link from "next/link";

import styles from "./SiteNav.module.css";

export function SiteNav() {
  return (
    <header className={styles.wrap}>
      <nav className={styles.row} aria-label="Primary">
        <Link href="/" className={styles.brand}>
          stockthemes.ai
        </Link>
        <div className={styles.links}>
          <Link href="/groups">All groups</Link>
          <Link href="/themes">All themes</Link>
        </div>
      </nav>
    </header>
  );
}
