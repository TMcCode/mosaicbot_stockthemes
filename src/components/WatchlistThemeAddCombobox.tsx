"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { useWatchlist } from "@/components/WatchlistProvider";
import { HELLO_EMAIL } from "@/lib/contactEmails";
import { normalizeWatchlistKey } from "@/lib/watchlist/api";
import {
  WATCHLIST_THEME_LIMIT,
  watchlistFullHintBody,
  watchlistFullPlaceholder,
  watchlistLimitInterestMailto,
} from "@/lib/watchlist/limitsCopy";
import {
  collectSiteSearchThemeHits,
  loadSiteSearchEngine,
  type SiteSearchEngine,
} from "@/lib/siteSearchHits";
import type { SearchIndexThemeRowV0 } from "@/types/search_index.v0";

import styles from "./WatchlistThemeAddCombobox.module.css";

type Props = {
  /** Inside /my add card — no extra label or footer line. */
  embedded?: boolean;
};

export function WatchlistThemeAddCombobox({ embedded = false }: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const loadInflight = useRef(false);
  const watchlist = useWatchlist();

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [engine, setEngine] = useState<SiteSearchEngine | null>(null);
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addMessage, setAddMessage] = useState<string | null>(null);
  const [addingSlug, setAddingSlug] = useState<string | null>(null);

  const themeCount = watchlist?.themeCount ?? 0;
  const atLimit = themeCount >= WATCHLIST_THEME_LIMIT;
  const savedSlugs = watchlist?.themeKeys ?? new Set<string>();

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebounced(query);
      setActive(0);
    }, 200);
    return () => window.clearTimeout(t);
  }, [query]);

  const ensureEngine = useCallback(() => {
    if (engine || loadInflight.current) return;
    loadInflight.current = true;
    setLoadBusy(true);
    setLoadError(null);
    void loadSiteSearchEngine()
      .then(setEngine)
      .catch(() => {
        setLoadError("Could not load theme search.");
        setEngine(null);
      })
      .finally(() => {
        loadInflight.current = false;
        setLoadBusy(false);
      });
  }, [engine]);

  const candidates = useMemo(() => {
    if (!engine || !debounced.trim()) return [];
    return collectSiteSearchThemeHits(engine.index, engine.fuse, debounced, 12).filter(
      (t) => !savedSlugs.has(normalizeWatchlistKey("theme", t.slug)),
    );
  }, [engine, debounced, savedSlugs]);

  const showPanel =
    open && !atLimit && Boolean(debounced.trim() || loadBusy || loadError);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const addTheme = useCallback(
    async (theme: SearchIndexThemeRowV0) => {
      if (!watchlist || atLimit) return;
      setAddMessage(null);
      setAddingSlug(theme.slug);
      const result = await watchlist.toggle("theme", theme.slug);
      setAddingSlug(null);
      if (result.ok) {
        setQuery("");
        setDebounced("");
        setOpen(false);
        setAddMessage(null);
      } else {
        setAddMessage(result.message ?? "Could not add theme.");
      }
    },
    [watchlist, atLimit],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showPanel && e.key !== "ArrowDown") return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActive((i) => Math.min(candidates.length - 1, i + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === "Enter" && candidates[active]) {
      e.preventDefault();
      void addTheme(candidates[active]);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={embedded ? styles.wrapEmbedded : styles.wrap} ref={wrapRef}>
      {!embedded ? (
        <label className={styles.label} htmlFor={`${listId}-input`}>
          Add theme
        </label>
      ) : null}
      <input
        id={`${listId}-input`}
        type="search"
        className={styles.input}
        aria-label="Add theme to watchlist"
        placeholder={
          atLimit ? watchlistFullPlaceholder() : "Search theme, ticker, or company…"
        }
        value={query}
        disabled={atLimit || !watchlist?.ready}
        autoComplete="off"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={showPanel ? listId : undefined}
        aria-autocomplete="list"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setAddMessage(null);
          ensureEngine();
        }}
        onFocus={() => {
          setOpen(true);
          ensureEngine();
        }}
        onKeyDown={onKeyDown}
      />
      {atLimit ? (
        <p className={styles.inlineHint}>
          {watchlistFullHintBody()} Free plan is {WATCHLIST_THEME_LIMIT} themes; paid tiers aren&apos;t
          available yet.{" "}
          <a href={watchlistLimitInterestMailto()}>Email {HELLO_EMAIL}</a> if you need a higher limit.
        </p>
      ) : null}
      {addMessage ? (
        <p className={styles.message} role="status">
          {addMessage}
        </p>
      ) : null}
      {showPanel ? (
        <div id={listId} className={styles.panel} role="listbox" aria-label="Themes to add">
          {loadBusy && !engine ? (
            <p className={styles.panelMeta}>Loading themes…</p>
          ) : loadError ? (
            <p className={styles.panelMeta}>{loadError}</p>
          ) : candidates.length === 0 ? (
            <p className={styles.panelMeta}>No matching themes.</p>
          ) : (
            <ul className={styles.list}>
              {candidates.map((t, i) => (
                <li key={t.slug} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    className={i === active ? styles.optionActive : styles.option}
                    disabled={addingSlug === t.slug}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => void addTheme(t)}
                  >
                    <span className={styles.optionName}>{t.name}</span>
                    {t.group_name ? (
                      <span className={styles.optionMeta}>{t.group_name}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
      {!embedded ? (
        <p className={styles.footerHint}>
          Or browse <Link href="/themes">all themes</Link> and use ☆.
        </p>
      ) : null}
    </div>
  );
}
