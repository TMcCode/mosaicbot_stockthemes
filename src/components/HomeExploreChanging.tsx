import Link from "next/link";

import { FeedEventCard } from "@/components/FeedEventCard";
import type { FeedThemeMeta } from "@/components/FeedEventCardBody";
import type { FeedFlipperSlot } from "@/lib/collapseFeedGroupFlippers";
import { formatFeedDateShort } from "@/lib/formatFeedDate";
import type { GroupExplore } from "@/lib/pickExploreGroups";
import { rotationThemeLabelSuffix } from "@/lib/rotationThemeLabel";
import { trendingReturnCardGradientStyle } from "@/lib/trendingPerfHeat";

import styles from "./HomeExploreChanging.module.css";

export type { GroupExplore } from "@/lib/pickExploreGroups";
export { pickExploreGroups } from "@/lib/pickExploreGroups";

type Props = {
  groups: GroupExplore[];
  feedSlots: FeedFlipperSlot[];
  tickersByThemeSlug?: Record<string, { tickers: string[]; more: number }>;
  themeMetaBySlug?: Record<string, FeedThemeMeta>;
};

function fmt1m(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return "1M —";
  const n = Number(v);
  const sign = n > 0 ? "+" : "";
  return `1M ${sign}${n.toFixed(1)}%`;
}

function returnClass(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return styles.returnFlat;
  if (v > 0) return styles.returnUp;
  if (v < 0) return styles.returnDown;
  return styles.returnFlat;
}

/** Mean 1M of shown themes — same heat wash as Narrative Radar cards. */
function groupHeatStyle(themes: GroupExplore["themes"]) {
  const vals = themes
    .map((t) => t.return_1m)
    .filter((v): v is number => v != null && Number.isFinite(Number(v)))
    .map(Number);
  if (!vals.length) return undefined;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return trendingReturnCardGradientStyle(avg);
}

export function HomeExploreChanging({
  groups,
  feedSlots,
  tickersByThemeSlug,
  themeMetaBySlug,
}: Props) {
  return (
    <section className={styles.split} aria-label="What is changing and explore">
      <div className={`${styles.col} ${styles.colExplore}`}>
        <div className={styles.head}>
          <h2 className={styles.title}>Explore Themes</h2>
          <Link href="/groups" className={styles.viewAll}>
            All groups →
          </Link>
        </div>
        <div className={styles.groupList}>
          {groups.map((g) => (
            <article key={g.slug} className={styles.groupCard} style={groupHeatStyle(g.themes)}>
              <div className={styles.groupHead}>
                <Link href={`/groups/${g.slug}`} className={styles.groupName}>
                  {g.name}
                </Link>
                {g.theme_count != null ? (
                  <span className={styles.groupMeta}>{g.theme_count} narratives</span>
                ) : null}
              </div>
              {g.themes.length > 0 ? (
                <>
                  <div className={styles.themeChips} aria-label={`${g.name} themes`}>
                    {g.themes.map((t) => {
                      const label = rotationThemeLabelSuffix(t.name, g.name) || t.name;
                      return (
                        <Link key={t.slug} href={`/themes/${t.slug}`} className={styles.themeChip}>
                          <span className={styles.themeName}>{label}</span>
                          <span className={`${styles.themeRet} ${returnClass(t.return_1m)}`}>
                            {fmt1m(t.return_1m)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                  {g.theme_count != null && g.theme_count > g.themes.length ? (
                    <Link href={`/groups/${g.slug}`} className={styles.moreLink}>
                      +{g.theme_count - g.themes.length} more
                    </Link>
                  ) : null}
                </>
              ) : null}
            </article>
          ))}
        </div>
      </div>
      <div className={`${styles.col} ${styles.colChanging}`}>
        <div className={styles.head}>
          <h2 className={styles.title}>What&apos;s changing</h2>
          <Link href="/feed" className={styles.viewAll}>
            See all →
          </Link>
        </div>
        <div className={styles.feedList}>
          {feedSlots.length === 0 ? (
            <p className={styles.feedEmpty}>No recent membership or thesis changes.</p>
          ) : (
            feedSlots.map((slot, i) => (
              <FeedEventCard
                key={`${slot.lead.kind}-${slot.lead.event_at}-${i}`}
                evt={slot.lead}
                dateLabel={formatFeedDateShort(slot.lead.event_at)}
                siblings={slot.siblings}
                tickersByThemeSlug={tickersByThemeSlug}
                themeMetaBySlug={themeMetaBySlug}
                compact
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
