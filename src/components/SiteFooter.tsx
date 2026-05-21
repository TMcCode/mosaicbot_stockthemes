import Link from "next/link";

import { NewsletterSignup } from "@/components/NewsletterSignup";
import { formatSiteDataPublished } from "@/lib/formatSiteDataPublished";

import styles from "./SiteFooter.module.css";

type Props = {
  /** Manifest `as_of` (ISO); site-wide “data updated” time. */
  dataAsOf?: string;
};

export function SiteFooter({ dataAsOf }: Props) {
  const asOfIso = dataAsOf?.trim() || "";
  const publishedLabel = asOfIso ? formatSiteDataPublished(asOfIso) : "";

  return (
    <footer className={styles.wrap}>
      <div id="newsletter-signup">
        <NewsletterSignup variant="footer" />
      </div>
      <div className={styles.meta}>
        <div className={styles.metaBar}>
          <div className={styles.metaLead}>
            <span className={styles.copyright}>© {new Date().getFullYear()} stockthemes.ai</span>
            {publishedLabel ? (
              <>
                {"\u2003"}
                <span className={styles.dataAsOf}>
                  Site data published{" "}
                  <time dateTime={asOfIso} title="UTC">
                    {publishedLabel} UTC
                  </time>
                </span>
              </>
            ) : null}
          </div>
          <nav className={styles.nav} aria-label="Footer">
            <span className={styles.navLinks}>
              <Link href="/privacy">Privacy</Link>
              <Link href="/cookie-policy#manage-cookies">Manage cookies</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/about">About</Link>
              <a
                href="https://www.tradingview.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Charting by TradingView
              </a>
            </span>
          </nav>
        </div>
      </div>
    </footer>
  );
}
