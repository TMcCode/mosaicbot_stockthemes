import type { Metadata } from "next";
import Link from "next/link";

import { DOCS_NAV } from "@/lib/docsNav";
import { buildPageMetadata } from "@/lib/seoMetadata";

import styles from "./docs.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Documentation",
  description:
    "About stockthemes.ai, theme methodology, factor exposures, and related product docs.",
  path: "/docs",
});

/** Hub landing — card grid like FMP playground index; no R2 / heavy loads. */
export default function DocsIndexPage() {
  return (
    <div className={styles.hub}>
      <p className={styles.hubEyebrow}>Documentation</p>
      <h1 className={styles.hubTitle}>Docs</h1>
      <p className={styles.hubLead}>
        How themes are built, how returns and factors work, where the product is headed, and what to
        keep in mind when reading the site.
      </p>
      <ul className={styles.hubGrid}>
        {DOCS_NAV.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className={styles.hubCard}>
              <h2 className={styles.hubCardTitle}>{item.label}</h2>
              <p className={styles.hubCardSummary}>{item.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
