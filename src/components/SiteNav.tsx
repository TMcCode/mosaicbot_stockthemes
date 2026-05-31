import Link from "next/link";

import { LazySiteSearch } from "@/components/LazySiteSearch";
import { SiteNavAuth } from "@/components/SiteNavAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { publicAssetPath } from "@/lib/siteUrl";

import styles from "./SiteNav.module.css";

export function SiteNav() {
  return (
    <header className={styles.wrap}>
      <nav className={styles.row} aria-label="Primary">
        <Link href="/" className={styles.brand}>
          <img
            className={styles.brandMark}
            src={publicAssetPath("/brand/logo-icon-custom.png")}
            alt=""
            width={38}
            height={25}
            decoding="async"
            aria-hidden
          />
          <span className={styles.brandLabel} style={{ position: "relative", top: 12 }}>
            stockthemes.ai
          </span>
        </Link>
        <LazySiteSearch />
        <div className={styles.links}>
          <div className={styles.browseMenu}>
            <button type="button" className={styles.menuTrigger} aria-haspopup="menu" aria-expanded={false}>
              Browse
              <span className={styles.menuChevron} aria-hidden="true">
                ▾
              </span>
            </button>
            <div className={styles.menuPanel} role="menu">
              <Link href="/groups" className={styles.menuItem} role="menuitem">
                All groups
              </Link>
              <Link href="/themes" className={styles.menuItem} role="menuitem">
                All themes
              </Link>
              <div className={styles.menuDivider} role="separator" />
              <Link href="/compare" className={styles.menuItem} role="menuitem">
                Theme returns table
              </Link>
              <Link href="/overlay" className={styles.menuItem} role="menuitem">
                Theme compare chart
              </Link>
              <Link href="/factors" className={styles.menuItem} role="menuitem">
                Theme factor exposure
              </Link>
            </div>
          </div>
          <span className={styles.sep} aria-hidden="true">
            ·
          </span>
          <SiteNavAuth />
          <span className={styles.sep} aria-hidden="true">
            ·
          </span>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
