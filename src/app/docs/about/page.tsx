import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import {
  ABOUT_VISION_PARAGRAPHS,
  ABOUT_VISION_RECENT,
  ABOUT_VISION_UPCOMING,
} from "@/lib/aboutVisionCopy";
import { HELLO_EMAIL, SUPPORT_EMAIL, mailtoHref } from "@/lib/contactEmails";
import {
  DEFAULT_HOME_INTRO,
  FOUNDERS_X_HANDLE,
  FOUNDERS_X_URL,
} from "@/lib/aboutFounderCopy";
import { SITE_PRODUCT_SUMMARY } from "@/lib/homeSiteCopy";
import { getWebsiteContentCached } from "@/lib/getWebsiteContentCached";
import { buildPageMetadata } from "@/lib/seoMetadata";

import docsStyles from "../docs.module.css";
import styles from "../../page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "About",
  description:
    "Background, product vision, methodology, and theme basket definitions for stockthemes.ai.",
  path: "/docs/about",
});

function linkifyIntroSegment(text: string, keyPrefix: string) {
  const email = HELLO_EMAIL;
  const handle = FOUNDERS_X_HANDLE;
  const nodes: ReactNode[] = [];
  let rest = text;
  let n = 0;

  while (rest.length > 0) {
    const emailAt = rest.indexOf(email);
    const handleAt = rest.indexOf(handle);
    const nextAt =
      emailAt === -1
        ? handleAt
        : handleAt === -1
          ? emailAt
          : Math.min(emailAt, handleAt);

    if (nextAt === -1) {
      nodes.push(rest);
      break;
    }

    if (nextAt > 0) {
      nodes.push(rest.slice(0, nextAt));
    }

    if (nextAt === emailAt) {
      nodes.push(
        <a key={`${keyPrefix}-email-${n++}`} href={`mailto:${email}`} style={{ fontWeight: 600 }}>
          {email}
        </a>,
      );
      rest = rest.slice(nextAt + email.length);
    } else {
      nodes.push(
        <a
          key={`${keyPrefix}-x-${n++}`}
          href={FOUNDERS_X_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontWeight: 600 }}
        >
          {handle}
        </a>,
      );
      rest = rest.slice(nextAt + handle.length);
    }
  }

  return nodes;
}

export default async function DocsAboutPage() {
  const content = await getWebsiteContentCached();
  const introParagraphs = DEFAULT_HOME_INTRO
    .split(/\n\s*\n/g)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
  const themeBasketIntro = (content?.theme_basket_intro || "").trim() || SITE_PRODUCT_SUMMARY;

  return (
    <article className={docsStyles.article}>
      <p className={styles.eyebrow}>About</p>
      <h1 className={styles.heroTitle}>About stockthemes.ai</h1>
      <div
        className={`${styles.introCopyWrap} ${styles.aboutProse} ${styles.aboutLead} ${styles.aboutBasketCard}`}
      >
        <h2 id="about-founder-note">Why I built stockthemes.ai</h2>
        {introParagraphs.map((p, i) => (
          <p key={`about-${i}`} className={styles.introCopy}>
            {linkifyIntroSegment(p, `about-${i}`)}
          </p>
        ))}
      </div>
      <section
        className={`${styles.aboutProse} ${styles.aboutBasketCard}`}
        aria-labelledby="what-is-theme-basket"
      >
        <h2 id="what-is-theme-basket">What is a theme basket?</h2>
        <p className={styles.introCopy}>{themeBasketIntro}</p>
        <p className={styles.introCopy}>
          <strong>The form is three layers:</strong> Groups, themes, and constituents. A Group is the
          macro umbrella—the big idea (for example, Space Supply Chain). Themes are the specific angles
          inside it (launch services, satellite components, geospatial intelligence). Each theme page is
          the basket itself: public tickers, weights, performance, and a changelog when holdings change.
          Browse groups to orient; open a theme when you want the full list of names tied to a narrative.
        </p>
        <p className={styles.introCopy}>
          Baskets are built by hand after extensive research—not auto-generated from a prompt. I review
          company filings, earnings commentary, product roadmaps, and initiative-level signals to map
          which public companies are actually exposed to each theme. General-purpose LLM lists often miss
          this: non-public names, stale narratives, or exposure that no longer matches what companies are
          doing today.
        </p>
        <p className={styles.introCopy}>
          Missing a narrative or think a basket needs updating? Use my{" "}
          <Link href="/account/suggest">suggestion form</Link> to propose a new group, a new theme, or
          edits to an existing basket (sign-in required). I review every submission.
        </p>
        <p className={styles.introCopy}>
          For a clinical breakdown of construction rules, weights, return calculations, and refresh
          cadence, see the <Link href="/docs/methodology">methodology page</Link>.
        </p>
      </section>
      <section className={`${styles.aboutProse} ${styles.aboutBasketCard}`} aria-labelledby="about-vision">
        <h2 id="about-vision">Vision</h2>
        {ABOUT_VISION_PARAGRAPHS.map((p, i) => (
          <p key={`vision-${i}`} className={styles.introCopy}>
            {p}
          </p>
        ))}
        <p className={styles.introCopy}>
          For the full product path—data foundation, Stockthemes, and Blast Radius—see the{" "}
          <Link href="/docs/roadmap">roadmap</Link> and{" "}
          <Link href="/docs/roadmap/data">data queue</Link>.
        </p>

        <h3 className={styles.aboutRoadmapHeading}>Coming next</h3>
        <ol
          className={`${docsStyles.shippedTimeline} ${docsStyles.shippedTimelineUpcoming}`}
          aria-label="Upcoming milestones"
        >
          {ABOUT_VISION_UPCOMING.map((item) => (
            <li key={item.title} className={docsStyles.shippedTimelineItem}>
              <time className={docsStyles.shippedTimelineDate} dateTime={item.dateTime}>
                {item.date}
              </time>
              <div className={docsStyles.shippedTimelineBody}>
                <p className={docsStyles.shippedTimelineTitle}>
                  {item.title}
                  <span className={docsStyles.shippedTimelineBadge}>Planned</span>
                </p>
                <p className={docsStyles.shippedTimelineCopy}>{item.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <h3 className={styles.aboutRoadmapHeading}>Recently shipped</h3>
        <ol className={docsStyles.shippedTimeline} aria-label="Recently shipped milestones">
          {ABOUT_VISION_RECENT.map((item) => (
            <li key={item.title} className={docsStyles.shippedTimelineItem}>
              <time className={docsStyles.shippedTimelineDate} dateTime={item.dateTime}>
                {item.date}
              </time>
              <div className={docsStyles.shippedTimelineBody}>
                <p className={docsStyles.shippedTimelineTitle}>{item.title}</p>
                <p className={docsStyles.shippedTimelineCopy}>{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <p className={`${styles.introCopy} ${docsStyles.aboutFooterNote}`}>
        Questions or feedback? Email{" "}
        <a href={mailtoHref(SUPPORT_EMAIL)} style={{ fontWeight: 600 }}>
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </article>
  );
}
