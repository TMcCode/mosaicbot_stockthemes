"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import tableStyles from "@/components/CompareThemesTable.module.css";
import localStyles from "@/components/MyWatchlistPerformance.module.css";

import { useWatchlist } from "@/components/WatchlistProvider";
import { buildSelectedDateLookup, customDateHelpText } from "@/lib/customDateColumnHelp";
import { fetchCompareThemesClient } from "@/lib/fetchCompareThemesClient";
import { fetchManifestClient } from "@/lib/fetchManifestClient";
import { normalizeWatchlistKey } from "@/lib/watchlist/api";
import {
  resolveTrendingColumnOrder,
  trendingColumnHeader,
  valueForTrendingColumn,
} from "@/lib/trendingCompareMetrics";
import { trendingReturnHeatStyle } from "@/lib/trendingPerfHeat";
import type { CompareThemesRowV0 } from "@/types/compare_themes.v0";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

type Tab = "themes" | "tickers";

type TableRow = {
  slug: string;
  name: string;
  groupName?: string | null;
  compareReturns?: ThemeCompareReturnsV0 | null;
};

type SortState = { key: string; dir: "asc" | "desc" };

function fmtPct(v?: number): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function fmtAsOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    timeZone: "UTC",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type Props = {
  email: string;
};

export function MyWatchlistPerformance({ email }: Props) {
  const watchlist = useWatchlist();
  const [tab, setTab] = useState<Tab>("themes");
  const [compareAsOf, setCompareAsOf] = useState<string | null>(null);
  const [allRows, setAllRows] = useState<TableRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedDateByKey, setSelectedDateByKey] = useState(
    () => new Map<string, ManifestSelectedDateV0>(),
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadBusy, setLoadBusy] = useState(true);
  const [sorts, setSorts] = useState<SortState[]>([{ key: "10D", dir: "desc" }]);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadBusy(true);
    setLoadError(null);
    void Promise.all([fetchCompareThemesClient(), fetchManifestClient()])
      .then(([compare, manifest]) => {
        if (cancelled) return;
        if (!compare) {
          setLoadError("Compare data is not available in this environment.");
          setAllRows([]);
          setColumns([]);
          return;
        }
        setCompareAsOf(compare.as_of);
        const manifestLookup = buildSelectedDateLookup(manifest?.selected_dates);
        setSelectedDateByKey(manifestLookup);
        const rows: TableRow[] = compare.rows.map((r: CompareThemesRowV0) => ({
          slug: String(r.slug || "").trim(),
          name: String(r.name || "").trim(),
          groupName: r.group_name ?? null,
          compareReturns: r.compare_returns ?? null,
        }));
        setAllRows(rows);
        const fallbackCols = resolveTrendingColumnOrder(
          rows.map((r) => ({ compare_returns: r.compareReturns ?? undefined })),
        );
        const cols =
          Array.isArray(compare.columns) && compare.columns.length
            ? compare.columns.filter((c) => c !== "LstRpt %" && c !== "SinceLstRpt")
            : fallbackCols.filter((c) => c !== "LstRpt %" && c !== "SinceLstRpt");
        setColumns(cols);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Could not load performance data.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const savedThemeSlugs = useMemo(() => {
    if (!watchlist?.ready) return new Set<string>();
    return watchlist.themeKeys;
  }, [watchlist]);

  const watchlistRows = useMemo(() => {
    return allRows.filter((r) => savedThemeSlugs.has(normalizeWatchlistKey("theme", r.slug)));
  }, [allRows, savedThemeSlugs]);

  const sorted = useMemo(() => {
    const out = [...watchlistRows];
    out.sort((a, b) => {
      for (const s of sorts) {
        if (s.key === "Theme") {
          const cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
          if (cmp !== 0) return s.dir === "asc" ? cmp : -cmp;
          continue;
        }
        const va = valueForTrendingColumn(s.key, a.compareReturns ?? undefined, {});
        const vb = valueForTrendingColumn(s.key, b.compareReturns ?? undefined, {});
        const aOk = va != null && Number.isFinite(va);
        const bOk = vb != null && Number.isFinite(vb);
        if (aOk && bOk && va !== vb) return s.dir === "asc" ? va - vb : vb - va;
        if (aOk !== bOk) return aOk ? -1 : 1;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
    return out;
  }, [watchlistRows, sorts]);

  const savedTickers = useMemo(() => {
    if (!watchlist?.ready) return [];
    return [...watchlist.tickerKeys].sort((a, b) => a.localeCompare(b));
  }, [watchlist]);

  const onHeaderClick = (key: string, shiftKey: boolean) => {
    setSorts((prev) => {
      const idx = prev.findIndex((s) => s.key === key);
      const nextDir = idx >= 0 && prev[idx].dir === "desc" ? "asc" : "desc";
      if (!shiftKey) return [{ key, dir: nextDir }];
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { key, dir: nextDir };
        return copy;
      }
      return [...prev, { key, dir: nextDir }];
    });
  };

  const onRemoveTheme = useCallback(
    async (slug: string) => {
      if (!watchlist || removing) return;
      setRemoving(slug);
      try {
        await watchlist.toggle("theme", slug);
      } finally {
        setRemoving(null);
      }
    },
    [watchlist, removing],
  );

  const onRemoveTicker = useCallback(
    async (ticker: string) => {
      if (!watchlist || removing) return;
      setRemoving(ticker);
      try {
        await watchlist.toggle("ticker", ticker);
      } finally {
        setRemoving(null);
      }
    },
    [watchlist, removing],
  );

  return (
    <div className={localStyles.wrap}>
      <p className={styles.introCopy}>
        Signed in as {email}. Save up to 20 themes and 20 tickers with ☆ on theme pages or search.
      </p>

      <div className={localStyles.tabs} role="tablist" aria-label="Watchlist type">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "themes"}
          className={tab === "themes" ? localStyles.tabActive : localStyles.tab}
          onClick={() => setTab("themes")}
        >
          Themes ({watchlist?.themeCount ?? 0})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "tickers"}
          className={tab === "tickers" ? localStyles.tabActive : localStyles.tab}
          onClick={() => setTab("tickers")}
        >
          Tickers ({watchlist?.tickerCount ?? 0})
        </button>
      </div>

      {tab === "themes" ? (
        <>
          {loadBusy ? (
            <p className={localStyles.hint}>Loading performance…</p>
          ) : loadError ? (
            <p className={localStyles.hint}>{loadError}</p>
          ) : watchlistRows.length === 0 ? (
            <p className={localStyles.hint}>
              No themes saved yet.{" "}
              <Link href="/themes">Browse themes</Link> and use ☆ to add them here.
            </p>
          ) : (
            <>
              {compareAsOf ? (
                <p className={localStyles.metaLine}>Returns as of {fmtAsOf(compareAsOf)}.</p>
              ) : null}
              <p className={tableStyles.hint}>Click a header to sort. Shift+click adds secondary sort.</p>
              <div className={tableStyles.scrollWrap}>
                <div
                  className={tableStyles.table}
                  style={{
                    gridTemplateColumns: `minmax(280px, max-content) repeat(${columns.length}, minmax(84px, max-content))`,
                  }}
                >
                  <button
                    type="button"
                    className={`${tableStyles.head} ${tableStyles.sticky}`}
                    onClick={(e) => onHeaderClick("Theme", e.shiftKey)}
                  >
                    Theme
                  </button>
                  {columns.map((col) => {
                    const help = customDateHelpText(col, selectedDateByKey);
                    return (
                      <button
                        key={`h-${col}`}
                        type="button"
                        className={tableStyles.head}
                        onClick={(e) => onHeaderClick(col, e.shiftKey)}
                        title={help || trendingColumnHeader(col)}
                      >
                        {trendingColumnHeader(col)}
                        {help ? (
                          <span
                            className={styles.metricInfoAsterisk}
                            title={help}
                            aria-label={`${trendingColumnHeader(col)} explanation`}
                          >
                            *
                          </span>
                        ) : null}
                      </button>
                    );
                  })}

                  {sorted.flatMap((row) => {
                    const keyBase = row.slug;
                    const nameCell = (
                      <div
                        key={`${keyBase}-name`}
                        className={`${tableStyles.themeCell} ${tableStyles.sticky}`}
                      >
                        <div className={localStyles.themeRowInner}>
                          <button
                            type="button"
                            className={localStyles.removeBtn}
                            disabled={removing === row.slug}
                            onClick={() => void onRemoveTheme(row.slug)}
                          >
                            Remove
                          </button>
                          <Link href={`/themes/${row.slug}`} className={tableStyles.themeName}>
                            {row.name}
                          </Link>
                        </div>
                        {row.groupName ? (
                          <div className={tableStyles.meta}>{row.groupName}</div>
                        ) : null}
                      </div>
                    );
                    const valueCells = columns.map((col) => {
                      const v = valueForTrendingColumn(col, row.compareReturns ?? undefined, {});
                      const heat =
                        v != null && Number.isFinite(v) ? trendingReturnHeatStyle(v) : undefined;
                      return (
                        <div key={`${keyBase}-${col}`} className={tableStyles.value} style={heat}>
                          {fmtPct(v)}
                        </div>
                      );
                    });
                    return [nameCell, ...valueCells];
                  })}
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {savedTickers.length === 0 ? (
            <p className={localStyles.hint}>
              No tickers saved yet. Use search and ☆ on a ticker row to add one.
            </p>
          ) : (
            <div className={localStyles.tickerPills}>
              {savedTickers.map((ticker) => (
                <span key={ticker} className={localStyles.tickerPill}>
                  {ticker}
                  <button
                    type="button"
                    aria-label={`Remove ${ticker} from watchlist`}
                    disabled={removing === ticker}
                    onClick={() => void onRemoveTicker(ticker)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className={localStyles.hint}>
            Ticker performance columns will appear here once compare ticker data is published (Phase 4).
          </p>
        </>
      )}
    </div>
  );
}
