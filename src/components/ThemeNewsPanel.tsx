"use client";

import { useEffect, useRef, useState } from "react";

import { TableFooterBrandMark } from "@/components/TableFooterBrandMark";
import { dedupeThemeNewsItems, fetchThemeNewsIndex, fetchThemeNewsMonth } from "@/lib/themeNews";
import type { ThemeNewsAlsoV0, ThemeNewsIndexV0, ThemeNewsItemV0 } from "@/types/theme.news.v0";

import styles from "./ThemeNewsPanel.module.css";

type Props = {
  slug: string;
  themeName: string;
};

/** Visible rows at a time (compact constituents-style panel). */
const PAGE = 5;

type ViewStory = {
  id: string;
  url: string;
  title: string;
  source?: string | null;
  date: string;
  tickers?: string[];
};

/** Merge month rows into an already newest-first list; sort only when new rows arrive. */
function mergeItems(a: ThemeNewsItemV0[], b: ThemeNewsItemV0[]): ThemeNewsItemV0[] {
  if (!b.length) return a;
  const seen = new Set(a.map((i) => i.id));
  const added: ThemeNewsItemV0[] = [];
  for (const item of b) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    added.push(item);
  }
  if (!added.length) return a;
  return dedupeThemeNewsItems(
    [...a, ...added].sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0)),
  );
}

function dayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function clusterViews(item: ThemeNewsItemV0): ViewStory[] {
  const head: ViewStory = {
    id: item.id,
    url: item.url,
    title: item.title,
    source: item.source,
    date: item.date,
    tickers: item.tickers,
  };
  const also = (item.also ?? []).filter(
    (a): a is ThemeNewsAlsoV0 => Boolean(a?.id && a.url && a.title),
  );
  return [head, ...also];
}

function ThemeNewsStoryRow({ item }: { item: ThemeNewsItemV0 }) {
  const versions = clusterViews(item);
  const [idx, setIdx] = useState(0);
  const total = versions.length;
  const safeIdx = Math.min(Math.max(idx, 0), total - 1);
  const view = versions[safeIdx] ?? versions[0]!;

  const flipper =
    total > 1 ? (
      <div className={styles.flip} role="group" aria-label="Versions of this story">
        <button
          type="button"
          className={styles.flipBtn}
          aria-label="Previous version of this story"
          onClick={() => setIdx(safeIdx - 1 < 0 ? total - 1 : safeIdx - 1)}
        >
          ‹
        </button>
        <span className={styles.flipCount} aria-live="polite">
          {safeIdx + 1}/{total}
        </span>
        <button
          type="button"
          className={styles.flipBtn}
          aria-label="Next version of this story"
          onClick={() => setIdx(safeIdx + 1 >= total ? 0 : safeIdx + 1)}
        >
          ›
        </button>
      </div>
    ) : null;

  return (
    <tr>
      <td className={styles.colDate}>{view.date ? dayLabel(view.date) : "—"}</td>
      <td className={styles.colStory}>
        <div className={styles.storyCell}>
          <a
            className={styles.title}
            href={view.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {view.title}
          </a>
          {/* Trailing fixed slot — arrows column-align across rows. */}
          <div className={styles.flipSlot}>{flipper}</div>
        </div>
      </td>
      <td
        className={styles.colTickers}
        title={view.tickers?.length ? view.tickers.join(" · ") : undefined}
      >
        {view.tickers?.length ? view.tickers.join(" · ") : "—"}
      </td>
      <td className={styles.colSource} title={view.source ?? undefined}>
        {view.source || "—"}
      </td>
    </tr>
  );
}

/**
 * Per-theme news — client-only, fetched after mount (parent should DeferRender).
 * Compact bordered table matching constituents; starts at 5 rows; hide if empty.
 * `index.latest` is already newest-first from ETL — no sort on first paint.
 * Cluster flippers use bake-time ``also[]`` only (no client clustering).
 */
export function ThemeNewsPanel({ slug, themeName }: Props) {
  const [index, setIndex] = useState<ThemeNewsIndexV0 | null>(null);
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<ThemeNewsItemV0[]>([]);
  const [shown, setShown] = useState(0);
  const [nextMonth, setNextMonth] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    const ac = new AbortController();
    setReady(false);
    setIndex(null);
    setItems([]);
    setShown(0);
    setNextMonth(0);
    void fetchThemeNewsIndex(slug, ac.signal).then((idx) => {
      if (ac.signal.aborted) return;
      setIndex(idx);
      if (idx) {
        setItems(idx.latest);
        setShown(Math.min(PAGE, idx.latest.length));
        setNextMonth(0);
      }
      setReady(true);
    });
    return () => ac.abort();
  }, [slug]);

  if (!ready || !index) return null;

  const hasMore =
    shown < index.total && (shown < items.length || nextMonth < index.months.length);
  const canCollapse = shown > PAGE;
  const visible = items.slice(0, shown);

  async function showMore() {
    if (busy.current || !index) return;
    busy.current = true;
    setLoadingMore(true);
    const target = shown + PAGE;
    let merged = items;
    let m = nextMonth;
    try {
      while (merged.length < target && m < index.months.length) {
        const got = await fetchThemeNewsMonth(slug, index.months[m].month).catch(() => []);
        merged = mergeItems(merged, got);
        m += 1;
      }
    } finally {
      setItems(merged);
      setNextMonth(m);
      setShown(Math.min(target, merged.length));
      setLoadingMore(false);
      busy.current = false;
    }
  }

  function collapse() {
    setShown(PAGE);
  }

  return (
    <section className={styles.section} aria-labelledby={`theme-news-${slug}`}>
      <h2 id={`theme-news-${slug}`} className={styles.heading}>
        {themeName} News
      </h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col" className={styles.colDate}>
                Date
              </th>
              <th scope="col" className={styles.colStory}>
                Story
              </th>
              <th scope="col" className={styles.colTickers}>
                Tickers
              </th>
              <th scope="col" className={styles.colSource}>
                Source
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <ThemeNewsStoryRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
        <div className={styles.footer}>
          <p className={styles.footnote}>
            {index.total} {index.total === 1 ? "story" : "stories"} · Narrative Radar
          </p>
          <div className={styles.footerCenter}>
            {hasMore ? (
              <button
                type="button"
                className={styles.more}
                onClick={showMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading…" : `Show more (${index.total - shown})`}
              </button>
            ) : canCollapse ? (
              <button type="button" className={styles.more} onClick={collapse}>
                Collapse
              </button>
            ) : null}
          </div>
          <TableFooterBrandMark className={styles.watermark} />
        </div>
      </div>
    </section>
  );
}
