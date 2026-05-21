import type { Metadata } from "next";
import Link from "next/link";

import { PageSurface } from "@/components/PageSurface";
import styles from "../../page.module.css";
import { getWebsiteContentCached } from "@/lib/getWebsiteContentCached";
import { buildPageMetadata } from "@/lib/seoMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Methodology",
  description:
    "How stockthemes.ai constructs theme baskets, assigns weights, calculates performance, and updates constituents.",
  path: "/about/methodology",
});

const DEFAULT_METHODOLOGY_INTRO =
  "This page describes the framework behind stockthemes.ai theme baskets and group-level views. It explains what gets included, how weights are represented, how returns are computed, and how often data can change.";
const DEFAULT_METHODOLOGY_PURPOSE_SCOPE =
  "stockthemes.ai is a thematic intelligence product, not an index fund prospectus, portfolio recommendation, or execution venue. Theme baskets are research groupings of public equities tied to a specific narrative.";
const DEFAULT_METHODOLOGY_THEME_CONSTRUCTION =
  "Themes are manually curated from public companies based on documented business exposure to a specific theme. Inputs include filings, earnings commentary, segment disclosures, product roadmaps, and recurring initiative-level signals.\n\nA company is included when there is durable, evidence-based exposure to the theme narrative. Companies can be removed when exposure becomes immaterial, stale, or contradicted by new disclosures.\n\nGroups are umbrella categories containing related themes. Group-level statistics are derived from the underlying themes and their constituents.";
const DEFAULT_METHODOLOGY_WEIGHTS =
  "Theme detail pages include constituent weights used for exposure context and weighted aggregations. Weights are computed from the current theme constituent set and normalize to 100% within each theme basket.\n\nWeights are representation weights for analytical comparison across names within a theme. They are not trade instructions and are not intended to replicate a live investable product.";
const DEFAULT_METHODOLOGY_PERFORMANCE_CALCULATION =
  "Performance shown across the site is derived from the underlying market data pipeline and normalized to common baselines for comparability. Theme and group pages may show multiple aggregation views (for example average, median, or weighted-average) depending on the endpoint and chart.\n\nReturn windows such as 1D, 10D, MTD, YTD, and period-specific ranges are calculated from the corresponding time-series snapshots used by the ETL process. Historical values can be refreshed if source corrections or late-arriving updates occur.";
const DEFAULT_METHODOLOGY_UPDATE_CADENCE =
  "Constituent membership and metadata are reviewed on an ongoing basis and can update whenever new information materially changes thematic exposure. Market-driven snapshot files refresh on a recurring ETL cadence, including intraday updates during market hours and broader pipeline refresh cycles.\n\nData can be delayed and may be revised. The most recent build timestamp is published in manifest fields such as as_of and optional build identifiers.";
const DEFAULT_METHODOLOGY_LIMITATIONS =
  "Thematic classification requires judgment. Reasonable analysts may disagree on edge cases, especially for diversified businesses with mixed segment exposure.\n\nNothing on stockthemes.ai is investment advice. Use this methodology together with primary filings, earnings materials, and your own risk process before making decisions.";

function toParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/g)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

function renderParagraphs(text: string) {
  return toParagraphs(text).map((p, i) => (
    <p key={`methodology-p-${i}`} className={styles.introCopy}>
      {p}
    </p>
  ));
}

export default async function MethodologyPage() {
  const content = await getWebsiteContentCached();
  const intro = (content?.methodology_intro || "").trim() || DEFAULT_METHODOLOGY_INTRO;
  const purposeScope =
    (content?.methodology_purpose_scope || "").trim() || DEFAULT_METHODOLOGY_PURPOSE_SCOPE;
  const themeConstruction =
    (content?.methodology_theme_construction || "").trim() ||
    DEFAULT_METHODOLOGY_THEME_CONSTRUCTION;
  const weights = (content?.methodology_weights || "").trim() || DEFAULT_METHODOLOGY_WEIGHTS;
  const performanceCalculation =
    (content?.methodology_performance_calculation || "").trim() ||
    DEFAULT_METHODOLOGY_PERFORMANCE_CALCULATION;
  const updateCadence =
    (content?.methodology_update_cadence || "").trim() || DEFAULT_METHODOLOGY_UPDATE_CADENCE;
  const limitations =
    (content?.methodology_limitations || "").trim() || DEFAULT_METHODOLOGY_LIMITATIONS;

  return (
    <PageSurface>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Methodology</p>
          <h1>stockthemes.ai methodology</h1>

          <section className={`${styles.introCopyWrap} ${styles.aboutProse} ${styles.aboutLead} ${styles.aboutBasketCard}`}>
            <h2 id="methodology-purpose">Purpose and scope</h2>
            <p className={styles.introCopy}>{intro}</p>
            {renderParagraphs(purposeScope)}
          </section>

          <section className={`${styles.aboutProse} ${styles.aboutBasketCard}`}>
            <h2 id="theme-construction">How themes are constructed</h2>
            {renderParagraphs(themeConstruction)}
          </section>

          <section className={`${styles.aboutProse} ${styles.aboutBasketCard}`}>
            <h2 id="weights">How weights are assigned</h2>
            {renderParagraphs(weights)}
          </section>

          <section className={`${styles.aboutProse} ${styles.aboutBasketCard}`}>
            <h2 id="performance-calculation">How performance is calculated</h2>
            {renderParagraphs(performanceCalculation)}
          </section>

          <section className={`${styles.aboutProse} ${styles.aboutBasketCard}`}>
            <h2 id="update-cadence">How often baskets are updated</h2>
            {renderParagraphs(updateCadence)}
          </section>

          <section className={`${styles.aboutProse} ${styles.aboutBasketCard}`}>
            <h2 id="limitations">Limitations and caveats</h2>
            {renderParagraphs(limitations)}
          </section>

          <p>
            <Link href="/about" style={{ fontWeight: 500 }}>
              ← Back to about
            </Link>
          </p>
        </div>
      </main>
    </PageSurface>
  );
}
