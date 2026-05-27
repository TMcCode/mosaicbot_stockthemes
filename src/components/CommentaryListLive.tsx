"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CommentaryNote } from "@/components/CommentaryNote";
import { fmtCommentaryDate } from "@/lib/commentaryDisplay";
import {
  fetchHomeCommentaryLive,
  stockthemesCommentaryLiveEnabled,
} from "@/lib/commentaryLiveFetch";
import type { HomeCommentaryItemV0 } from "@/types/home_commentary.v0";

import styles from "@/app/commentary/page.module.css";

type Props = {
  initialItems: HomeCommentaryItemV0[];
  initialListDays: number;
};

export function CommentaryListLive({ initialItems, initialListDays }: Props) {
  const liveEnabled = stockthemesCommentaryLiveEnabled();
  const [items, setItems] = useState(initialItems);
  const [listDays, setListDays] = useState(initialListDays);
  const [loading, setLoading] = useState(liveEnabled);

  useEffect(() => {
    if (!liveEnabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void fetchHomeCommentaryLive()
      .then((data) => {
        if (cancelled || !data) return;
        setItems(data.items);
        if (Number(data.list_days) > 0) {
          setListDays(Number(data.list_days));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems(initialItems);
          setListDays(initialListDays);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialItems, initialListDays, liveEnabled]);

  return (
    <>
      <p className={styles.subtitle}>
        Notes from our commentary feed
        {listDays > 0 ? ` (last ${listDays} days)` : ""}.
        {loading ? " Updating…" : null}
      </p>
      {items.length === 0 ? (
        <p className={styles.empty}>No commentary published yet.</p>
      ) : (
        <div className={styles.list}>
          {items.map((item, idx) => {
            const tag = String(item.ticker_theme || "").trim();
            const slug = String(item.theme_slug || "").trim();
            const imageUrl = String(item.image_url || "").trim();
            const isNightly = item.entry_type === "nightly";
            return (
              <article key={`${item.date}-${idx}`} className={styles.item}>
                <header className={styles.itemHeader}>
                  <time dateTime={item.date}>{fmtCommentaryDate(item.date)}</time>
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
                </header>
                <CommentaryNote note={item.note} entryType={item.entry_type} />
                {imageUrl ? (
                  <p className={styles.imageBlock}>
                    <a href={imageUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={imageUrl}
                        alt=""
                        className={styles.image}
                        loading="lazy"
                        decoding="async"
                      />
                    </a>
                    <a
                      href={imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.imageOpen}
                    >
                      Open full image
                    </a>
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
