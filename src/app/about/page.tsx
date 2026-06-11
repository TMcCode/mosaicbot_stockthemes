import type { Metadata } from "next";
import Link from "next/link";

import { PageSurface } from "@/components/PageSurface";
import styles from "../page.module.css";
import { ABOUT_VISION_DISCLAIMER, ABOUT_VISION_PARAGRAPHS } from "@/lib/aboutVisionCopy";
import { HELLO_EMAIL, mailtoHref, SUPPORT_EMAIL } from "@/lib/contactEmails";
import {
  ABOUT_FOUNDER_FEEDBACK,
  ABOUT_FOUNDER_NEWSLETTER_AFTER_LINK,
  DEFAULT_HOME_INTRO,
} from "@/lib/aboutFounderCopy";
import { SITE_PRODUCT_SUMMARY } from "@/lib/homeSiteCopy";
import { getWebsiteContentCached } from "@/lib/getWebsiteContentCached";
import { buildPageMetadata } from "@/lib/seoMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "About",
  description:
    "Background, product vision, methodology, and theme basket definitions for stockthemes.ai.",
  path: "/about",
});

export default async function AboutPage() {
  const content = await getWebsiteContentCached();
  // Founder intro is versioned in-repo (aboutFounderCopy.ts), not website_content on R2.
  const introParagraphs = DEFAULT_HOME_INTRO
    .split(/\n\s*\n/g)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
  const themeBasketIntro = (content?.theme_basket_intro || "").trim() || SITE_PRODUCT_SUMMARY;

  const renderIntroParagraph = (p: string, i: number) => {
    const email = HELLO_EMAIL;
    if (!p.includes(email)) {
      return (
        <p key={`about-${i}`} className={styles.introCopy}>
          {p}
        </p>
      );
    }
    const parts = p.split(email);
    return (
      <p key={`about-${i}`} className={styles.introCopy}>
        {parts.map((part, idx) => (
          <span key={`about-${i}-${idx}`}>
            {idx > 0 ? (
              <a href={`mailto:${email}`} style={{ fontWeight: 600 }}>
                {email}
              </a>
            ) : null}
            {part}
          </span>
        ))}
      </p>
    );
  };

  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>About</p>
          <h1>About stockthemes.ai</h1>
          <div
            className={`${styles.introCopyWrap} ${styles.aboutProse} ${styles.aboutLead} ${styles.aboutBasketCard}`}
          >
            <h2 id="about-founder-note">Why we built stockthemes.ai</h2>
            {introParagraphs.map((p, i) => renderIntroParagraph(p, i))}
            <p className={styles.introCopy}>{ABOUT_FOUNDER_FEEDBACK}</p>
            <p className={styles.introCopy}>
              Join the Den of Themes newsletter{" "}
              <Link href="/#newsletter-signup">at the bottom of the page</Link>
              {ABOUT_FOUNDER_NEWSLETTER_AFTER_LINK}
            </p>
          </div>
          <section
            className={`${styles.aboutProse} ${styles.aboutBasketCard}`}
            aria-labelledby="what-is-theme-basket"
          >
            <h2 id="what-is-theme-basket">What is a theme basket?</h2>
            <p className={styles.introCopy}>
              {themeBasketIntro}
            </p>
            <p className={styles.introCopy}>
              <strong>The form is three layers:</strong> Groups, themes, and constituents. A Group is
              the macro umbrella—the big idea (for example, Space Supply Chain). Themes are the
              specific angles inside it (launch services, satellite components, geospatial
              intelligence). Each theme page is the basket itself: public tickers, weights,
              performance, and a changelog when holdings change. Browse groups to orient; open a theme
              when you want the full list of names tied to a narrative.
            </p>
            <p className={styles.introCopy}>
              Baskets are built by hand after extensive research—not auto-generated from a prompt. We
              review company filings, earnings commentary, product roadmaps, and initiative-level
              signals to map which public companies are actually exposed to each theme. General-purpose
              LLM lists often miss this: non-public names, stale narratives, or exposure that no
              longer matches what companies are doing today.
            </p>
            <p className={styles.introCopy}>
              Missing a narrative or think a basket needs updating? Use our{" "}
              <Link href="/account/suggest">suggestion form</Link> to propose a new group, a new theme,
              or edits to an existing basket (sign-in required). We review every submission.
            </p>
            <p className={styles.introCopy}>
              For a clinical breakdown of construction rules, weights, return calculations, and refresh
              cadence, see the{" "}
              <Link href="/about/methodology">
                methodology page
              </Link>
              .
            </p>
          </section>
          <section
            className={`${styles.aboutProse} ${styles.aboutBasketCard}`}
            aria-labelledby="about-vision"
          >
            <h2 id="about-vision">Vision</h2>
            {ABOUT_VISION_PARAGRAPHS.map((p, i) => (
              <p key={`vision-${i}`} className={styles.introCopy}>
                {p}
              </p>
            ))}
            <p className={styles.introCopy}>
              Subscriber support on the MosaicBot roadmap funds these data layers. If you want to
              weigh in on what ships next, use the{" "}
              <Link href="/contact">contact page</Link> or the{" "}
              <Link href="/#newsletter-signup">Den of Themes newsletter</Link>.
            </p>
            <p className={`${styles.introCopy} ${styles.aboutVisionDisclaimer}`}>
              {ABOUT_VISION_DISCLAIMER}
            </p>
          </section>
          <p className={styles.introCopy}>
            Questions or feedback? See our <Link href="/contact">contact page</Link>.
          </p>
          <p>
            <Link href="/" style={{ fontWeight: 500 }}>
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </PageSurface>
  );
}
