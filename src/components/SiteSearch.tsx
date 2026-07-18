"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { WatchlistStar } from "@/components/WatchlistStar";
import { capturePostHog } from "@/lib/posthogClient";
import { WATCHLIST_TICKERS_UI_ENABLED } from "@/lib/watchlist/features";
import {
  collectSiteSearchHits,
  loadSiteSearchEngine,
  type SiteSearchEngine,
  type SiteSearchHit,
} from "@/lib/siteSearchHits";

import styles from "./SiteSearch.module.css";

export function SiteSearch() {
  const router = useRouter();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const loadInflight = useRef(false);
  const prefetchedHrefsRef = useRef<Set<string>>(new Set());

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [engine, setEngine] = useState<SiteSearchEngine | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadBusy, setLoadBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebounced(query);
      setActive(0);
    }, 200);
    return () => window.clearTimeout(t);
  }, [query]);

  const beginLoad = useCallback(() => {
    if (loadInflight.current || engine) {
      return;
    }
    loadInflight.current = true;
    setLoadBusy(true);
    setLoadError(null);
    void loadSiteSearchEngine()
      .then(setEngine)
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load search index");
        setEngine(null);
      })
      .finally(() => {
        loadInflight.current = false;
        setLoadBusy(false);
      });
  }, [engine]);

  const hits = useMemo(() => {
    if (!engine || !debounced.trim()) {
      return [];
    }
    return collectSiteSearchHits(engine.index, engine.fuse, debounced);
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

  const showPanel = Boolean(
    open &&
      (loadBusy ||
        loadError ||
        hits.length > 0 ||
        (debounced.trim() && engine && hits.length === 0)),
  );

  const index = engine?.index;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <input
        type="search"
        className={styles.input}
        placeholder="Search ticker, company, or theme…"
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
            <div className={styles.meta} role="status">
              No matches.
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
                          {h.ref.group_name ? (
                            <div className={styles.rowSub}>Group: {h.ref.group_name}</div>
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
                        {h.ref.spy_sector ? (
                          <div className={styles.rowSub}>{h.ref.spy_sector}</div>
                        ) : null}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
