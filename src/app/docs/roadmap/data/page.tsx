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
      <p className={styles.introCopy}>
        Pillar 1 in order: what we want to add, roughly when subscriber funding unlocks it, and why
        that lane comes before the next. Items mirror the public MosaicBot roadmap config.
      </p>

      {ROADMAP_DATA_LANES.map((lane, laneIdx) => {
        const items = lane.itemIds
          .map((id) => byId.get(id))
          .filter((item): item is NonNullable<typeof item> => Boolean(item));
        for (const item of items) used.add(item.id);

        return (
          <section
            key={lane.id}
            id={lane.id}
            className={`${styles.aboutProse} ${styles.aboutBasketCard}`}
          >
            <h2>
              <span className={docsStyles.laneIndex}>{String(laneIdx + 1).padStart(2, "0")}</span>{" "}
              {lane.title}
            </h2>
            <p className={styles.introCopy}>{lane.why}</p>
            {items.length ? (
              <ol className={docsStyles.roadmapList}>
                {items.map((item) => {
                  const need = fmtSubscriberNeed(item.subscribers_required);
                  return (
                    <li key={item.id} className={docsStyles.roadmapItem}>
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
            ) : (
              <p className={styles.introCopy}>No items in this lane for the current bake.</p>
            )}
          </section>
        );
      })}

      {(() => {
        const leftover = (payload?.items || []).filter((item) => item.id && !used.has(item.id));
        if (!leftover.length) return null;
        return (
          <section className={`${styles.aboutProse} ${styles.aboutBasketCard}`}>
            <h2>Other milestones</h2>
            <ol className={docsStyles.roadmapList}>
              {leftover.map((item) => {
                const need = fmtSubscriberNeed(item.subscribers_required);
                return (
                  <li key={item.id} className={docsStyles.roadmapItem}>
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
