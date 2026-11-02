import type { Metadata } from "next";
import Link from "next/link";

import { HELLO_EMAIL, mailtoHref } from "@/lib/contactEmails";
import { buildPageMetadata } from "@/lib/seoMetadata";
import {
  BLAST_QUERY_MODES,
  ROADMAP_DISCLAIMER,
  ROADMAP_FORK_LABEL,
  ROADMAP_FOUNDATION,
  ROADMAP_CURRENT_SUBSCRIPTIONS,
  ROADMAP_FUNDING_MAP_BEFORE_LINK,
  ROADMAP_FUNDING_OPEN,
  ROADMAP_FUNDING_USEFUL,
  ROADMAP_PAGE_INTRO,
  ROADMAP_PRONGS,
} from "@/lib/roadmapStory";

import docsStyles from "../docs.module.css";
import styles from "../../page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Roadmap",
  description:
    "stockthemes.ai roadmap: data and news strengthen the platform, which forks into Stockthemes and Blast Radius.",
  path: "/docs/roadmap",
});

/** Static docs — foundation → two prongs; dataset queue on `/docs/roadmap/data`. */
export default function DocsRoadmapPage() {
  const foundation = ROADMAP_FOUNDATION;
  const research = ROADMAP_PRONGS.find((p) => p.id === "research");
  const blast = ROADMAP_PRONGS.find((p) => p.id === "blast-radius");

  return (
    <article className={docsStyles.article}>
      <p className={styles.eyebrow}>Roadmap</p>
      <h1 className={styles.heroTitle}>Where this is going</h1>
      <p className={styles.introCopy}>{ROADMAP_PAGE_INTRO}</p>

      <section id={foundation.id} className={docsStyles.foundationBlock}>
        <p className={docsStyles.foundationEyebrow}>Foundation</p>
        <h2 className={docsStyles.pillarTitle}>{foundation.title}</h2>
        <p className={docsStyles.pillarLede}>{foundation.lede}</p>
        <ul className={docsStyles.pillarBullets}>
          {foundation.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <p className={docsStyles.pillarCta}>
          <Link href={foundation.cta.href}>{foundation.cta.label}</Link>
        </p>
      </section>

      <div className={docsStyles.forkJoin} aria-hidden>
        <span className={docsStyles.forkStem} />
        <span className={docsStyles.forkBar} />
      </div>

      <p className={docsStyles.forkLabel}>{ROADMAP_FORK_LABEL}</p>

      <div className={docsStyles.prongGrid}>
        {research ? (
          <section id={research.id} className={docsStyles.prongCard}>
            <h2 className={docsStyles.prongTitle}>{research.title}</h2>
            <p className={docsStyles.pillarLede}>{research.lede}</p>
            <ul className={docsStyles.pillarBullets}>
              {research.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {blast ? (
          <section id={blast.id} className={docsStyles.prongCard}>
            <h2 className={docsStyles.prongTitle}>{blast.title}</h2>
            <p className={docsStyles.pillarLede}>{blast.lede}</p>
            <ul className={docsStyles.pillarBullets}>
              {blast.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <div className={docsStyles.blastBlock}>
              <p className={docsStyles.blastBlockLabel}>Starting questions → market map</p>
              <ul className={docsStyles.blastModes}>
                {BLAST_QUERY_MODES.map((mode) => (
                  <li key={mode.id} className={docsStyles.blastMode}>
                    <span className={docsStyles.blastModeTitle}>{mode.title}</span>
                    <span className={docsStyles.blastModePrompt}>“{mode.prompt}”</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </div>

      <div className={docsStyles.currentSubsBox}>
        <p className={docsStyles.currentSubsLabel}>Current subscriptions</p>
        <ul className={docsStyles.currentSubsList}>
          {ROADMAP_CURRENT_SUBSCRIPTIONS.map((sub) => (
            <li key={sub.name}>
              <span className={docsStyles.currentSubsName}>{sub.name}</span>
              <span className={docsStyles.currentSubsUse}>{sub.use}</span>
            </li>
          ))}
        </ul>
      </div>

      <section className={`${styles.aboutProse} ${styles.aboutBasketCard}`}>
        <h2 id="how-it-funds">How it&apos;s funded</h2>
        <p className={styles.introCopy}>{ROADMAP_FUNDING_OPEN}</p>
        <p className={styles.introCopy}>
          {ROADMAP_FUNDING_MAP_BEFORE_LINK}{" "}
          <Link href="/docs/roadmap/data">data roadmap</Link>.
        </p>
        <p className={styles.introCopy}>{ROADMAP_FUNDING_USEFUL}</p>
        <p className={styles.introCopy}>
          Interested in investing, partnering, or helping fund a specific data layer? Email{" "}
          <a href={mailtoHref(HELLO_EMAIL, "Investment or partnership")}>{HELLO_EMAIL}</a>.
        </p>
        <p className={`${styles.introCopy} ${styles.aboutVisionDisclaimer}`}>{ROADMAP_DISCLAIMER}</p>
      </section>
    </article>
  );
}
