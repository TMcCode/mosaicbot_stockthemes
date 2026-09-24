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
          const tags = Array.isArray(item.tags) ? item.tags : [];
          const primaryTag =
            tags[0]?.label?.trim() || String(item.ticker_theme || "").trim();
          const primarySlug =
            (tags[0]?.kind === "theme" ? tags[0]?.slug : null) ||
            String(item.theme_slug || "").trim();
          const extraTags = Math.max(0, tags.length - 1);
          const imageUrls = (
            Array.isArray(item.image_urls) && item.image_urls.length
              ? item.image_urls
              : item.image_url
                ? [item.image_url]
                : []
          )
            .map((u) => String(u || "").trim())
            .filter(Boolean)
            .slice(0, 4);
          const linkUrl = String(item.link_url || "").trim();
          const linkTitle = String(item.link_title || "").trim();
          const isNightly = item.entry_type === "nightly";
          const note = String(item.note || "").trim();
          return (
            <li key={item.id || `${item.date}-${idx}`} className={styles.card}>
              <div className={styles.cardMeta}>
                <time className={styles.date} dateTime={item.date}>
                  {fmtCommentaryDate(item.date)}
                </time>
                {isNightly ? <span className={styles.badge}>Nightly</span> : null}
                {primaryTag ? (
                  primarySlug ? (
                    <Link href={`/themes/${primarySlug}`} className={styles.tag}>
                      {primaryTag}
                    </Link>
                  ) : (
                    <span className={styles.tagMuted}>{primaryTag}</span>
                  )
                ) : null}
                {extraTags > 0 ? <span className={styles.tagMuted}>+{extraTags}</span> : null}
              </div>
              {imageUrls.length > 0 ? (
                <div
                  className={`${styles.photoGrid} ${
                    imageUrls.length === 1
                      ? styles.count1
                      : imageUrls.length === 2
                        ? styles.count2
                        : imageUrls.length === 3
                          ? styles.count3
                          : styles.count4
                  }`}
                >
                  {imageUrls.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.photoCell}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" loading="lazy" decoding="async" />
                    </a>
                  ))}
                </div>
              ) : null}
              {note ? (
                <div className={styles.noteWrap}>
                  <CommentaryNote
                    note={note}
                    entryType={item.entry_type}
                    compact
                    clampLines={HOME_COMMENTARY_PREVIEW_CLAMP_LINES}
                  />
                </div>
              ) : null}
              {linkUrl ? (
                <p className={styles.linkRow}>
                  <a href={linkUrl} target="_blank" rel="noopener noreferrer" className={styles.extLink}>
                    {linkTitle || linkUrl}
                  </a>
                </p>
              ) : null}
              {note && commentaryPreviewNeedsMore(note) ? (
                <p className={styles.readMoreRow}>
                  <Link href={commentaryPreviewHref(item.date)} className={styles.readMore}>
                    Read full note
                  </Link>
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
