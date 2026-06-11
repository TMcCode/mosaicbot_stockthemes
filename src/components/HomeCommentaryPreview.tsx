"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CommentaryNote } from "@/components/CommentaryNote";
import {
  commentaryItemsForPreview,
  fmtCommentaryDate,
  HOME_COMMENTARY_PREVIEW_COUNT,
  truncateCommentaryNote,
} from "@/lib/commentaryDisplay";
import {
  fetchHomeCommentaryLive,
  stockthemesCommentaryLiveEnabled,
} from "@/lib/commentaryLiveFetch";
import type { HomeCommentaryItemV0 } from "@/types/home_commentary.v0";

import styles from "./HomeCommentaryPreview.module.css";

type Props = {
  /** SSR fallback when bundle missing or before client fetch completes */
  initialItems?: HomeCommentaryItemV0[];
  previewDays?: number;
};

export function HomeCommentaryPreview({ initialItems = [], previewDays = 7 }: Props) {
  const [items, setItems] = useState<HomeCommentaryItemV0[]>(initialItems);
  const [totalCount, setTotalCount] = useState(initialItems.length);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stockthemesCommentaryLiveEnabled()) {
      return;
    }
    setLoading(true);
    let cancelled = false;
    void fetchHomeCommentaryLive()
      .then((data) => {
        if (cancelled || !data) return;
        const all = data.items;
        const days = Number(data.preview_days) > 0 ? Number(data.preview_days) : previewDays;
        setTotalCount(all.length);
        setItems(commentaryItemsForPreview(all, days, HOME_COMMENTARY_PREVIEW_COUNT));
      })
      .catch(() => {
        if (!cancelled && initialItems.length) {
          setItems(
            commentaryItemsForPreview(initialItems, previewDays, HOME_COMMENTARY_PREVIEW_COUNT),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialItems, previewDays]);

  const preview = commentaryItemsForPreview(items, previewDays, HOME_COMMENTARY_PREVIEW_COUNT);
  const hasMore = totalCount > preview.length;

  return (
    <section
      id="home-commentary"
      className={styles.section}
      aria-labelledby="home-commentary-heading"
    >
      <div className={styles.header}>
        <h2 id="home-commentary-heading">Recent commentary</h2>
        {hasMore ? (
          <Link href="/commentary" className={styles.seeAll}>
            See all commentary
          </Link>
        ) : preview.length > 0 ? (
          <Link href="/commentary" className={styles.seeAll}>
            See all
          </Link>
        ) : null}
      </div>
      {loading && preview.length === 0 ? (
        <p className={styles.loading}>Loading commentary…</p>
      ) : preview.length === 0 ? (
        <p className={styles.empty}>
          No recent commentary on the feed yet. New notes appear here after they are published from the
          admin dashboard.
        </p>
      ) : (
        <ul className={styles.grid}>
          {preview.map((item, idx) => {
            const tag = String(item.ticker_theme || "").trim();
            const slug = String(item.theme_slug || "").trim();
            const imageUrl = String(item.image_url || "").trim();
            const isNightly = item.entry_type === "nightly";
            return (
              <li key={`${item.date}-${idx}`} className={styles.card}>
                <div className={styles.cardMeta}>
                  <time className={styles.date} dateTime={item.date}>
                    {fmtCommentaryDate(item.date)}
                  </time>
                  {isNightly ? <span className={styles.badge}>Nightly</span> : null}
                  {tag ? (
                    slug ? (
                      <Link href={`/themes/${slug}`} className={styles.tag}>
                        {tag}
                      </Link>
                    ) : (
                      <span className={styles.tagMuted}>{tag}</span>
                    )
                  ) : null}
                </div>
                <CommentaryNote
                  note={truncateCommentaryNote(item.note)}
                  entryType={item.entry_type}
                  clampLines={6}
                />
                {imageUrl ? (
                  <p className={styles.imageRow}>
                    <a href={imageUrl} target="_blank" rel="noopener noreferrer" className={styles.imageLink}>
                      View photo
                    </a>
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
