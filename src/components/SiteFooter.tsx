import { PrefetchIntentLink } from "@/components/PrefetchIntentLink";
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
      <div className={styles.meta}>
        <div className={styles.metaBar}>
          <div className={styles.metaLead}>
            <span className={styles.copyright}>© {new Date().getFullYear()} stockthemes.ai</span>
            {publishedLabel ? (
              <>
                {" · "}
                <span className={styles.dataAsOf}>
                  Last published:{" "}
                  <time dateTime={asOfIso} title="US Eastern (manifest as_of)">
                    {publishedLabel}
                  </time>
                </span>
              </>
            ) : null}
          </div>
          <nav className={styles.nav} aria-label="Footer">
            <span className={styles.navLinks}>
              <PrefetchIntentLink href="/privacy">Privacy</PrefetchIntentLink>
              <PrefetchIntentLink href="/cookie-policy#manage-cookies">
                Manage cookies
              </PrefetchIntentLink>
              <PrefetchIntentLink href="/terms">Terms of Service</PrefetchIntentLink>
              <PrefetchIntentLink href="/about">About</PrefetchIntentLink>
              <PrefetchIntentLink href="/contact">Contact</PrefetchIntentLink>
              <a
                href="https://www.tradingview.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={styles.tvFull}>Charting by TradingView</span>
                <span className={styles.tvShort}>TradingView</span>
              </a>
            </span>
          </nav>
        </div>
      </div>
    </footer>
  );
}
