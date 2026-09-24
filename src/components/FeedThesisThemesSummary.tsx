import Link from "next/link";

import type { ManifestHomeFeedEventV0, ManifestHomeFeedThesisThemeV0 } from "@/types/manifest.v0";

import styles from "@/app/page.module.css";

type Props = {
  evt: ManifestHomeFeedEventV0;
  className?: string;
  /** When set, hide a single theme line that just repeats this title. */
  hideIfMatchesTitle?: string;
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

function namesMatchForHide(
  themeName: string,
  hideIfMatchesTitle?: string,
): boolean {
  const name = String(themeName || "").trim().toLowerCase();
  const match = String(hideIfMatchesTitle || "").trim().toLowerCase();
  if (!name || !match) return false;
  if (name === match) return true;
  // Card title may be the subtheme only ("Tires & Wheels") while thesis
  // themes still use the full name ("Auto Components '25: Tires & Wheels").
  if (name.endsWith(`: ${match}`) || name.endsWith(match)) return true;
  return false;
}

function summaryRepeatsTitle(summary: string, hideIfMatchesTitle?: string): boolean {
  const m = /^themes:\s*(.+)$/i.exec(summary.trim());
  if (!m) return false;
  return namesMatchForHide(String(m[1] || ""), hideIfMatchesTitle);
}

/** Gray thesis-theme line with links when slugs are available. */
export function FeedThesisThemesSummary({ evt, className, hideIfMatchesTitle }: Props) {
  const summaryClass = className ?? styles.feedSummary;
  const themes = evt.thesis_themes?.filter((t) => String(t.name || "").trim()) ?? [];
  const moreCount = Number.isFinite(evt.thesis_themes_more_count)
    ? Math.max(0, Number(evt.thesis_themes_more_count))
    : 0;

  if (themes.length) {
    if (
      hideIfMatchesTitle &&
      themes.length === 1 &&
      moreCount === 0 &&
      namesMatchForHide(String(themes[0]?.name || ""), hideIfMatchesTitle)
    ) {
      return null;
    }
    return renderThemeLinks(themes, moreCount, summaryClass);
  }

  const summary = String(evt.summary || "").trim();
  if (summary) {
    if (summaryRepeatsTitle(summary, hideIfMatchesTitle)) return null;
    return <span className={summaryClass}>{summary}</span>;
  }

  return null;
}
