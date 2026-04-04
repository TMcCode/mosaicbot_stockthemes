import Link from "next/link";

import { NewsletterSignup } from "@/components/NewsletterSignup";

import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.wrap}>
      <NewsletterSignup variant="footer" />
      <div className={styles.meta}>
        <span className={styles.copyright}>© {new Date().getFullYear()} stockthemes.ai</span>
        <nav className={styles.nav} aria-label="Footer">
          <Link href="/themes">Themes</Link>
          <Link href="/groups">Groups</Link>
          <Link href="/about">About</Link>
        </nav>
      </div>
    </footer>
  );
}
