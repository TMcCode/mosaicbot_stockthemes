"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CommentaryNote } from "@/components/CommentaryNote";
import {
  commentaryItemsForPreview,
  commentaryPreviewHref,
  commentaryPreviewNeedsMore,
  fmtCommentaryDate,
  HOME_COMMENTARY_PREVIEW_CLAMP_LINES,
  HOME_COMMENTARY_PREVIEW_COUNT,
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

  useEffect(() => {
    if (!stockthemesCommentaryLiveEnabled()) {
      return;
    }
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
      });
    return () => {
      cancelled = true;
    };
  }, [initialItems, previewDays]);

  const preview = commentaryItemsForPreview(items, previewDays, HOME_COMMENTARY_PREVIEW_COUNT);
  const hasMore = totalCount > preview.length;

  // Hide the whole block when empty — never show admin publish instructions publicly.
  if (preview.length === 0) {
    return null;
  }

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
        ) : (
          <Link href="/commentary" className={styles.seeAll}>
            See all
          </Link>
        )}
      </div>
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
              <div className={styles.noteWrap}>
                <CommentaryNote
                  note={item.note}
                  entryType={item.entry_type}
                  compact
                  clampLines={HOME_COMMENTARY_PREVIEW_CLAMP_LINES}
                />
              </div>
              {commentaryPreviewNeedsMore(item.note) ? (
                <p className={styles.readMoreRow}>
                  <Link href={commentaryPreviewHref(item.date)} className={styles.readMore}>
                    Read full note
                  </Link>
                </p>
              ) : null}
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
    </section>
  );
}
