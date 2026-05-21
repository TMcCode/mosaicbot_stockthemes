import Link from "next/link";

import {
  HOME_SITE_BULLETS,
  HOME_SITE_DISCLAIMER,
  HOME_SITE_HEADING,
  HOME_SITE_SUMMARY,
} from "@/lib/homeSiteCopy";

import styles from "./HomePublisherIntro.module.css";

/** Full-width site context block — below home data sections (AdSense §1). */
export function HomePublisherIntro() {
  return (
    <section className={styles.footer} aria-labelledby="home-site-about">
      <div className={styles.footerMain}>
        <div className={styles.footerLead}>
          <h2 id="home-site-about" className={styles.heading}>
            {HOME_SITE_HEADING}
          </h2>
          <p className={styles.summary}>{HOME_SITE_SUMMARY}</p>
        </div>
        <ul className={styles.bullets}>
          {HOME_SITE_BULLETS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className={styles.footerMeta}>
        <p className={styles.disclaimer}>{HOME_SITE_DISCLAIMER}</p>
        <p className={styles.links}>
          <Link href="/about/methodology#limitations">Limitations</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/about/methodology">Methodology</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/about">About</Link>
        </p>
      </div>
    </section>
  );
}
