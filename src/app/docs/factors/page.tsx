import type { Metadata } from "next";
import Link from "next/link";

import { DocsFactorMarketChart } from "@/components/DocsFactorMarketChart";
import { buildPageMetadata } from "@/lib/seoMetadata";

import docsStyles from "../docs.module.css";
import styles from "../../page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Factors",
  description:
    "Why factor exposures matter for thematic equities — how stockthemes.ai scores themes vs market, style, and narrative factors.",
  path: "/docs/factors",
});

/**
 * Static docs page — no R2 / client charts. Link out to `/factors` for live tools.
 */
export default function DocsFactorsPage() {
  return (
    <article className={docsStyles.article}>
      <p className={styles.eyebrow}>Factors</p>
      <h1 className={styles.heroTitle}>Why factors matter</h1>

      <section
        className={`${styles.introCopyWrap} ${styles.aboutProse} ${styles.aboutLead} ${styles.aboutBasketCard}`}
      >
        <h2 id="overview">Overview</h2>
        <p className={styles.introCopy}>
          Theme returns are never “pure narrative.” When a theme jumps or sells off, part of that move
          is usually shared with the broad market, growth vs value, rates, credit risk appetite, or
          other common drivers. Factor scores help separate those shared forces from behavior that
          looks more specific to the basket—so you can read a move with more context.
        </p>
        <p className={styles.introCopy}>
          On stockthemes.ai, every theme gets a compact Factor Profile. The{" "}
          <Link href="/factors">Factors</Link> tool lets you compare themes, inspect rankings, and
          chart factor spreads over time.
        </p>
      </section>

      <section className={`${styles.aboutProse} ${styles.aboutBasketCard}`}>
        <h2 id="why-it-matters">Why this matters for themes</h2>
        <p className={styles.introCopy}>
          A theme can rip while the broad market barely moves—if it is tracking something else, like
          the AI / innovation factor (AIQ vs SPY). Same calendar window, different driver: that is
          what factor scores are trying to surface.
        </p>
        <p className={styles.introCopy}>
          Factors don’t replace reading constituents, filings, or news. They answer a narrower
          question: <em>what kind of risk has this theme been behaving like?</em>
        </p>
        <DocsFactorMarketChart />
      </section>

      <section className={`${styles.aboutProse} ${styles.aboutBasketCard}`}>
        <h2 id="what-we-measure">What we measure</h2>
        <p className={styles.introCopy}>
          Each non-sector factor is built from liquid ETF proxies (or a long/short ETF spread). For
          example, market beta tracks SPY; momentum compares MTUM vs SPY; growth/duration compares
          IWF vs IWD; AI / innovation compares AIQ vs SPY. Sector factors use sector ETFs with the
          market effect residualized out.
        </p>
        <p className={styles.introCopy}>
          We then score how each theme’s daily returns line up with those factor series. Scores are
          mapped to a 0–100 scale for readability. Higher means stronger positive exposure to that
          factor; lower means weaker (or inverse) exposure.
        </p>
        <p className={styles.introCopy}>
          Themes are also ranked against the full theme universe for each factor, so “82” comes with
          context like “#28 of ~1,300 themes,” not just an absolute number.
        </p>
      </section>

      <section className={`${styles.aboutProse} ${styles.aboutBasketCard}`}>
        <h2 id="comovement-vs-incremental">Co-movement vs incremental</h2>
        <p className={styles.introCopy}>
          <strong>Co-movement</strong> (standalone) asks: how closely does this theme track the factor
          on its own? It’s the simpler “does it move with AIQ / MTUM / SPY?” read, and it matches the
          factor compare charts on the Factors page.
        </p>
        <p className={styles.introCopy}>
          <strong>Incremental</strong> asks: after we account for overlap with the market, growth,
          sectors, and other factors in the model, how much exposure is still left? Themes often
          co-move with several related factors at once; incremental scores reduce that double-counting.
        </p>
        <p className={styles.introCopy}>
          On theme pages, the Higher / Lower Factor Profile columns are ordered by{" "}
          <em>incremental</em> exposure (and show those scores). The Factors tool can switch between
          co-movement and incremental rankings when you want both views.
        </p>

        <div className={docsStyles.factorCompare} aria-label="Example comparing co-movement and incremental scores">
          <p className={docsStyles.factorCompareTitle}>Example: same theme, two score types</p>
          <p className={docsStyles.factorCompareNote}>
            Illustrative numbers — co-movement can look “high” while incremental is only mid-range once
            overlapping drivers are removed.
          </p>
          <div className={docsStyles.factorCompareRows}>
            <div className={docsStyles.factorCompareRow}>
              <p className={docsStyles.factorCompareLabel}>AI / Innovation</p>
              <div className={docsStyles.factorCompareBars}>
                <div className={docsStyles.factorCompareBarLine}>
                  <span className={docsStyles.factorCompareBarKind}>Co-move</span>
                  <div className={docsStyles.factorCompareTrack}>
                    <div className={docsStyles.factorCompareFill} style={{ width: "82%" }} />
                  </div>
                  <span className={docsStyles.factorCompareScore}>82</span>
                </div>
                <div className={docsStyles.factorCompareBarLine}>
                  <span className={docsStyles.factorCompareBarKind}>Increm.</span>
                  <div className={docsStyles.factorCompareTrack}>
                    <div
                      className={`${docsStyles.factorCompareFill} ${docsStyles.factorCompareFillMuted}`}
                      style={{ width: "41%" }}
                    />
                  </div>
                  <span className={docsStyles.factorCompareScore}>41</span>
                </div>
              </div>
            </div>
            <div className={docsStyles.factorCompareRow}>
              <p className={docsStyles.factorCompareLabel}>Momentum</p>
              <div className={docsStyles.factorCompareBars}>
                <div className={docsStyles.factorCompareBarLine}>
                  <span className={docsStyles.factorCompareBarKind}>Co-move</span>
                  <div className={docsStyles.factorCompareTrack}>
                    <div className={docsStyles.factorCompareFill} style={{ width: "80%" }} />
                  </div>
                  <span className={docsStyles.factorCompareScore}>80</span>
                </div>
                <div className={docsStyles.factorCompareBarLine}>
                  <span className={docsStyles.factorCompareBarKind}>Increm.</span>
                  <div className={docsStyles.factorCompareTrack}>
                    <div className={docsStyles.factorCompareFill} style={{ width: "78%" }} />
                  </div>
                  <span className={docsStyles.factorCompareScore}>78</span>
                </div>
              </div>
            </div>
            <div className={docsStyles.factorCompareRow}>
              <p className={docsStyles.factorCompareLabel}>Quality / Defensive</p>
              <div className={docsStyles.factorCompareBars}>
                <div className={docsStyles.factorCompareBarLine}>
                  <span className={docsStyles.factorCompareBarKind}>Co-move</span>
                  <div className={docsStyles.factorCompareTrack}>
                    <div
                      className={`${docsStyles.factorCompareFill} ${docsStyles.factorCompareFillMuted}`}
                      style={{ width: "32%" }}
                    />
                  </div>
                  <span className={docsStyles.factorCompareScore}>32</span>
                </div>
                <div className={docsStyles.factorCompareBarLine}>
                  <span className={docsStyles.factorCompareBarKind}>Increm.</span>
                  <div className={docsStyles.factorCompareTrack}>
                    <div
                      className={`${docsStyles.factorCompareFill} ${docsStyles.factorCompareFillMuted}`}
                      style={{ width: "29%" }}
                    />
                  </div>
                  <span className={docsStyles.factorCompareScore}>29</span>
                </div>
              </div>
            </div>
          </div>
          <p className={docsStyles.factorCompareCaption}>
            AI / Innovation still co-moves a lot, but much of that is shared with market/growth—so
            incremental drops. Momentum stays high on both. Quality stays low on both. Theme-page
            Higher / Lower follows the incremental column.
          </p>
        </div>
      </section>

      <section className={`${styles.aboutProse} ${styles.aboutBasketCard}`}>
        <h2 id="higher-lower">Higher vs lower exposure on theme pages</h2>
        <p className={styles.introCopy}>
          <strong>Higher exposure</strong> lists the theme’s strongest incremental factor tilts—the
          drivers that still stand out after controls. <strong>Lower exposure</strong> lists the
          weakest incremental tilts—factors the theme is less tied to, or that it has tended to move
          against.
        </p>
        <p className={styles.introCopy}>
          A factor can co-move strongly with a theme and still land in Lower exposure if most of that
          co-movement is already explained by market, growth, or other overlapping factors. That’s
          intentional: the card is answering “what’s distinctive,” not “what correlates in a vacuum.”
        </p>
      </section>

      <section className={`${styles.aboutProse} ${styles.aboutBasketCard}`}>
        <h2 id="sector-signal">Closest sector signal</h2>
        <p className={styles.introCopy}>
          Themes often behave like an industry even when they aren’t a single GICS sector. Closest
          sector signal picks the sector factor the theme tracks most closely (after removing broad
          market overlap), with a score and universe rank.
        </p>
        <p className={styles.introCopy}>
          Wording scales with how extreme that fit is—from a modest match, to a very tight match, to
          the clearest sector fit in the universe when a theme is #1.
        </p>
      </section>

      <section className={`${styles.aboutProse} ${styles.aboutBasketCard}`}>
        <h2 id="factor-families">Factor families we publish</h2>
        <p className={styles.introCopy}>
          <strong>Market &amp; style:</strong> Market beta, momentum, small-cap, growth/duration,
          value/cyclical, quality/defensive, speculative beta, unprofitable growth.
        </p>
        <p className={styles.introCopy}>
          <strong>Macro &amp; rates:</strong> Falling-rate sensitivity, credit risk-on, inflation /
          commodity, strong dollar, oil sensitivity.
        </p>
        <p className={styles.introCopy}>
          <strong>Narrative / risk appetite:</strong> AI / innovation, crypto, retail speculation,
          meme sensitivity.
        </p>
        <p className={styles.introCopy}>
          <strong>Sectors:</strong> Industry ETF residuals vs the market (used for closest-sector
          signal and sector rankings).
        </p>
        <p className={styles.introCopy}>
          Plain-language definitions for each factor also appear as tooltips on Factor Profile rows
          and in the Factors UI.
        </p>
      </section>

      <section className={`${styles.aboutProse} ${styles.aboutBasketCard}`}>
        <h2 id="how-to-use">How to use this</h2>
        <p className={styles.introCopy}>
          Start on a theme page: glance at Higher / Lower and the closest sector line before diving
          into constituents. Ask whether today’s move looks like broad beta, a style factor, or
          something closer to the theme’s own story.
        </p>
        <p className={styles.introCopy}>
          When comparing several themes, open the <Link href="/factors">Factors</Link> page—leaderboards,
          makeup compare, and factor spread charts are built for that workflow.
        </p>
        <p className={styles.introCopy}>
          Treat scores as a lens, not a ranking of “good” vs “bad.” High speculative beta can be
          exactly what you expect for one theme and a warning flag for another.
        </p>
      </section>

      <section className={`${styles.aboutProse} ${styles.aboutBasketCard}`}>
        <h2 id="limitations">Limitations</h2>
        <p className={styles.introCopy}>
          Scores are statistical estimates from recent daily returns. They can be noisy for young
          themes, thin baskets, or periods when factor ETFs themselves are unstable. Confidence can
          be low when the fit is weak—those profiles may be hidden or flagged.
        </p>
        <p className={styles.introCopy}>
          ETF proxies are imperfect stand-ins for economic ideas (especially narrative factors like
          AI or meme risk). Classification of themes remains judgmental; factors don’t prove what a
          company “is.”
        </p>
        <p className={styles.introCopy}>
          Nothing here is investment advice or a forecast. Use factors alongside primary filings,
          earnings, and your own process. See also{" "}
          <Link href="/docs/methodology#limitations">methodology limitations</Link>.
        </p>
      </section>
    </article>
  );
}
