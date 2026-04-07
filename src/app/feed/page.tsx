import Link from "next/link";

import { getManifestCached } from "@/lib/getManifestCached";
import { mergeHomeFeedEvents, prioritizeLifecycleFeedFull } from "@/lib/mergeHomeFeedEvents";
import type { ManifestHomeFeedEventV0 } from "@/types/manifest.v0";

import styles from "./page.module.css";

function fmtFeedDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function cleanFeedTitle(evt: ManifestHomeFeedEventV0): string {
  const title = String(evt.title || "").trim();
  if (evt.kind === "theme_new" && title.toLowerCase().endsWith(" - new theme")) {
    return title.slice(0, -(" - new theme".length));
  }
  if (evt.kind === "theme_updated" && title.toLowerCase().endsWith(" - theme updated")) {
    return title.slice(0, -(" - theme updated".length));
  }
  return title;
}

function feedChangesText(evt: ManifestHomeFeedEventV0): string {
  const raw = Array.isArray(evt.changes_preview)
    ? evt.changes_preview.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  const more = Number.isFinite(evt.changes_more_count) ? Number(evt.changes_more_count) : 0;
  if (!raw.length && more <= 0) return "";

  const added: string[] = [];
  const removed: string[] = [];
  const other: string[] = [];
  for (const item of raw) {
    const m = item.match(/^(.+?)\s+(added|removed)$/i);
    if (!m) {
      other.push(item);
      continue;
    }
    const ticker = String(m[1] || "").trim();
    const action = String(m[2] || "").toLowerCase();
    if (!ticker) continue;
    if (action === "added") added.push(ticker);
    else if (action === "removed") removed.push(ticker);
    else other.push(item);
  }

  const parts: string[] = [];
  if (removed.length) parts.push(`${removed.join(", ")} removed`);
  if (added.length) parts.push(`${added.join(", ")} added`);
  if (other.length) parts.push(other.join(", "));

  if (more > 0) {
    if (added.length && !removed.length) {
      parts.push(`+${more} more added`);
    } else if (removed.length && !added.length) {
      parts.push(`+${more} more removed`);
    } else {
      parts.push(`+${more} more changes`);
    }
  }
  return parts.join("; ");
}

export default async function FeedPage() {
  const { manifest } = await getManifestCached();
  const themeByName = new Map(manifest.themes.map((t) => [t.name, t]));
  const etl = Array.isArray(manifest.home_feed_events) ? manifest.home_feed_events : [];
  const events = prioritizeLifecycleFeedFull(mergeHomeFeedEvents(manifest, themeByName, etl));

  return (
    <div className={`st-surface ${styles.page}`}>
      <main className={styles.main}>
        <p className={styles.backLink}>
          <Link href="/">Back to home</Link>
        </p>
        <h1>Full Feed</h1>
        {events.length === 0 ? (
          <p className={styles.empty}>No feed events available.</p>
        ) : (
          <div className={styles.feedList}>
            {events.map((evt, idx) => {
              const slug = String(evt.theme_slug || "").trim();
              const displayTitle = cleanFeedTitle(evt);
              const changesText = feedChangesText(evt);
              const noteText = String(evt.note || "").trim();
              const isThemeLifecycle = evt.kind === "theme_new" || evt.kind === "theme_updated";
              const kindLabel =
                evt.kind === "theme_new"
                  ? "Theme created"
                  : evt.kind === "theme_updated"
                    ? "Theme updated"
                    : evt.kind === "text_table_update"
                      ? "Thesis update"
                      : "Theme change";
              return (
                <article key={`${evt.kind}-${evt.event_at}-${idx}`} className={styles.feedItem}>
                  <div className={styles.feedDate}>{fmtFeedDate(evt.event_at)}</div>
                  <div className={styles.feedBody}>
                    <div className={styles.feedTitleRow}>
                      {slug ? (
                        <Link href={`/themes/${slug}`} className={styles.feedTitle}>
                          {displayTitle}
                        </Link>
                      ) : (
                        <span className={styles.feedTitle}>{displayTitle}</span>
                      )}
                      <span className={styles.feedKindInline}>{kindLabel}</span>
                    </div>
                    <div className={styles.feedMeta}>
                      {changesText ? <span className={styles.feedSummary}>{changesText}</span> : null}
                      {!changesText && evt.summary && !isThemeLifecycle ? (
                        <span className={styles.feedSummary}>{evt.summary}</span>
                      ) : null}
                    </div>
                    {noteText ? <div className={styles.feedNote}>{noteText}</div> : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
