"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { useWatchlist } from "@/components/WatchlistProvider";
import { normalizeWatchlistKey } from "@/lib/watchlist/api";
import {
  buildThemeFuseRows,
  createThemeSearchFuse,
  loadSearchIndexClient,
  searchThemeHits,
  type ThemeFuseRow,
} from "@/lib/searchThemeHits";
import type Fuse from "fuse.js";
import type { SearchIndexThemeRowV0, SearchIndexV0 } from "@/types/search_index.v0";

import styles from "./WatchlistThemeAddCombobox.module.css";

const THEME_LIMIT = 20;

type Props = {
  /** Inside /my add card — no extra label or footer line. */
  embedded?: boolean;
};

type SearchEngine = {
  index: SearchIndexV0;
  fuse: Fuse<ThemeFuseRow>;
};

export function WatchlistThemeAddCombobox({ embedded = false }: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const watchlist = useWatchlist();

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [engine, setEngine] = useState<SearchEngine | null>(null);
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addMessage, setAddMessage] = useState<string | null>(null);
  const [addingSlug, setAddingSlug] = useState<string | null>(null);

  const themeCount = watchlist?.themeCount ?? 0;
  const atLimit = themeCount >= THEME_LIMIT;
  const savedSlugs = watchlist?.themeKeys ?? new Set<string>();

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebounced(query);
      setActive(0);
    }, 200);
    return () => window.clearTimeout(t);
  }, [query]);

  const ensureEngine = useCallback(() => {
    if (engine || loadBusy) return;
    setLoadBusy(true);
    setLoadError(null);
    void loadSearchIndexClient()
      .then(async (index) => {
        if (!index) {
          setLoadError("Theme search is unavailable.");
          return;
        }
        const rows = buildThemeFuseRows(index);
        const fuse = await createThemeSearchFuse(rows);
        setEngine({ index, fuse });
      })
      .catch(() => {
        setLoadError("Could not load theme search.");
      })
      .finally(() => {
        setLoadBusy(false);
      });
  }, [engine, loadBusy]);

  const candidates = useMemo(() => {
    if (!engine || !debounced.trim()) return [];
    return searchThemeHits(engine.index, engine.fuse, debounced, 12).filter(
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
        placeholder={atLimit ? "Watchlist full (20 themes)" : "Search themes to add…"}
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
        <p className={styles.inlineHint}>Watchlist full (20 themes max). Remove one below to add another.</p>
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
