"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type Fuse from "fuse.js";

import {
  buildThemeFuseRows,
  createThemeSearchFuse,
  loadSearchIndexClient,
  searchThemeHits,
  type ThemeFuseRow,
} from "@/lib/searchThemeHits";
import type { SearchIndexV0 } from "@/types/search_index.v0";

import searchStyles from "./SiteSearch.module.css";
import styles from "./OverlayAddCombobox.module.css";

export type FactorMakeupThemePick = {
  slug: string;
  name: string;
};

type Props = {
  selectedSlugs: Set<string>;
  atLimit: boolean;
  maxThemes: number;
  onAdd: (pick: FactorMakeupThemePick) => void;
};

type SearchEngine = {
  index: SearchIndexV0;
  fuse: Fuse<ThemeFuseRow>;
};

export function FactorMakeupThemeCombobox({
  selectedSlugs,
  atLimit,
  maxThemes,
  onAdd,
}: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const loadInflight = useRef(false);

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [engine, setEngine] = useState<SearchEngine | null>(null);
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
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
    if (loadInflight.current || engine) return;
    loadInflight.current = true;
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
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load search index");
        setEngine(null);
      })
      .finally(() => {
        loadInflight.current = false;
        setLoadBusy(false);
      });
  }, [engine]);

  const candidates = useMemo(() => {
    if (!engine || !debounced.trim()) return [];
    return searchThemeHits(engine.index, engine.fuse, debounced, 12).filter(
      (t) => !selectedSlugs.has(t.slug),
    );
  }, [engine, debounced, selectedSlugs]);

  const cursor = candidates.length > 0 ? Math.min(active, candidates.length - 1) : 0;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pickTheme = useCallback(
    (slug: string, name: string) => {
      onAdd({ slug, name });
      setQuery("");
      setDebounced("");
      setOpen(false);
    },
    [onAdd],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && open && candidates[cursor]) {
        e.preventDefault();
        const t = candidates[cursor];
        pickTheme(t.slug, t.name);
        return;
      }
      if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp") && candidates.length > 0) {
        setOpen(true);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(0, candidates.length - 1)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      }
    },
    [cursor, candidates, open, pickTheme],
  );

  const showPanel = Boolean(
    open &&
      !atLimit &&
      (loadBusy ||
        loadError ||
        candidates.length > 0 ||
        (debounced.trim() && engine && candidates.length === 0)),
  );

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <input
        id={`${listId}-input`}
        type="search"
        className={styles.input}
        aria-label="Add theme to factor makeup chart"
        placeholder={
          atLimit ? `Chart full (${maxThemes} themes max)` : "Search themes to compare…"
        }
        value={query}
        disabled={atLimit}
        autoComplete="off"
        enterKeyHint="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={showPanel ? listId : undefined}
        aria-autocomplete="list"
        onChange={(e) => {
          beginLoad();
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          beginLoad();
        }}
        onKeyDown={onKeyDown}
      />
      {showPanel ? (
        <div id={listId} className={searchStyles.panel} role="listbox" aria-label="Theme search results">
          {loadError ? (
            <div className={searchStyles.err} role="status">
              Search unavailable ({loadError}). Try again later.
            </div>
          ) : loadBusy && !engine ? (
            <div className={searchStyles.meta} role="status">
              Loading search…
            </div>
          ) : engine && debounced.trim() && candidates.length === 0 ? (
            <div className={searchStyles.meta} role="status">
              No matches.
            </div>
          ) : engine && candidates.length > 0 ? (
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {candidates.map((t, i) => (
                <li key={t.slug} role="presentation">
                  <button
                    type="button"
                    className={searchStyles.row}
                    style={{
                      width: "100%",
                      border: "none",
                      background: i === cursor ? "rgba(38, 252, 214, 0.08)" : undefined,
                      cursor: "pointer",
                      textAlign: "left",
                      font: "inherit",
                      color: "inherit",
                    }}
                    role="option"
                    aria-selected={i === cursor}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pickTheme(t.slug, t.name)}
                  >
                    <div className={searchStyles.rowTitle}>
                      <span className={searchStyles.badge}>Theme</span>
                      {t.name}
                    </div>
                    {t.group_name ? (
                      <div className={searchStyles.rowSub}>Group: {t.group_name}</div>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
