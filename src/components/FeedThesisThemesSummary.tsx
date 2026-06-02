import Link from "next/link";

import type { ManifestHomeFeedEventV0, ManifestHomeFeedThesisThemeV0 } from "@/types/manifest.v0";

import styles from "@/app/page.module.css";

type Props = {
  evt: ManifestHomeFeedEventV0;
  className?: string;
};

function renderThemeLinks(
  themes: ManifestHomeFeedThesisThemeV0[],
  moreCount: number,
  className: string,
) {
  return (
    <span className={className}>
      <span className={styles.feedThemesLabel}>Themes: </span>
      {themes.map((t, i) => {
        const slug = String(t.slug || "").trim();
        const name = String(t.name || "").trim();
        if (!name) return null;
        return (
          <span key={`${slug || name}-${i}`}>
            {i > 0 ? ", " : null}
            {slug ? (
              <Link href={`/themes/${encodeURIComponent(slug)}`} prefetch={false} className={styles.feedThemeLink}>
                {name}
              </Link>
            ) : (
              <span>{name}</span>
            )}
          </span>
        );
      })}
      {moreCount > 0 ? (
        <span className={styles.feedThemesMore}>{` (+${moreCount} more)`}</span>
      ) : null}
    </span>
  );
}

/** Gray thesis-theme line with links when slugs are available. */
export function FeedThesisThemesSummary({ evt, className }: Props) {
  const summaryClass = className ?? styles.feedSummary;
  const themes = evt.thesis_themes?.filter((t) => String(t.name || "").trim()) ?? [];
  const moreCount = Number.isFinite(evt.thesis_themes_more_count)
    ? Math.max(0, Number(evt.thesis_themes_more_count))
    : 0;

  if (themes.length) {
    return renderThemeLinks(themes, moreCount, summaryClass);
  }

  const summary = String(evt.summary || "").trim();
  if (summary) {
    return <span className={summaryClass}>{summary}</span>;
  }

  return null;
}
