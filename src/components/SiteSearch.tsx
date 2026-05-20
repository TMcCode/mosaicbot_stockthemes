"use client";

import type Fuse from "fuse.js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import posthog from "posthog-js";

import { searchIndexFetchUrls } from "@/lib/searchIndexUrl";
import type {
  SearchIndexGroupRowV0,
  SearchIndexThemeRowV0,
  SearchIndexTickerRowV0,
  SearchIndexV0,
} from "@/types/search_index.v0";

import styles from "./SiteSearch.module.css";

type FuseRow =
  | { kind: "ticker"; text: string; ref: SearchIndexTickerRowV0 }
  | { kind: "theme"; text: string; ref: SearchIndexThemeRowV0 }
  | { kind: "group"; text: string; ref: SearchIndexGroupRowV0 };

function parseSearchIndex(raw: string): SearchIndexV0 {
  const data = JSON.parse(raw) as SearchIndexV0;
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported search index schema_version: ${data.schema_version}`);
  }
  if (!Array.isArray(data.tickers) || !Array.isArray(data.themes) || !Array.isArray(data.groups)) {
    throw new Error("Invalid search index JSON");
  }
  return data;
}

function buildFuseRows(index: SearchIndexV0): FuseRow[] {
  const rows: FuseRow[] = [];
  for (const t of index.tickers) {
    const parts = [
      t.ticker,
      t.name ?? "",
      ...(t.theme_names ?? []),
      ...(t.aliases ?? []),
    ];
    rows.push({ kind: "ticker", text: parts.join(" ").trim(), ref: t });
  }
  for (const t of index.themes) {
    const parts = [
      t.name,
      t.slug,
      t.group_name ?? "",
      ...(t.aliases ?? []),
    ];
    rows.push({ kind: "theme", text: parts.join(" ").trim(), ref: t });
  }
  for (const g of index.groups) {
    const parts = [
      g.name,
      g.slug,
      g.spy_sector ?? "",
      g.blurb_snippet ?? "",
      ...(g.aliases ?? []),
    ];
    rows.push({ kind: "group", text: parts.join(" ").trim(), ref: g });
  }
  return rows;
}

type Hit =
  | { kind: "ticker"; ref: SearchIndexTickerRowV0; key: string }
  | { kind: "theme"; ref: SearchIndexThemeRowV0; key: string }
  | { kind: "group"; ref: SearchIndexGroupRowV0; key: string };

function collectHits(index: SearchIndexV0, fuse: Fuse<FuseRow>, query: string): Hit[] {
  const q = query.trim();
  if (!q) {
    return [];
  }
  const qLower = q.toLowerCase();

  const lettersOnly = q.replace(/[^a-zA-Z]/g, "");
  const upper = lettersOnly.toUpperCase();
  const compact = q.replace(/\s/g, "");
  const tickerish =
    lettersOnly.length > 0 &&
    lettersOnly.length === compact.length &&
    /^[A-Za-z]{1,5}$/.test(lettersOnly);

  const seen = new Set<string>();
  const out: Hit[] = [];

  if (tickerish && upper.length >= 1) {
    const matches = index.tickers.filter((t) => t.ticker.startsWith(upper));
    matches.sort((a, b) => {
      const ex = a.ticker === upper ? 0 : 1;
      const ey = b.ticker === upper ? 0 : 1;
      if (ex !== ey) {
        return ex - ey;
      }
      return a.ticker.localeCompare(b.ticker);
    });
    for (const t of matches.slice(0, 10)) {
      const key = `ticker:${t.ticker}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ kind: "ticker", ref: t, key });
      }
    }
  }

  if (q.length < 2 && !tickerish) {
    return out.slice(0, 12);
  }

  // Guarantee obvious group-name matches are surfaced even when ticker/theme rows dominate fuzzy ranks.
  const directGroupMatches = index.groups
    .filter((g) => {
      const name = g.name.toLowerCase();
      const slug = g.slug.toLowerCase();
      return name.includes(qLower) || slug.includes(qLower);
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 2);
  for (const g of directGroupMatches) {
    const key = `group:${g.slug}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ kind: "group", ref: g, key });
    }
  }

  const fuzzy = fuse.search(q, { limit: 20 });
  const fuzzyHits: Hit[] = [];
  for (const r of fuzzy) {
    const row = r.item;
    let key: string;
    if (row.kind === "ticker") {
      key = `ticker:${row.ref.ticker}`;
    } else if (row.kind === "theme") {
      key = `theme:${row.ref.slug}`;
    } else {
      key = `group:${row.ref.slug}`;
    }
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    fuzzyHits.push(
      row.kind === "ticker"
        ? { kind: "ticker", ref: row.ref, key }
        : row.kind === "theme"
          ? { kind: "theme", ref: row.ref, key }
          : { kind: "group", ref: row.ref, key },
    );
  }

  // Ensure search results include discovery entities (groups/themes) when they match.
  const MAX_HITS = 14;
  const reservedGroups = fuzzyHits.filter((h) => h.kind === "group").slice(0, 2);
  const reservedThemes = fuzzyHits.filter((h) => h.kind === "theme").slice(0, 2);
  const promotedKeys = new Set<string>();
  for (const h of [...reservedGroups, ...reservedThemes]) {
    if (out.length >= MAX_HITS || promotedKeys.has(h.key)) {
      continue;
    }
    promotedKeys.add(h.key);
    out.push(h);
  }

  for (const h of fuzzyHits) {
    if (out.length >= MAX_HITS) {
      break;
    }
    if (promotedKeys.has(h.key)) {
      continue;
    }
    out.push(h);
  }

  return out;
}

type SearchEngine = { index: SearchIndexV0; fuse: Fuse<FuseRow> };

export function SiteSearch() {
  const router = useRouter();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const loadInflight = useRef(false);
  const prefetchedHrefsRef = useRef<Set<string>>(new Set());

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [engine, setEngine] = useState<SearchEngine | null>(null);
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
    const urls = searchIndexFetchUrls();
    Promise.all([
      import("fuse.js"),
      (async () => {
        let lastErr: unknown;
        for (const url of urls) {
          try {
            const res = await fetch(url, {
              credentials: "omit",
              ...(process.env.NODE_ENV === "development" ? { cache: "no-store" as const } : {}),
            });
            if (!res.ok) {
              lastErr = new Error(`HTTP ${res.status}`);
              continue;
            }
            return await res.text();
          } catch (e) {
            lastErr = e;
          }
        }
        throw lastErr instanceof Error ? lastErr : new Error("Failed to load search index");
      })(),
    ])
      .then(([fuseMod, raw]) => {
        const FuseCtor = fuseMod.default;
        const parsed = parseSearchIndex(raw);
        const fuse = new FuseCtor(buildFuseRows(parsed), {
          keys: ["text"],
          threshold: 0.38,
          ignoreLocation: true,
          minMatchCharLength: 1,
          includeScore: true,
        }) as Fuse<FuseRow>;
        setEngine({ index: parsed, fuse });
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

  const hits = useMemo(() => {
    if (!engine || !debounced.trim()) {
      return [];
    }
    return collectHits(engine.index, engine.fuse, debounced);
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
        posthog.capture("search_no_results", { query: debounced });
      }
    } else {
      noResultsReportedRef.current = null;
    }
  }, [engine, debounced, hits]);

  const goToHit = useCallback(
    (h: Hit) => {
      const slug = h.kind === "ticker" ? h.ref.theme_slugs[0] ?? null : h.ref.slug;
      posthog.capture("search_result_clicked", {
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
                        className={styles.row}
                        style={{
                          background: i === cursor ? "rgba(38, 252, 214, 0.08)" : undefined,
                        }}
                        role="option"
                        aria-selected={i === cursor}
                      >
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
                                    {h.ref.theme_names[j] ?? slug}
                                  </Link>
                                </span>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    ) : h.kind === "theme" ? (
                      <Link
                        href={`/themes/${encodeURIComponent(h.ref.slug)}`}
                        className={styles.row}
                        prefetch={false}
                        onMouseEnter={() =>
                          prefetchHref(`/themes/${encodeURIComponent(h.ref.slug)}`)
                        }
                        onFocus={() =>
                          prefetchHref(`/themes/${encodeURIComponent(h.ref.slug)}`)
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
                          <span className={styles.badge}>Theme</span>
                          {h.ref.name}
                        </div>
                        {h.ref.group_name ? (
                          <div className={styles.rowSub}>Group: {h.ref.group_name}</div>
                        ) : null}
                      </Link>
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
