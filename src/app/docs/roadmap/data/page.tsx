import type { Metadata } from "next";
import Link from "next/link";

import {
  fmtSubscriberNeed,
  loadDocsRoadmap,
  roadmapItemMap,
} from "@/lib/loadDocsRoadmap";
import { ROADMAP_DATA_LANES, ROADMAP_DISCLAIMER } from "@/lib/roadmapStory";
import { buildPageMetadata } from "@/lib/seoMetadata";

import docsStyles from "../../docs.module.css";
import styles from "../../../page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Data roadmap",
  description:
    "Ordered queue of datasets and capacity for stockthemes.ai — news, transcripts, theme backdrops, and Blast Radius matrices.",
  path: "/docs/roadmap/data",
});

/** Static subpage — lanes + baked milestone items from MosaicBot roadmap config. */
export default async function DocsRoadmapDataPage() {
  const payload = await loadDocsRoadmap();
  const byId = roadmapItemMap(payload);
  const used = new Set<string>();

  return (
    <article className={docsStyles.article}>
      <p className={styles.eyebrow}>
        <Link href="/docs/roadmap">Roadmap</Link>
        {" / "}
        Data
      </p>
      <h1 className={styles.heroTitle}>Data queue</h1>
      <p className={docsStyles.queueLead}>
        This is the ordered queue of datasets and capacity we fund as paid subscribers grow—what
        unlocks next, and why that lane comes before the one after it.
      </p>
      <p className={docsStyles.queueLead}>
        Data providers: if you want your product in front of investors who live in themes and
        catalysts,{" "}
        <Link href="/contact">let&apos;s talk</Link>. I can be flexible on what gets shared—sample
        series, limited tickers, delayed prints, or a branded panel—and placement here is useful
        marketing: your dataset is shown to the investors who care about the narratives you can
        help with.
      </p>

      {ROADMAP_DATA_LANES.map((lane, laneIdx) => {
        const items = lane.itemIds
          .map((id) => byId.get(id))
          .filter((item): item is NonNullable<typeof item> => Boolean(item));
        for (const item of items) used.add(item.id);

        return (
          <details
            key={lane.id}
            id={lane.id}
            className={`${styles.aboutProse} ${styles.aboutBasketCard} ${docsStyles.laneFold}`}
            {...(laneIdx < 4 ? { open: true } : {})}
          >
            <summary className={docsStyles.laneSummary}>
              <h2 className={docsStyles.laneSummaryTitle}>
                <span className={docsStyles.laneIndex}>
                  {String(laneIdx + 1).padStart(2, "0")}
                </span>{" "}
                {lane.title}
              </h2>
              <span className={docsStyles.laneSummaryMeta}>
                {items.length} item{items.length === 1 ? "" : "s"}
              </span>
            </summary>
            <div className={docsStyles.laneFoldBody}>
              <p className={styles.introCopy}>{lane.why}</p>
              {items.length ? (
                <ol className={docsStyles.roadmapList}>
                  {items.map((item) => {
                    const need = fmtSubscriberNeed(item.subscribers_required);
                    const doneClass = item.done ? ` ${docsStyles.roadmapItemDone}` : "";
                    return (
                      <li key={item.id} className={`${docsStyles.roadmapItem}${doneClass}`}>
                        <div className={docsStyles.roadmapMeta}>
                          <span className={docsStyles.roadmapCategory}>
                            {item.category_label}
                          </span>
                          {need ? (
                            <span className={docsStyles.roadmapNeed}>{need}</span>
                          ) : null}
                        </div>
                        <h3 className={docsStyles.roadmapTitle}>{item.title}</h3>
                        {item.description ? (
                          <p className={docsStyles.roadmapBody}>{item.description}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className={styles.introCopy}>No items in this lane for the current bake.</p>
              )}
            </div>
          </details>
        );
      })}

      {(() => {
        const leftover = (payload?.items || []).filter(
          (item) => item.id && !item.hidden && !used.has(item.id),
        );
        if (!leftover.length) return null;
        return (
          <section className={`${styles.aboutProse} ${styles.aboutBasketCard}`}>
            <h2>Other milestones</h2>
            <ol className={docsStyles.roadmapList}>
              {              leftover.map((item) => {
                const need = fmtSubscriberNeed(item.subscribers_required);
                const doneClass = item.done ? ` ${docsStyles.roadmapItemDone}` : "";
                return (
                  <li key={item.id} className={`${docsStyles.roadmapItem}${doneClass}`}>
                    <div className={docsStyles.roadmapMeta}>
                      <span className={docsStyles.roadmapCategory}>{item.category_label}</span>
                      {need ? <span className={docsStyles.roadmapNeed}>{need}</span> : null}
                    </div>
                    <h3 className={docsStyles.roadmapTitle}>{item.title}</h3>
                    {item.description ? (
                      <p className={docsStyles.roadmapBody}>{item.description}</p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })()}

      <p className={`${styles.introCopy} ${styles.aboutVisionDisclaimer}`}>{ROADMAP_DISCLAIMER}</p>
      <p className={styles.introCopy}>
        <Link href="/docs/roadmap">← Back to roadmap</Link>
        {" · "}
        <Link href="/contact">Contact</Link>
      </p>
    </article>
  );
}
