"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { WatchlistStar } from "@/components/WatchlistStar";
import { capturePostHog } from "@/lib/posthogClient";
import { collectSiteSearchHits, type SiteSearchHit } from "@/lib/siteSearchHits";
import { useSiteSearchEngine } from "@/lib/useSiteSearchEngine";
import { WATCHLIST_TICKERS_UI_ENABLED } from "@/lib/watchlist/features";

import styles from "./SiteSearch.module.css";

/** Queries shorter than this don't get the "suggest a theme" link (still typing). */
const SUGGEST_MIN_CHARS = 3;

function suggestThemeHref(query: string): string {
  return `/account/suggest?theme=${encodeURIComponent(query.slice(0, 120))}`;
}

type SiteSearchProps = {
  /** Defaults to nav placeholder. */
  placeholder?: string;
  /** `hero` = full-width homepage search. */
  variant?: "nav" | "hero";
};

export function SiteSearch({
  placeholder = "Search…",
  variant = "nav",
}: SiteSearchProps = {}) {
  const router = useRouter();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const prefetchedHrefsRef = useRef<Set<string>>(new Set());
  const { engine, loadBusy, loadError, ensureLoaded: beginLoad } = useSiteSearchEngine();

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebounced(query);
      setActive(0);
    }, 200);
    return () => window.clearTimeout(t);
  }, [query]);

  const hits = useMemo(() => {
    if (!engine || !debounced.trim()) {
      return [];
    }
    return collectSiteSearchHits(engine.index, debounced);
  }, [engine, debounced]);

  useEffect(() => {
    function onDocMouseDown(ev: MouseEvent) {
      const el = wrapRef.current;
      if (!el || !open) {
        return;
      }
      if (ev.target instanceof Node && !el.contains(ev.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const cursor = hits.length > 0 ? Math.min(active, hits.length - 1) : 0;

  const noResultsReportedRef = useRef<string | null>(null);
  useEffect(() => {
    if (engine && debounced.trim() && hits.length === 0) {
      if (noResultsReportedRef.current !== debounced) {
        noResultsReportedRef.current = debounced;
        capturePostHog("search_no_results", { query: debounced });
      }
    } else {
      noResultsReportedRef.current = null;
    }
  }, [engine, debounced, hits]);

  const goToHit = useCallback(
    (h: SiteSearchHit) => {
      const slug = h.kind === "ticker" ? h.ref.theme_slugs[0] ?? null : h.ref.slug;
      capturePostHog("search_result_clicked", {
        query: query.trim(),
        result_kind: h.kind,
        result_slug: slug,
        result_name: h.kind === "ticker" ? h.ref.ticker : h.ref.name,
      });
      if (h.kind === "theme") {
        router.push(`/themes/${encodeURIComponent(h.ref.slug)}`);
      } else if (h.kind === "group") {
        router.push(`/groups/${encodeURIComponent(h.ref.slug)}`);
      } else if (h.ref.theme_slugs[0]) {
        router.push(`/themes/${encodeURIComponent(h.ref.theme_slugs[0])}`);
      }
      setOpen(false);
      setQuery("");
    },
    [router, query],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && open && hits[cursor]) {
        e.preventDefault();
        goToHit(hits[cursor]);
        return;
      }
      if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp") && hits.length > 0) {
        setOpen(true);
        return;
      }
      if (!open) {
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(0, hits.length - 1)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      }
    },
    [cursor, goToHit, hits, open],
  );

  const prefetchHref = useCallback(
    (href: string) => {
      if (prefetchedHrefsRef.current.has(href)) return;
      prefetchedHrefsRef.current.add(href);
      void router.prefetch(href);
    },
    [router],
  );

  const suggestQuery = debounced.trim();
  const suggestLink =
    suggestQuery.length >= SUGGEST_MIN_CHARS ? (
      <Link
        href={suggestThemeHref(suggestQuery)}
        className={styles.themeLink}
        prefetch={false}
        onClick={() => {
          capturePostHog("search_suggest_clicked", {
            query: suggestQuery,
            had_results: hits.length > 0,
          });
          setOpen(false);
          setQuery("");
        }}
      >
        Suggest a new theme →
      </Link>
    ) : null;

  const showPanel = Boolean(
    open &&
      (loadBusy ||
        loadError ||
        hits.length > 0 ||
        (debounced.trim() && engine && hits.length === 0)),
  );

  const index = engine?.index;

  return (
    <div className={variant === "hero" ? `${styles.wrap} ${styles.wrapHero}` : styles.wrap} ref={wrapRef}>
      <input
        type="search"
        className={variant === "hero" ? `${styles.input} ${styles.inputHero}` : styles.input}
        placeholder={placeholder}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showPanel}
        aria-controls={showPanel ? listId : undefined}
        value={query}
        onChange={(e) => {
          beginLoad();
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        enterKeyHint="search"
      />
      {showPanel ? (
        <div id={listId} className={styles.panel} role="listbox" aria-label="Search results">
          {loadError ? (
            <div className={styles.err} role="status">
              Search unavailable ({loadError}). Try again later or use All themes / All groups.
            </div>
          ) : loadBusy && !index ? (
            <div className={styles.meta} role="status">
              Loading search…
            </div>
          ) : index && debounced.trim() && hits.length === 0 ? (
            <div className={styles.empty} role="status">
              No matches for “{suggestQuery}”.
              {suggestLink ? <> {suggestLink}</> : null}
            </div>
          ) : index && hits.length > 0 ? (
            <>
              <div className={styles.meta}>
                Data as of {new Date(index.as_of).toLocaleString(undefined, { dateStyle: "medium" })}
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {hits.map((h, i) => (
                  <li key={h.key} role="presentation">
                    {h.kind === "ticker" ? (
                      <div
                        className={styles.rowWithAction}
                        style={{
                          background: i === cursor ? "rgba(38, 252, 214, 0.08)" : undefined,
                        }}
                        role="option"
                        aria-selected={i === cursor}
                      >
                        <div className={styles.rowBody}>
                          <div className={styles.rowTitle}>
                            <span className={styles.badge}>Ticker</span>
                            {h.ref.ticker}
                            {h.ref.name ? ` · ${h.ref.name}` : ""}
                          </div>
                          <div className={styles.rowSub}>
                            {h.ref.theme_slugs.length === 0 ? (
                              "No theme links"
                            ) : (
                              <>
                                Themes:{" "}
                                {h.ref.theme_slugs.map((slug, j) => (
                                  <span key={slug}>
                                    {j > 0 ? " · " : ""}
                                    <Link
                                      href={`/themes/${encodeURIComponent(slug)}`}
                                      className={styles.themeLink}
                                      prefetch={false}
                                      onMouseEnter={() =>
                                        prefetchHref(`/themes/${encodeURIComponent(slug)}`)
                                      }
                                      onFocus={() =>
                                        prefetchHref(`/themes/${encodeURIComponent(slug)}`)
                                      }
                                      onClick={() => {
                                        setOpen(false);
                                        setQuery("");
                                      }}
                                    >
                                      {h.ref.theme_names?.[j] ?? slug}
                                    </Link>
                                  </span>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                        {WATCHLIST_TICKERS_UI_ENABLED ? (
                          <WatchlistStar
                            compact
                            itemType="ticker"
                            itemKey={h.ref.ticker}
                            label={h.ref.ticker}
                          />
                        ) : null}
                      </div>
                    ) : h.kind === "theme" ? (
                      <div
                        className={styles.rowWithAction}
                        style={{
                          background: i === cursor ? "rgba(38, 252, 214, 0.08)" : undefined,
                        }}
                        role="option"
                        aria-selected={i === cursor}
                      >
                        <Link
                          href={`/themes/${encodeURIComponent(h.ref.slug)}`}
                          className={`${styles.row} ${styles.rowBody}`}
                          prefetch={false}
                          onMouseEnter={() =>
                            prefetchHref(`/themes/${encodeURIComponent(h.ref.slug)}`)
                          }
                          onFocus={() =>
                            prefetchHref(`/themes/${encodeURIComponent(h.ref.slug)}`)
                          }
                          onClick={() => {
                            setOpen(false);
                            setQuery("");
                          }}
                        >
                          <div className={styles.rowTitle}>
                            <span className={styles.badge}>Theme</span>
                            {h.ref.name}
                          </div>
                          {h.ref.group_name || h.matched ? (
                            <div className={styles.rowSub}>
                              {[
                                h.ref.group_name ? `Group: ${h.ref.group_name}` : null,
                                h.matched ? `matches “${h.matched}”` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          ) : null}
                        </Link>
                        <WatchlistStar
                          compact
                          itemType="theme"
                          itemKey={h.ref.slug}
                          label={h.ref.name}
                          signInNext={`/themes/${encodeURIComponent(h.ref.slug)}`}
                        />
                      </div>
                    ) : (
                      <Link
                        href={`/groups/${encodeURIComponent(h.ref.slug)}`}
                        className={styles.row}
                        prefetch={false}
                        onMouseEnter={() =>
                          prefetchHref(`/groups/${encodeURIComponent(h.ref.slug)}`)
                        }
                        onFocus={() =>
                          prefetchHref(`/groups/${encodeURIComponent(h.ref.slug)}`)
                        }
                        style={{
                          background: i === cursor ? "rgba(38, 252, 214, 0.08)" : undefined,
                        }}
                        role="option"
                        aria-selected={i === cursor}
                        onClick={() => {
                          setOpen(false);
                          setQuery("");
                        }}
                      >
                        <div className={styles.rowTitle}>
                          <span className={styles.badge}>Group</span>
                          {h.ref.name}
                        </div>
                        {h.ref.spy_sector || h.matched ? (
                          <div className={styles.rowSub}>
                            {[h.ref.spy_sector, h.matched ? `matches “${h.matched}”` : null]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        ) : null}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
              {suggestLink ? (
                <div className={styles.suggestFooter}>Can’t find it? {suggestLink}</div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
