"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import type { OverlayEntityKind } from "@/lib/chartSidecar";
import {
  collectSiteSearchHits,
  loadSiteSearchEngine,
  overlaySeriesKeyFromHit,
  type SiteSearchEngine,
  type SiteSearchHit,
} from "@/lib/siteSearchHits";

import searchStyles from "./SiteSearch.module.css";
import styles from "./OverlayAddCombobox.module.css";

export type OverlayPick = {
  kind: OverlayEntityKind;
  slug: string;
  name: string;
};

type OverlaySearchRow = {
  key: string;
  pick: OverlayPick;
  badge: "Theme" | "Group";
  title: string;
  subtitle?: string;
};

function expandHitsForOverlay(hits: SiteSearchHit[], selectedKeys: Set<string>): OverlaySearchRow[] {
  const rows: OverlaySearchRow[] = [];
  for (const hit of hits) {
    if (hit.kind === "theme") {
      const key = `theme:${hit.ref.slug}`;
      if (selectedKeys.has(key)) continue;
      rows.push({
        key: hit.key,
        pick: { kind: "theme", slug: hit.ref.slug, name: hit.ref.name },
        badge: "Theme",
        title: hit.ref.name,
        subtitle: hit.ref.group_name ? `Group: ${hit.ref.group_name}` : undefined,
      });
      continue;
    }
    if (hit.kind === "group") {
      const key = `group:${hit.ref.slug}`;
      if (selectedKeys.has(key)) continue;
      rows.push({
        key: hit.key,
        pick: { kind: "group", slug: hit.ref.slug, name: hit.ref.name },
        badge: "Group",
        title: hit.ref.name,
        subtitle: hit.ref.spy_sector ?? undefined,
      });
      continue;
    }
    const tickerLabel = hit.ref.name
      ? `${hit.ref.ticker} · ${hit.ref.name}`
      : hit.ref.ticker;
    for (let j = 0; j < hit.ref.theme_slugs.length; j++) {
      const slug = hit.ref.theme_slugs[j];
      const seriesKey = `theme:${slug}`;
      if (selectedKeys.has(seriesKey)) continue;
      const themeName = hit.ref.theme_names[j] ?? slug;
      rows.push({
        key: `${hit.key}:theme:${slug}`,
        pick: { kind: "theme", slug, name: themeName },
        badge: "Theme",
        title: themeName,
        subtitle: `via ${tickerLabel}`,
      });
    }
  }
  return rows;
}

function hitStillSelectable(hit: SiteSearchHit, selectedKeys: Set<string>): boolean {
  if (hit.kind === "ticker") {
    return hit.ref.theme_slugs.some((slug) => !selectedKeys.has(`theme:${slug}`));
  }
  const seriesKey = overlaySeriesKeyFromHit(hit);
  return seriesKey != null && !selectedKeys.has(seriesKey);
}

type Props = {
  selectedKeys: Set<string>;
  atLimit: boolean;
  onAdd: (pick: OverlayPick) => void;
};

export function OverlayAddCombobox({ selectedKeys, atLimit, onAdd }: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const loadInflight = useRef(false);

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [engine, setEngine] = useState<SiteSearchEngine | null>(null);
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
    return collectSiteSearchHits(engine.index, engine.fuse, debounced).filter((hit) =>
      hitStillSelectable(hit, selectedKeys),
    );
  }, [engine, debounced, selectedKeys]);

  const rows = useMemo(() => expandHitsForOverlay(hits, selectedKeys), [hits, selectedKeys]);

  const cursor = rows.length > 0 ? Math.min(active, rows.length - 1) : 0;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pickRow = useCallback(
    (row: OverlaySearchRow) => {
      onAdd(row.pick);
      setQuery("");
      setDebounced("");
      setOpen(false);
    },
    [onAdd],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && open && rows[cursor]) {
        e.preventDefault();
        pickRow(rows[cursor]);
        return;
      }
      if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp") && rows.length > 0) {
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
        setActive((i) => Math.min(i + 1, Math.max(0, rows.length - 1)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      }
    },
    [cursor, rows, open, pickRow],
  );

  const showPanel = Boolean(
    open &&
      !atLimit &&
      (loadBusy || loadError || rows.length > 0 || (debounced.trim() && engine && rows.length === 0)),
  );

  const index = engine?.index;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <input
        id={`${listId}-input`}
        type="search"
        className={styles.input}
        aria-label="Add theme or group to chart"
        placeholder={atLimit ? "Chart full (12 series max)" : "Search ticker, company, or theme…"}
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
        <div id={listId} className={searchStyles.panel} role="listbox" aria-label="Search results">
          {loadError ? (
            <div className={searchStyles.err} role="status">
              Search unavailable ({loadError}). Try again later.
            </div>
          ) : loadBusy && !index ? (
            <div className={searchStyles.meta} role="status">
              Loading search…
            </div>
          ) : index && debounced.trim() && rows.length === 0 ? (
            <div className={searchStyles.meta} role="status">
              No matches.
            </div>
          ) : index && rows.length > 0 ? (
            <>
              <div className={searchStyles.meta}>
                Data as of {new Date(index.as_of).toLocaleString(undefined, { dateStyle: "medium" })}
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {rows.map((row, i) => (
                  <li key={row.key} role="presentation">
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
                      onClick={() => pickRow(row)}
                    >
                      <div className={searchStyles.rowTitle}>
                        <span className={searchStyles.badge}>{row.badge}</span>
                        {row.title}
                      </div>
                      {row.subtitle ? <div className={searchStyles.rowSub}>{row.subtitle}</div> : null}
                    </button>
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
