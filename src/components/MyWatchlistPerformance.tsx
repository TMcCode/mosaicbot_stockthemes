"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import tableStyles from "@/components/CompareThemesTable.module.css";
import localStyles from "@/components/MyWatchlistPerformance.module.css";

import { WatchlistThemeAddCombobox } from "@/components/WatchlistThemeAddCombobox";
import { useWatchlist } from "@/components/WatchlistProvider";
import { buildSelectedDateLookup, customDateHelpText } from "@/lib/customDateColumnHelp";
import type {
  MyWatchlistCompareData,
  MyWatchlistCompareRow,
} from "@/lib/prepareMyWatchlistCompareData";
import { formatSiteDataPublished } from "@/lib/formatSiteDataPublished";
import { normalizeWatchlistKey } from "@/lib/watchlist/api";
import { trendingColumnHeader, valueForTrendingColumn } from "@/lib/trendingCompareMetrics";
import { trendingReturnHeatStyle } from "@/lib/trendingPerfHeat";
import type { ThemeCompareReturnsV0 } from "@/types/theme.detail.v0";

type SortState = { key: string; dir: "asc" | "desc" };

function fmtPct(v?: number): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

type Props = {
  email: string;
  compareData: MyWatchlistCompareData;
};

export function MyWatchlistPerformance({ email, compareData }: Props) {
  const watchlist = useWatchlist();
  const [sorts, setSorts] = useState<SortState[]>([{ key: "10D", dir: "desc" }]);
  const [removing, setRemoving] = useState<string | null>(null);

  const compareAsOf = compareData.available ? compareData.asOf : null;
  const allRows: MyWatchlistCompareRow[] = compareData.available ? compareData.rows : [];
  const columns = compareData.available ? compareData.columns : [];
  const loadError = compareData.available ? null : compareData.message;
  const selectedDateByKey = useMemo(
    () =>
      buildSelectedDateLookup(
        compareData.available ? compareData.selectedDates : undefined,
      ),
    [compareData],
  );

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
        const va = valueForTrendingColumn(s.key, a.compareReturns ?? undefined, {}, a.name);
        const vb = valueForTrendingColumn(s.key, b.compareReturns ?? undefined, {}, b.name);
        const aOk = va != null && Number.isFinite(va);
        const bOk = vb != null && Number.isFinite(vb);
        if (aOk && bOk && va !== vb) return s.dir === "asc" ? va - vb : vb - va;
        if (aOk !== bOk) return aOk ? -1 : 1;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
    return out;
  }, [watchlistRows, sorts]);

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

  return (
    <div className={localStyles.wrap}>
      <p className={localStyles.accountLine}>Signed in as {email}</p>

      <div className={localStyles.toolbar}>
        <p className={localStyles.limits}>
          {watchlist?.ready
            ? `${watchlist.themeCount} of 20 themes saved`
            : "Up to 20 themes"}
        </p>
      </div>

      <section className={localStyles.addCard} aria-label="Add theme to watchlist">
        <h2 className={localStyles.addCardTitle}>Add to watchlist</h2>
        <WatchlistThemeAddCombobox embedded />
        <p className={localStyles.addCardHint}>
          Search by name, or save with ☆ on <Link href="/themes">theme pages</Link> and in site search.
        </p>
      </section>

      {loadError ? (
        <p className={localStyles.emptyHint}>{loadError}</p>
      ) : watchlistRows.length === 0 ? (
        <p className={localStyles.emptyHint}>
          No themes saved yet — use the search above or{" "}
          <Link href="/themes">browse themes</Link>.
        </p>
      ) : (
        <section className={localStyles.tableSection} aria-label="Watchlist performance">
          <p className={localStyles.sortHint}>
            Click a header to sort. Shift+click adds secondary sort.
          </p>
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
                  const v = valueForTrendingColumn(col, row.compareReturns ?? undefined, {}, row.name);
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
          {compareAsOf ? (
                <p className={localStyles.asOfLine}>
                  Returns as of {formatSiteDataPublished(compareAsOf)} (same publish as footer).
                </p>
          ) : null}
        </section>
      )}

      <footer className={localStyles.siteFooter}>
        <nav className={localStyles.footerNav} aria-label="Watchlist page links">
          <Link href="/themes">Browse themes</Link>
          {" · "}
          <Link href="/compare">Compare all themes</Link>
          {" · "}
          <Link href="/">Home</Link>
        </nav>
      </footer>
    </div>
  );
}
