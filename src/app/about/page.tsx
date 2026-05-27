import type { Metadata } from "next";
import Link from "next/link";

import { PageSurface } from "@/components/PageSurface";
import styles from "../page.module.css";
import { HELLO_EMAIL, mailtoHref, SUPPORT_EMAIL } from "@/lib/contactEmails";
import { getWebsiteContentCached } from "@/lib/getWebsiteContentCached";
import { buildPageMetadata } from "@/lib/seoMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "About",
  description: "Background, methodology, and theme basket definitions for stockthemes.ai.",
  path: "/about",
});

export default async function AboutPage() {
  const content = await getWebsiteContentCached();
  const homeIntro =
    (content?.home_intro || "").trim() ||
    "Stockthemes.ai helps you discover equity themes and groups quickly. Start with groups to find macro narratives, then drill into themes for constituent-level details.";
  const introParagraphs = homeIntro
    .split(/\n\s*\n/g)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
  const themeBasketIntro =
    (content?.theme_basket_intro || "").trim() ||
    "A theme basket is a curated set of public stocks connected by a common narrative, such as AI infrastructure, obesity treatment, or grid modernization.";

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
            <h2 id="about-founder-note">Why I built stockthemes.ai</h2>
            {(introParagraphs.length ? introParagraphs : [homeIntro]).map((p, i) =>
              renderIntroParagraph(p, i),
            )}
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
              A Group is the higher-level umbrella, and each Group contains multiple related themes.
              Think of the Group as the big idea (for example, Space Supply Chain), and each theme as
              a specific angle within it (for example, launch services, satellite components, or
              geospatial intelligence).
            </p>
            <p className={styles.introCopy}>
              At stockthemes.ai, these baskets are built by hand after extensive research, not
              auto-generated from a prompt. I review company filings, earnings commentary, product
              roadmaps, and initiative-level signals to map which public companies are actually exposed
              to each theme.
            </p>
            <p className={styles.introCopy}>
              General-purpose LLM outputs often miss this nuance: they can include non-public
              companies, stale narratives, or outdated initiative exposure. This project is designed to
              stay closer to what is investable now and what is changing in real markets.
            </p>
            <p className={styles.introCopy}>
              stockthemes.ai tracks each basket&apos;s constituents and performance over time so you can
              compare themes, understand exposure, and follow how membership changes as the narrative
              evolves.
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
