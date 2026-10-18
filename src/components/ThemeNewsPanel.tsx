"use client";

import { useEffect, useRef, useState } from "react";

import { TableFooterBrandMark } from "@/components/TableFooterBrandMark";
import { fetchThemeNewsIndex, fetchThemeNewsMonth } from "@/lib/themeNews";
import type { ThemeNewsIndexV0, ThemeNewsItemV0 } from "@/types/theme.news.v0";

import styles from "./ThemeNewsPanel.module.css";

type Props = {
  slug: string;
  themeName: string;
};

/** Visible rows at a time (compact constituents-style panel). */
const PAGE = 5;

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
  return [...a, ...added].sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0));
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

/**
 * Per-theme news — client-only, fetched after mount (parent should DeferRender).
 * Compact bordered table matching constituents; starts at 5 rows; hide if empty.
 * `index.latest` is already newest-first from ETL — no sort on first paint.
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
              <tr key={item.id}>
                <td className={styles.colDate}>{item.date ? dayLabel(item.date) : "—"}</td>
                <td className={styles.colStory}>
                  <div className={styles.storyCell}>
                    <a
                      className={styles.title}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.title}
                    </a>
                    {item.picked ? (
                      <span
                        className={styles.pick}
                        title={
                          item.on_site
                            ? "Editorial pick · shown on Narrative Radar"
                            : "Editorial pick"
                        }
                      >
                        Pick
                      </span>
                    ) : null}
                  </div>
                </td>
                <td
                  className={styles.colTickers}
                  title={item.tickers?.length ? item.tickers.join(" · ") : undefined}
                >
                  {item.tickers?.length ? item.tickers.join(" · ") : "—"}
                </td>
                <td className={styles.colSource} title={item.source ?? undefined}>
                  {item.source || "—"}
                </td>
              </tr>
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
