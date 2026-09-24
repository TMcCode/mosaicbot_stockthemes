import Link from "next/link";

import type { NewsletterPostV0 } from "@/types/newsletter_posts.v0";

import styles from "./HomeNewsletterPosts.module.css";

/** Home strip — pairs left/right; full archive on `/desk`. */
export const HOME_NEWSLETTER_PREVIEW_COUNT = 6;

export function fmtNewsletterPostDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function newsletterSourceLabel(p: NewsletterPostV0): string {
  return (
    p.source_label ||
    (p.source === "beehiiv" ? "Field of Themes" : "Alt Data Observer")
  );
}

type Props = {
  posts: NewsletterPostV0[];
  maxCards?: number;
  /** Home: View all → /desk. Archive page: hide that link. */
  showViewAll?: boolean;
  /** When false, skip the section h2 (used on `/desk` which has its own page title). */
  showHeading?: boolean;
};

export function HomeNewsletterPosts({
  posts,
  maxCards = HOME_NEWSLETTER_PREVIEW_COUNT,
  showViewAll = true,
  showHeading = true,
}: Props) {
  const cards = posts.slice(0, maxCards);
  if (cards.length === 0) return null;

  return (
    <section
      className={`${styles.section} ${showHeading ? "" : styles.sectionFlush}`}
      aria-labelledby={showHeading ? "home-newsletter-posts-heading" : undefined}
      aria-label={showHeading ? undefined : "Desk posts"}
    >
      <div className={styles.header}>
        {showHeading ? (
          <h2 id="home-newsletter-posts-heading">From the desk</h2>
        ) : (
          <span className={styles.headerSpacer} aria-hidden="true" />
        )}
        <div className={styles.links}>
          <a
            href="https://field-of-themes.beehiiv.com"
            className={styles.extLink}
            target="_blank"
            rel="noopener noreferrer"
            title="Longer essays that dig into history and connect it back to today’s themes."
          >
            Field of Themes
          </a>
          <span className={styles.sep} aria-hidden="true">
            ·
          </span>
          <a
            href="https://altadataobserver.substack.com"
            className={styles.extLink}
            target="_blank"
            rel="noopener noreferrer"
            title="Alt-data charts that surface theme inflection points before they show up in the tape."
          >
            Alt Data Observer
          </a>
          {showViewAll ? (
            <>
              <span className={styles.sep} aria-hidden="true">
                ·
              </span>
              <Link href="/desk" className={styles.viewAll}>
                View all →
              </Link>
            </>
          ) : null}
        </div>
      </div>
      <ul className={styles.grid}>
        {cards.map((p) => {
          const dateLabel = fmtNewsletterPostDate(p.published_at);
          const source = newsletterSourceLabel(p);
          const preview = (p.subtitle || "").trim();
          const img = String(p.image_url || "").trim();
          return (
            <li key={p.id} className={styles.cardItem}>
              <a
                href={p.url}
                className={styles.card}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div
                  className={`${styles.media} ${img ? "" : styles.mediaFallback}`}
                  data-source={p.source}
                >
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element -- external Substack/Beehiiv CDN
                    <img
                      src={img}
                      alt=""
                      className={styles.thumb}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className={styles.mediaLabel}>{source}</span>
                  )}
                </div>
                <div className={styles.body}>
                  <span className={styles.meta}>
                    <span className={styles.source}>{source}</span>
                    {dateLabel ? (
                      <>
                        <span className={styles.dot} aria-hidden="true">
                          ·
                        </span>
                        <time dateTime={p.published_at || undefined}>{dateLabel}</time>
                      </>
                    ) : null}
                  </span>
                  <span className={styles.title}>{p.title}</span>
                  {preview ? <span className={styles.preview}>{preview}</span> : null}
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
