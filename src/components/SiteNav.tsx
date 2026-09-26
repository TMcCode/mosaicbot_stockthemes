import { PrefetchIntentLink } from "@/components/PrefetchIntentLink";
import { SiteNavAuth } from "@/components/SiteNavAuth";
import { SiteNavDesktopOffset } from "@/components/SiteNavDesktopOffset";
import { SiteNavSearch } from "@/components/SiteNavSearch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { brandAssetPath } from "@/lib/siteUrl";

import styles from "./SiteNav.module.css";

export function SiteNav() {
  return (
    <>
      <header className={styles.wrap} data-site-nav>
        <nav className={styles.row} aria-label="Primary">
        <PrefetchIntentLink
          href="/"
          className={styles.brand}
          aria-label="stockthemes.ai home"
        >
          <img
            className={styles.brandMark}
            src={brandAssetPath("/brand/logo-icon-custom.png")}
            alt=""
            width={38}
            height={25}
            decoding="async"
            aria-hidden
          />
          <span className={styles.brandLabel}>stockthemes.ai</span>
        </PrefetchIntentLink>
        <SiteNavSearch />
        <div className={styles.links}>
          <div className={styles.browseMenu}>
            <button type="button" className={styles.menuTrigger} aria-haspopup="menu" aria-expanded={false}>
              Browse
              <span className={styles.menuChevron} aria-hidden="true">
                ▾
              </span>
            </button>
            <div className={styles.menuPanel} role="menu">
              <PrefetchIntentLink href="/groups" className={styles.menuItem} role="menuitem">
                All groups
              </PrefetchIntentLink>
              <PrefetchIntentLink href="/themes" className={styles.menuItem} role="menuitem">
                All themes
              </PrefetchIntentLink>
              <div className={styles.menuDivider} role="separator" />
              <PrefetchIntentLink href="/compare" className={styles.menuItem} role="menuitem">
                Theme returns table
              </PrefetchIntentLink>
              <PrefetchIntentLink href="/overlay" className={styles.menuItem} role="menuitem">
                Theme compare
              </PrefetchIntentLink>
              <PrefetchIntentLink href="/heatmap" className={styles.menuItem} role="menuitem">
                Market heatmap
              </PrefetchIntentLink>
              <PrefetchIntentLink href="/rotation" className={styles.menuItem} role="menuitem">
                Theme rotation map
              </PrefetchIntentLink>
              <PrefetchIntentLink href="/factors" className={styles.menuItem} role="menuitem">
                Theme factor exposure
              </PrefetchIntentLink>
              <div className={styles.menuMobileAccount}>
                <div className={styles.menuDivider} role="separator" />
                <SiteNavAuth variant="menu" />
              </div>
            </div>
          </div>
          <span className={`${styles.sep} ${styles.authInline}`} aria-hidden="true">
            ·
          </span>
          <div className={styles.authInline}>
            <SiteNavAuth />
          </div>
          <span className={`${styles.sep} ${styles.authInline}`} aria-hidden="true">
            ·
          </span>
          <ThemeToggle />
        </div>
      </nav>
    </header>
    <SiteNavDesktopOffset />
    </>
  );
}
