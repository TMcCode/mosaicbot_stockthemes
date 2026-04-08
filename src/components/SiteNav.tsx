import Link from "next/link";

import { SiteSearch } from "@/components/SiteSearch";
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
        <SiteSearch />
        <div className={styles.links}>
          <Link href="/groups">All groups</Link>
          <span className={styles.sep} aria-hidden="true">
            ·
          </span>
          <Link href="/themes">All themes</Link>
          <span className={styles.sep} aria-hidden="true">
            ·
          </span>
          <Link href="/about">About</Link>
          <span className={styles.sep} aria-hidden="true">
            ·
          </span>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
