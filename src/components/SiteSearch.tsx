"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { WatchlistStar } from "@/components/WatchlistStar";
import { capturePostHog } from "@/lib/posthogClient";
import { themeDisplayLabel } from "@/lib/rotationThemeLabel";
import { collectSiteSearchHits, type SiteSearchHit } from "@/lib/siteSearchHits";
import {
  matchesWatchlistSearchQuery,
  WATCHLIST_SEARCH_HREF,
} from "@/lib/siteSearchWatchlistShortcut";
import {
  SEARCH_TICKER_THEME_PREVIEW,
  sliceTickerThemesForSearch,
} from "@/lib/siteSearchTickerThemes";
import { navigateToStockPage } from "@/lib/stockPageNavigate";
import { stockPagePath } from "@/lib/stockPagePath";
import { useSiteSearchEngine } from "@/lib/useSiteSearchEngine";
import { WATCHLIST_TICKERS_UI_ENABLED } from "@/lib/watchlist/features";

import styles from "./SiteSearch.module.css";

/** Queries shorter than this don't get the "suggest a theme" link (still typing). */
const SUGGEST_MIN_CHARS = 3;

/** Matches site desktop breakpoint (home hero can show full membership). */
const DESKTOP_MQ = "(min-width: 901px)";

/** Hero desktop = all themes; nav + mobile = compact preview. */
function useTickerThemePreviewLimit(variant: "nav" | "hero"): number | null {
  const [heroDesktop, setHeroDesktop] = useState(false);

  useEffect(() => {
    if (variant !== "hero") {
      setHeroDesktop(false);
      return;
    }
    const mq = window.matchMedia(DESKTOP_MQ);
    const apply = () => setHeroDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [variant]);

  if (variant === "hero" && heroDesktop) return null;
  return SEARCH_TICKER_THEME_PREVIEW;
}

type SearchOption = { type: "watchlist" } | { type: "hit"; hit: SiteSearchHit };

function suggestThemeHref(query: string): string {
  return `/account/suggest?theme=${encodeURIComponent(query.slice(0, 120))}`;
}

type SiteSearchProps = {
  /** Defaults to nav placeholder. */
  placeholder?: string;
  /** `hero` = full-width homepage search. */
  variant?: "nav" | "hero";
  /** Focus the field on mount (LazySiteSearch after stub → real swap). */
  autoFocus?: boolean;
};

export function SiteSearch({
  placeholder = "Search…",
  variant = "nav",
  autoFocus = false,
}: SiteSearchProps = {}) {
  const router = useRouter();
  const { configured, showAuthedUi } = useSupabaseAuth();
  const signedIn = configured && showAuthedUi;
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const prefetchedHrefsRef = useRef<Set<string>>(new Set());
  const tickerThemeLimit = useTickerThemePreviewLimit(variant);
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

  const showWatchlistShortcut =
    signedIn && matchesWatchlistSearchQuery(debounced);

  const options = useMemo((): SearchOption[] => {
    const out: SearchOption[] = [];
    if (showWatchlistShortcut) out.push({ type: "watchlist" });
    for (const hit of hits) out.push({ type: "hit", hit });
    return out;
  }, [showWatchlistShortcut, hits]);

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

  const cursor = options.length > 0 ? Math.min(active, options.length - 1) : 0;

  const noResultsReportedRef = useRef<string | null>(null);
  useEffect(() => {
    if (engine && debounced.trim() && hits.length === 0 && !showWatchlistShortcut) {
      if (noResultsReportedRef.current !== debounced) {
        noResultsReportedRef.current = debounced;
        capturePostHog("search_no_results", { query: debounced });
      }
    } else {
      noResultsReportedRef.current = null;
    }
  }, [engine, debounced, hits, showWatchlistShortcut]);

  const goToWatchlist = useCallback(() => {
    capturePostHog("search_result_clicked", {
      query: query.trim(),
      result_kind: "watchlist",
      result_slug: "my",
      result_name: "My watchlist",
    });
    router.push(WATCHLIST_SEARCH_HREF);
    setOpen(false);
    setQuery("");
  }, [router, query]);

  const goToHit = useCallback(
    (h: SiteSearchHit) => {
      const slug =
        h.kind === "ticker"
          ? h.ref.ticker
          : h.kind === "theme" || h.kind === "group"
            ? h.ref.slug
            : null;
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
      } else if (h.kind === "ticker") {
        // Hard nav — long-tail stock HTML is on-demand (not in the static export).
        navigateToStockPage(h.ref.ticker);
      }
      setOpen(false);
      setQuery("");
    },
    [router, query],
  );

  const goToOption = useCallback(
    (opt: SearchOption) => {
      if (opt.type === "watchlist") goToWatchlist();
      else goToHit(opt.hit);
    },
    [goToWatchlist, goToHit],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && open && options[cursor]) {
        e.preventDefault();
        goToOption(options[cursor]);
        return;
      }
      if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp") && options.length > 0) {
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
        setActive((i) => Math.min(i + 1, Math.max(0, options.length - 1)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      }
    },
    [cursor, goToOption, options, open],
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
        options.length > 0 ||
        (debounced.trim() && engine && hits.length === 0 && !showWatchlistShortcut)),
  );

  useEffect(() => {
    if (showWatchlistShortcut) prefetchHref(WATCHLIST_SEARCH_HREF);
  }, [showWatchlistShortcut, prefetchHref]);

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
        onFocus={() => {
          beginLoad();
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        autoComplete="off"
        enterKeyHint="search"
        autoFocus={autoFocus}
      />
      {showPanel ? (
        <div id={listId} className={styles.panel} role="listbox" aria-label="Search results">
          {loadError ? (
            <div className={styles.err} role="status">
              Search unavailable ({loadError}). Try again later or use All themes / All groups.
            </div>
          ) : options.length > 0 ? (
            <>
              {index ? (
                <div className={styles.meta}>
                  Data as of {new Date(index.as_of).toLocaleString(undefined, { dateStyle: "medium" })}
                </div>
              ) : null}
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {options.map((opt, i) =>
                  opt.type === "watchlist" ? (
                  <li key="nav:watchlist" role="presentation">
                    <Link
                      href={WATCHLIST_SEARCH_HREF}
                      className={styles.row}
                      prefetch={false}
                      onMouseEnter={() => prefetchHref(WATCHLIST_SEARCH_HREF)}
                      onFocus={() => prefetchHref(WATCHLIST_SEARCH_HREF)}
                      style={{
                        background: i === cursor ? "rgba(38, 252, 214, 0.08)" : undefined,
                      }}
                      role="option"
                      aria-selected={i === cursor}
                      onClick={() => {
                        capturePostHog("search_result_clicked", {
                          query: query.trim(),
                          result_kind: "watchlist",
                          result_slug: "my",
                          result_name: "My watchlist",
                        });
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <div className={styles.rowTitle}>
                        <span className={styles.badge}>Page</span>
                        My watchlist
                      </div>
                      <div className={styles.rowSub}>Open your saved themes</div>
                    </Link>
                  </li>
                  ) : (
                  <li key={opt.hit.key} role="presentation">
                    {(() => {
                      const h = opt.hit;
                      return h.kind === "ticker" ? (
                      <div
                        className={styles.rowWithAction}
                        style={{
                          background: i === cursor ? "rgba(38, 252, 214, 0.08)" : undefined,
                        }}
                        role="option"
                        aria-selected={i === cursor}
                      >
                        <div className={styles.rowBody}>
                          <a
                            href={`/stocks/${encodeURIComponent(h.ref.ticker)}`}
                            className={styles.rowTitle}
                            onClick={() => {
                              setOpen(false);
                              setQuery("");
                            }}
                          >
                            <span className={styles.badge}>Ticker</span>
                            {h.ref.ticker}
                            {h.ref.name ? ` · ${h.ref.name}` : ""}
                          </a>
                          <div className={styles.rowSub}>
                            {h.ref.theme_slugs.length === 0 ? (
                              "No theme links"
                            ) : (
                              (() => {
                                const stockHref = stockPagePath(h.ref.ticker);
                                const { shown, moreCount } = sliceTickerThemesForSearch(
                                  h.ref.theme_slugs,
                                  h.ref.theme_names,
                                  tickerThemeLimit,
                                );
                                return (
                                  <>
                                    Themes:{" "}
                                    {shown.map((item, j) => (
                                      <span key={item.slug}>
                                        {j > 0 ? " · " : ""}
                                        <Link
                                          href={`/themes/${encodeURIComponent(item.slug)}`}
                                          className={styles.themeLink}
                                          prefetch={false}
                                          onMouseEnter={() =>
                                            prefetchHref(
                                              `/themes/${encodeURIComponent(item.slug)}`,
                                            )
                                          }
                                          onFocus={() =>
                                            prefetchHref(
                                              `/themes/${encodeURIComponent(item.slug)}`,
                                            )
                                          }
                                          onClick={() => {
                                            setOpen(false);
                                            setQuery("");
                                          }}
                                        >
                                          {themeDisplayLabel(item.name)}
                                        </Link>
                                      </span>
                                    ))}
                                    {moreCount > 0 ? (
                                      <>
                                        {" · "}
                                        <Link
                                          href={stockHref}
                                          className={styles.themeLink}
                                          prefetch={false}
                                          onMouseEnter={() => prefetchHref(stockHref)}
                                          onFocus={() => prefetchHref(stockHref)}
                                          onClick={() => {
                                            setOpen(false);
                                            setQuery("");
                                          }}
                                        >
                                          +{moreCount} more
                                        </Link>
                                      </>
                                    ) : null}
                                  </>
                                );
                              })()
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
                            {themeDisplayLabel(h.ref.name)}
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
                          label={themeDisplayLabel(h.ref.name)}
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
                    );
                    })()}
                  </li>
                  ),
                )}
              </ul>
              {suggestLink ? (
                <div className={styles.suggestFooter}>Can’t find it? {suggestLink}</div>
              ) : null}
            </>
          ) : loadBusy && !index ? (
            <div className={styles.meta} role="status">
              Loading search…
            </div>
          ) : debounced.trim() ? (
            <div className={styles.empty} role="status">
              No matches for “{suggestQuery}”.
              {suggestLink ? <> {suggestLink}</> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
