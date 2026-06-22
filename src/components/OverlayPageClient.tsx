"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { OverlayAddCombobox, type OverlayPick } from "@/components/OverlayAddCombobox";
import { OverlayMultiChart, type OverlayChartSeries } from "@/components/OverlayMultiChart";
import { OverlaySectorEtfControls } from "@/components/OverlaySectorEtfControls";
import chartLegendStyles from "@/components/Chart1yPanel.module.css";
import {
  fetchChartSidecar,
  overlayItemKey,
  parseOverlayItemKey,
} from "@/lib/chartSidecar";
import { OVERLAY_CHART_PALETTE } from "@/lib/overlayChartPalette";
import {
  overlaySectorItemKey,
  type OverlaySectorEtfCatalogEntry,
} from "@/lib/overlaySectorEtfs";
import {
  buildThemeTickersPreviewMapFromSearchIndex,
  loadSiteSearchEngine,
} from "@/lib/siteSearchHits";
import { applyShortThemePerformanceDisplay } from "@/lib/shortThemeChart";
import {
  computeOverlaySupportedCustomPeriodKeys,
  computeOverlaySupportedPeriods,
  OVERLAY_STANDARD_PERIODS,
  sliceAndRebaseIndexedPerformance,
  type OverlayChartPeriod,
  type OverlayStandardPeriod,
} from "@/lib/sliceIndexedChart";
import type { ChartPerformanceV0 } from "@/types/chart.v0";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";

import pageStyles from "@/app/page.module.css";

import styles from "./OverlayPageClient.module.css";

const MAX_SERIES = 12;

function isStandardPeriod(p: OverlayChartPeriod): p is OverlayStandardPeriod {
  return (OVERLAY_STANDARD_PERIODS as readonly string[]).includes(p);
}

type LoadedSeries = {
  key: string;
  kind: "theme" | "group" | "ticker";
  slug: string;
  name: string;
  rawPerformance: ChartPerformanceV0;
  loading: boolean;
  error?: string;
};

type GroupLegendMeta = {
  spySector?: string;
  themeCount?: number;
};

type Props = {
  eyebrow: string;
  selectedDates?: ManifestSelectedDateV0[];
  benchmarkPerformance?: ChartPerformanceV0;
  groupLegendMetaBySlug?: Record<string, GroupLegendMeta>;
  sectorEtfCatalog?: Record<string, OverlaySectorEtfCatalogEntry>;
};

function normalizeEventKey(raw: string): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

function itemsFromSearchParams(searchParams: URLSearchParams): string[] {
  const raw = searchParams.get("items");
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_SERIES);
}

function sectorsFromSearchParams(
  searchParams: URLSearchParams,
  catalog: Record<string, OverlaySectorEtfCatalogEntry>,
): string[] {
  const raw = searchParams.get("sectors");
  if (!raw) return [];
  const allowed = new Set(Object.keys(catalog));
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((t) => allowed.has(t));
}

export function OverlayPageClient({
  eyebrow,
  selectedDates,
  benchmarkPerformance,
  groupLegendMetaBySlug = {},
  sectorEtfCatalog = {},
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const abortRef = useRef<Map<string, AbortController>>(new Map());

  const availableSectorTickers = useMemo(
    () => new Set(Object.keys(sectorEtfCatalog)),
    [sectorEtfCatalog],
  );

  const [items, setItems] = useState<LoadedSeries[]>([]);
  const [themeTickersPreviewBySlug, setThemeTickersPreviewBySlug] = useState<Record<string, string>>(
    {},
  );
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [period, setPeriod] = useState<OverlayChartPeriod>("1Y");
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [showSectorEtfs, setShowSectorEtfs] = useState(
    () => sectorsFromSearchParams(searchParams, sectorEtfCatalog).length > 0,
  );
  const [selectedSectorTickers, setSelectedSectorTickers] = useState<string[]>(() =>
    sectorsFromSearchParams(searchParams, sectorEtfCatalog),
  );

  const customPeriods = useMemo(() => {
    const rows = selectedDates ?? [];
    return rows
      .map((r) => {
        const key = normalizeEventKey(String(r.day_name || ""));
        const date = String(r.date || "").trim().slice(0, 10);
        if (!key || !date) return null;
        return { key, label: String(r.day_name || key), date };
      })
      .filter((x): x is { key: string; label: string; date: string } => Boolean(x));
  }, [selectedDates]);

  const customAnchorByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of customPeriods) m.set(c.key, c.date);
    return m;
  }, [customPeriods]);

  const activeSectorTickers = useMemo(
    () => (showSectorEtfs ? selectedSectorTickers : []),
    [showSectorEtfs, selectedSectorTickers],
  );

  const countedSeries = items.length + activeSectorTickers.length;
  const maxSectorSelectable = Math.max(0, MAX_SERIES - items.length);

  const syncUrl = useCallback(
    (itemKeys: string[], sectorTickers: string[], sectorsEnabled: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (itemKeys.length) params.set("items", itemKeys.join(","));
      else params.delete("items");
      if (sectorsEnabled && sectorTickers.length) params.set("sectors", sectorTickers.join(","));
      else params.delete("sectors");
      const qs = params.toString();
      router.replace(qs ? `/overlay?${qs}` : "/overlay", { scroll: false });
    },
    [router, searchParams],
  );

  const loadOne = useCallback(async (pick: OverlayPick) => {
    const key = overlayItemKey(pick.kind, pick.slug);
    abortRef.current.get(key)?.abort();
    const ac = new AbortController();
    abortRef.current.set(key, ac);

    setItems((prev) => {
      const without = prev.filter((p) => p.key !== key);
      return [
        ...without,
        {
          key,
          kind: pick.kind,
          slug: pick.slug,
          name: pick.name,
          rawPerformance: { dates: [], values: [] },
          loading: true,
        },
      ];
    });

    try {
      const sidecar = await fetchChartSidecar(pick.kind, pick.slug, ac.signal);
      if (!sidecar) {
        setItems((prev) =>
          prev.map((p) =>
            p.key === key ? { ...p, loading: false, error: "Chart data unavailable" } : p,
          ),
        );
        return;
      }
      const perf = sidecar.performance;
      const values =
        pick.kind === "ticker"
          ? perf.values.map(Number)
          : applyShortThemePerformanceDisplay(sidecar.name, perf.values.map(Number), perf);
      setItems((prev) =>
        prev.map((p) =>
          p.key === key
            ? {
                ...p,
                name: sidecar.name,
                rawPerformance: { ...perf, values },
                loading: false,
                error: undefined,
              }
            : p,
        ),
      );
    } catch (e) {
      if (ac.signal.aborted) return;
      setItems((prev) =>
        prev.map((p) =>
          p.key === key ? { ...p, loading: false, error: "Failed to load chart" } : p,
        ),
      );
    } finally {
      abortRef.current.delete(key);
    }
  }, []);

  useEffect(() => {
    const keys = itemsFromSearchParams(searchParams);
    for (const key of keys) {
      const parsed = parseOverlayItemKey(key);
      if (!parsed) continue;
      void loadOne({
        kind: parsed.kind,
        slug: parsed.slug,
        name: parsed.kind === "ticker" ? parsed.slug : parsed.slug,
      });
    }
    // Initial URL hydration only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const themeSlugsNeedingPreview = useMemo(
    () =>
      items
        .filter((i) => i.kind === "theme" && !i.loading && !themeTickersPreviewBySlug[i.slug])
        .map((i) => i.slug),
    [items, themeTickersPreviewBySlug],
  );

  useEffect(() => {
    if (!themeSlugsNeedingPreview.length) return;

    let cancelled = false;
    void loadSiteSearchEngine()
      .then((engine) => {
        if (cancelled) return;
        const map = buildThemeTickersPreviewMapFromSearchIndex(engine.index);
        setThemeTickersPreviewBySlug((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const slug of themeSlugsNeedingPreview) {
            if (next[slug]) continue;
            const preview = map.get(slug);
            if (preview) {
              next[slug] = preview;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [themeSlugsNeedingPreview]);

  useEffect(() => {
    const maxSectors = maxSectorSelectable;
    if (selectedSectorTickers.length <= maxSectors) return;
    const next = selectedSectorTickers.slice(0, maxSectors);
    setSelectedSectorTickers(next);
    syncUrl(
      items.map((i) => i.key),
      next,
      showSectorEtfs,
    );
  }, [items, selectedSectorTickers, showSectorEtfs, syncUrl, maxSectorSelectable]);

  const selectedKeys = useMemo(() => new Set(items.map((i) => i.key)), [items]);

  const onAdd = useCallback(
    (pick: OverlayPick) => {
      const key = overlayItemKey(pick.kind, pick.slug);
      if (selectedKeys.has(key)) return;
      if (countedSeries >= MAX_SERIES) return;
      const nextKeys = [...items.map((i) => i.key), key];
      syncUrl(nextKeys, selectedSectorTickers, showSectorEtfs);
      void loadOne(pick);
    },
    [items, loadOne, selectedKeys, syncUrl, countedSeries, selectedSectorTickers, showSectorEtfs],
  );

  const onSectorTickersChange = useCallback(
    (tickers: string[]) => {
      const capped = tickers.slice(0, maxSectorSelectable);
      setSelectedSectorTickers(capped);
      syncUrl(
        items.map((i) => i.key),
        capped,
        showSectorEtfs,
      );
    },
    [items, maxSectorSelectable, showSectorEtfs, syncUrl],
  );

  const onSectorEnabledChange = useCallback(
    (enabled: boolean) => {
      setShowSectorEtfs(enabled);
      syncUrl(
        items.map((i) => i.key),
        selectedSectorTickers,
        enabled,
      );
    },
    [items, selectedSectorTickers, syncUrl],
  );

  const onRemove = useCallback(
    (key: string) => {
      abortRef.current.get(key)?.abort();
      abortRef.current.delete(key);
      setHiddenIds((prev) => {
        const n = new Set(prev);
        n.delete(key);
        return n;
      });
      const nextKeys = items.filter((i) => i.key !== key).map((i) => i.key);
      syncUrl(nextKeys, selectedSectorTickers, showSectorEtfs);
      setItems((prev) => prev.filter((p) => p.key !== key));
    },
    [items, syncUrl, selectedSectorTickers, showSectorEtfs],
  );

  const onRemoveSector = useCallback(
    (ticker: string) => {
      const next = selectedSectorTickers.filter((t) => t !== ticker);
      setSelectedSectorTickers(next);
      setHiddenIds((prev) => {
        const n = new Set(prev);
        n.delete(overlaySectorItemKey(ticker));
        return n;
      });
      syncUrl(
        items.map((i) => i.key),
        next,
        showSectorEtfs,
      );
    },
    [items, selectedSectorTickers, showSectorEtfs, syncUrl],
  );

  const toggleHidden = useCallback((id: string) => {
    setHiddenIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const referenceLastIso = useMemo(() => {
    const ends: string[] = [];
    if (benchmarkPerformance?.dates?.length) {
      ends.push(String(benchmarkPerformance.dates[benchmarkPerformance.dates.length - 1]));
    }
    for (const item of items) {
      const d = item.rawPerformance?.dates;
      if (d?.length) ends.push(String(d[d.length - 1]));
    }
    if (showSectorEtfs) {
      for (const ticker of activeSectorTickers) {
        const d = sectorEtfCatalog[ticker]?.performance?.dates;
        if (d?.length) ends.push(String(d[d.length - 1]));
      }
    }
    const normalized = ends.map((x) => x.trim().slice(0, 10)).filter((x) => x.length >= 10);
    normalized.sort();
    return normalized.at(-1);
  }, [items, benchmarkPerformance, showSectorEtfs, activeSectorTickers, sectorEtfCatalog]);

  const loadedChartPerformances = useMemo((): ChartPerformanceV0[] => {
    const performances: ChartPerformanceV0[] = [];
    if (showBenchmark && benchmarkPerformance?.dates?.length) {
      performances.push(benchmarkPerformance);
    }
    for (const item of items) {
      if (!item.loading && !item.error && item.rawPerformance?.dates?.length) {
        performances.push(item.rawPerformance);
      }
    }
    if (showSectorEtfs) {
      for (const ticker of activeSectorTickers) {
        const perf = sectorEtfCatalog[ticker]?.performance;
        if (perf?.dates?.length) performances.push(perf);
      }
    }
    return performances;
  }, [items, benchmarkPerformance, showBenchmark, showSectorEtfs, activeSectorTickers, sectorEtfCatalog]);

  const supportedPeriods = useMemo(
    () => computeOverlaySupportedPeriods(referenceLastIso, loadedChartPerformances),
    [referenceLastIso, loadedChartPerformances],
  );

  const supportedCustomPeriodKeys = useMemo(
    () =>
      computeOverlaySupportedCustomPeriodKeys(
        loadedChartPerformances,
        customPeriods.map((c) => ({ key: c.key, date: c.date })),
      ),
    [loadedChartPerformances, customPeriods],
  );

  useEffect(() => {
    if (isStandardPeriod(period) && !supportedPeriods.has(period)) {
      setPeriod("1Y");
    } else if (
      !isStandardPeriod(period) &&
      customPeriods.some((c) => c.key === period) &&
      !supportedCustomPeriodKeys.has(period)
    ) {
      setPeriod("1Y");
    }
  }, [period, supportedPeriods, supportedCustomPeriodKeys, customPeriods]);

  const chartSeries = useMemo((): OverlayChartSeries[] => {
    const anchor = isStandardPeriod(period) ? undefined : customAnchorByKey.get(normalizeEventKey(period));
    const out: OverlayChartSeries[] = [];
    let colorIndex = 0;

    items.forEach((item) => {
      if (item.loading || item.error || !item.rawPerformance?.dates?.length) return;
      const sliced = sliceAndRebaseIndexedPerformance(
        item.rawPerformance,
        period,
        anchor,
        referenceLastIso,
      );
      if (!sliced) return;
      const tickersPreview =
        item.kind === "theme" ? themeTickersPreviewBySlug[item.slug] : undefined;
      const groupMeta = item.kind === "group" ? groupLegendMetaBySlug[item.slug] : undefined;
      const legendMeta =
        item.kind === "ticker"
          ? item.slug
          : item.kind === "group"
            ? groupMeta?.spySector?.trim() ||
              (groupMeta?.themeCount
                ? `${groupMeta.themeCount} theme${groupMeta.themeCount === 1 ? "" : "s"}`
                : "Group")
            : undefined;
      out.push({
        id: item.key,
        name: item.name,
        kind: item.kind,
        color: OVERLAY_CHART_PALETTE[colorIndex % OVERLAY_CHART_PALETTE.length],
        performance: sliced,
        tickersPreview,
        legendMeta,
      });
      colorIndex += 1;
    });

    if (showSectorEtfs) {
      activeSectorTickers.forEach((ticker) => {
        const entry = sectorEtfCatalog[ticker];
        const raw = entry?.performance;
        if (!raw?.dates?.length) return;
        const sliced = sliceAndRebaseIndexedPerformance(raw, period, anchor, referenceLastIso);
        if (!sliced) return;
        out.push({
          id: overlaySectorItemKey(ticker),
          name: entry.name,
          kind: "etf",
          color: OVERLAY_CHART_PALETTE[colorIndex % OVERLAY_CHART_PALETTE.length],
          performance: sliced,
          legendMeta: ticker,
        });
        colorIndex += 1;
      });
    }

    return out;
  }, [
    items,
    period,
    customAnchorByKey,
    referenceLastIso,
    themeTickersPreviewBySlug,
    groupLegendMetaBySlug,
    showSectorEtfs,
    activeSectorTickers,
    sectorEtfCatalog,
  ]);

  const benchmarkSliced = useMemo(() => {
    if (!benchmarkPerformance) return undefined;
    const anchor = isStandardPeriod(period) ? undefined : customAnchorByKey.get(normalizeEventKey(period));
    return (
      sliceAndRebaseIndexedPerformance(
        benchmarkPerformance,
        period,
        anchor,
        referenceLastIso,
      ) ?? undefined
    );
  }, [benchmarkPerformance, period, customAnchorByKey, referenceLastIso]);

  const colorByKey = useMemo(() => {
    const m = new Map<string, string>();
    chartSeries.forEach((s) => m.set(s.id, s.color));
    return m;
  }, [chartSeries]);

  return (
    <>
      <div className={`${pageStyles.heroMain} ${pageStyles.heroMainCompare} ${styles.overlayHero}`}>
        <p className={pageStyles.eyebrow}>{eyebrow}</p>
        <h1>Theme compare chart</h1>
        <p className={pageStyles.introLead}>
          Compare up to {MAX_SERIES} themes, groups, tickers, or sector SPDRs on one indexed chart.
        </p>

        <div className={styles.toolbar}>
          <div className={styles.toolbarSearch}>
            <OverlayAddCombobox
              selectedKeys={selectedKeys}
              atLimit={countedSeries >= MAX_SERIES}
              onAdd={onAdd}
            />
          </div>
          <div className={styles.benchmarkCluster}>
            <label className={styles.benchmarkToggle}>
              <input
                type="checkbox"
                checked={showBenchmark}
                onChange={(e) => setShowBenchmark(e.target.checked)}
              />
              S&amp;P 500
            </label>
            {availableSectorTickers.size > 0 ? (
              <OverlaySectorEtfControls
                enabled={showSectorEtfs}
                onEnabledChange={onSectorEnabledChange}
                selectedTickers={selectedSectorTickers}
                onSelectedTickersChange={onSectorTickersChange}
                maxSelectable={maxSectorSelectable}
                availableTickers={availableSectorTickers}
              />
            ) : null}
          </div>
          <div className={styles.periodRow} role="group" aria-label="Chart period">
            {OVERLAY_STANDARD_PERIODS.map((p) => {
              const disabled = !supportedPeriods.has(p);
              return (
                <button
                  key={p}
                  type="button"
                  className={period === p ? styles.periodBtnActive : styles.periodBtn}
                  disabled={disabled}
                  title={
                    disabled
                      ? "Loaded series do not have enough history for this window yet"
                      : undefined
                  }
                  onClick={() => setPeriod(p)}
                >
                  {p}
                </button>
              );
            })}
            {customPeriods.map((c) => {
              const disabled = !supportedCustomPeriodKeys.has(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  className={period === c.key ? styles.periodBtnActive : styles.periodBtn}
                  disabled={disabled}
                  title={
                    disabled
                      ? `${c.date}: loaded series do not include this date yet`
                      : c.date
                  }
                  onClick={() => setPeriod(c.key)}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {(items.length > 0 || activeSectorTickers.length > 0) ? (
          <div className={styles.chips} aria-label="Selected series">
            {items.map((item) => (
              <span
                key={item.key}
                className={`${styles.chip} ${item.loading ? styles.chipLoading : ""}`}
              >
                {item.kind === "ticker" ? (
                  <span className={styles.chipLink}>
                    {item.name}
                    {item.loading ? " …" : null}
                  </span>
                ) : (
                  <Link
                    href={
                      item.kind === "group"
                        ? `/groups/${encodeURIComponent(item.slug)}`
                        : `/themes/${encodeURIComponent(item.slug)}`
                    }
                    className={styles.chipLink}
                  >
                    {item.name}
                    {item.loading ? " …" : null}
                  </Link>
                )}
                <button type="button" className={styles.removeBtn} onClick={() => onRemove(item.key)}>
                  Remove
                </button>
              </span>
            ))}
            {activeSectorTickers.map((ticker) => {
              const entry = sectorEtfCatalog[ticker];
              if (!entry) return null;
              return (
                <span key={overlaySectorItemKey(ticker)} className={styles.chip}>
                  <span className={styles.chipLink}>{entry.name}</span>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => onRemoveSector(ticker)}
                  >
                    Remove
                  </button>
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      <section className={`${pageStyles.section} ${pageStyles.compareSectionTight} ${styles.overlaySection}`}>
      <OverlayMultiChart
        series={chartSeries}
        benchmark={benchmarkSliced}
        hiddenIds={hiddenIds}
        showBenchmark={showBenchmark}
      />

      {chartSeries.length > 0 ? (
        <div className={styles.legend} role="group" aria-label="Series — click to show or hide">
          {chartSeries.map((s) => {
            const rightMeta = s.tickersPreview || s.legendMeta;
            const stackedLegend = Boolean(s.tickersPreview);
            return (
              <button
                key={s.id}
                type="button"
                className={`${chartLegendStyles.legendItemButton} ${!rightMeta ? chartLegendStyles.legendItemButtonTwoCol : ""} ${stackedLegend ? chartLegendStyles.legendItemButtonStacked : ""} ${hiddenIds.has(s.id) ? chartLegendStyles.legendItemMuted : ""}`}
                aria-pressed={!hiddenIds.has(s.id)}
                onClick={() => toggleHidden(s.id)}
              >
                <span className={chartLegendStyles.swatch} style={{ background: colorByKey.get(s.id) }} />
                <span className={chartLegendStyles.legendNameCell}>
                  <span className={chartLegendStyles.legendLabel}>{s.name}</span>
                </span>
                {rightMeta ? (
                  <span className={chartLegendStyles.legendTickers}>{rightMeta}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {items.some((i) => i.error) ? (
        <p className={styles.errorLine}>
          Some selections could not load chart data (try again after the next data publish).
        </p>
      ) : null}
      </section>
    </>
  );
}
