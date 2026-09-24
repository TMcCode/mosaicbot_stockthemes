import type { NewsletterPostV0 } from "@/types/newsletter_posts.v0";

import styles from "./HomeNewsletterPosts.module.css";

const HOME_NEWSLETTER_PREVIEW_COUNT = 8;

function fmtPostDate(iso: string | null | undefined): string {
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

type Props = {
  posts: NewsletterPostV0[];
  maxRows?: number;
};

export function HomeNewsletterPosts({
  posts,
  maxRows = HOME_NEWSLETTER_PREVIEW_COUNT,
}: Props) {
  const rows = posts.slice(0, maxRows);
  if (rows.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="home-newsletter-posts-heading">
      <div className={styles.header}>
        <h2 id="home-newsletter-posts-heading">From the desk</h2>
        <div className={styles.links}>
          <a
            href="https://field-of-themes.beehiiv.com"
            className={styles.extLink}
            target="_blank"
            rel="noopener noreferrer"
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
          >
            Alt Data Observer
          </a>
        </div>
      </div>
      <ul className={styles.list}>
        {rows.map((p) => {
          const dateLabel = fmtPostDate(p.published_at);
          const source =
            p.source_label ||
            (p.source === "beehiiv" ? "Field of Themes" : "Alt Data Observer");
          const preview = (p.subtitle || "").trim();
          return (
            <li key={p.id} className={styles.row}>
              <div className={styles.main}>
                <a
                  href={p.url}
                  className={styles.title}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {p.title}
                </a>
                {preview ? <p className={styles.preview}>{preview}</p> : null}
              </div>
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
            </li>
          );
        })}
      </ul>
    </section>
  );
}
