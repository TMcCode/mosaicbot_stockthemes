import Link from "next/link";
import type { Metadata } from "next";

import { CommentaryNote } from "@/components/CommentaryNote";
import { fmtCommentaryDate } from "@/lib/commentaryDisplay";
import { loadHomeCommentary } from "@/lib/loadHomeCommentary";
import { buildPageMetadata } from "@/lib/seoMetadata";

import styles from "./page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Market commentary",
  description: "Recent market and theme commentary from the stockthemes team.",
  path: "/commentary",
});

export default async function CommentaryPage() {
  const loaded = await loadHomeCommentary();
  const items = loaded?.commentary.items ?? [];
  const listDays = loaded?.commentary.list_days ?? 90;

  return (
    <div className={`st-surface ${styles.page}`}>
      <main className={styles.main}>
        <p className={styles.backLink}>
          <Link href="/">Back to home</Link>
        </p>
        <h1>Market commentary</h1>
        <p className={styles.subtitle}>
          Notes from our commentary feed
          {listDays > 0 ? ` (last ${listDays} days)` : ""}.
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
      </main>
    </div>
  );
}
