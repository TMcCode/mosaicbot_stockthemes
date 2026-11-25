import type { Metadata } from "next";
import Link from "next/link";

import {
  HOW_TO_FOOTNOTE,
  HOW_TO_INTRO,
  HOW_TO_SECTIONS,
} from "@/lib/howToUseCopy";
import { buildPageMetadata } from "@/lib/seoMetadata";

import styles from "../docs.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "How to use stockthemes.ai",
  description:
    "How to use stockthemes.ai: type a stock or theme in search, read the membership map, sign in for the desk and watchlist, then verify with returns.",
  path: "/docs/how-to",
});

/** Static copy only — keep off `page.module.css` / R2 so this route stays light. */
export default function DocsHowToPage() {
  return (
    <article className={styles.article}>
      <p className={styles.howToEyebrow}>
        <Link href="/docs">Documentation</Link>
        {" · "}
        How to use
      </p>
      <h1>How to use stockthemes.ai</h1>
      <p className={styles.howToLead}>{HOW_TO_INTRO}</p>

      {HOW_TO_SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className={styles.howToCard}>
          <h2>{section.title}</h2>
          {section.body.map((p, i) => (
            <p key={`${section.id}-p-${i}`} className={styles.howToCopy}>
              {p}
            </p>
          ))}
        </section>
      ))}

      <p className={`${styles.howToCopy} ${styles.aboutFooterNote}`}>{HOW_TO_FOOTNOTE}</p>
      <p className={`${styles.howToCopy} ${styles.aboutFooterNote}`}>
        Related: <Link href="/desk">From the desk</Link>
        {" · "}
        <Link href="/compare">Theme returns table</Link>
        {" · "}
        <Link href="/docs/methodology">Methodology</Link>
      </p>
    </article>
  );
}
