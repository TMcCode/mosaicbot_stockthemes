"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ColorType, LineStyle, createChart, type ISeriesApi, type MouseEventParams } from "lightweight-charts";

import type { FactorMethodologyItem } from "@/lib/loadFactorMethodology";
import { loadFactorIndex } from "@/lib/loadFactorIndex";
import { loadFactorRows } from "@/lib/loadFactorRows";
import { loadFactorTimeseries } from "@/lib/loadFactorTimeseries";
import { publicAssetPath } from "@/lib/siteUrl";
import type { FactorIndexV0 } from "@/types/factor_index.v0";
import type { FactorTimeseriesV0 } from "@/types/factor_timeseries.v0";
import styles from "@/components/FactorsPageClient.module.css";

type Props = {
  dataBaseUrl: string;
  factorMethodology: Record<string, FactorMethodologyItem>;
};

function factorOptions(payload: FactorIndexV0): Array<{ id: string; label: string }> {
  return Object.entries(payload.factors)
    .map(([id, b]) => ({
      id,
      label: typeof b?.label === "string" ? b.label : id,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}

type DisplayRow = {
  theme: string;
  slug?: string | null;
  rank: number;
  total: number;
  score?: number | null;
  confidence?: number | null;
};

type ThemeChartSeries = {
  slug: string;
  theme: string;
  dates: string[];
  values: number[];
};

const COMPARE_COLORS = [
  "#7c9cff",
  "#ffb84d",
  "#ff6b9d",
  "#a78bfa",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#22d3ee",
  "#c4b5fd",
  "#fb7185",
  "#4ade80",
  "#fcd34d",
  "#60a5fa",
];
const FACTOR_LINE_COLOR = "#26fcd6";

function toDay(d: string): string {
  if (d.length >= 10 && d[4] === "-" && d[7] === "-") return d.slice(0, 10);
  const t = Date.parse(d);
  if (Number.isNaN(t)) return d;
  return new Date(t).toISOString().slice(0, 10);
}

function toPoints(dates: string[], values: number[]) {
  const n = Math.min(dates.length, values.length);
  const out: { time: string; value: number }[] = [];
  for (let i = 0; i < n; i++) {
    const v = Number(values[i]);
    if (!Number.isFinite(v)) continue;
    const day = toDay(String(dates[i]));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    out.push({ time: day, value: v });
  }
  out.sort((a, b) => a.time.localeCompare(b.time));
  return out;
}

function formatTooltipDate(time: MouseEventParams["time"] | undefined): string {
  if (!time) return "";
  if (typeof time === "string") return time;
  if (typeof time === "number") {
    const d = new Date(time * 1000);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  if (typeof time === "object" && "year" in time && "month" in time && "day" in time) {
    const y = Number((time as { year: number }).year);
    const m = Number((time as { month: number }).month);
    const d = Number((time as { day: number }).day);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";
    return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return "";
}

function lineDataValue(data: unknown): number | null {
  if (data && typeof data === "object" && "value" in data) {
    const v = Number((data as { value: unknown }).value);
    return Number.isFinite(v) ? v : null;
  }
  return null;
}

type FactorChartSeries = {
  id: string;
  label: string;
  dates: string[];
  values: number[];
  color: string;
  dashed?: boolean;
};

function FactorTrendChart({
  series,
  ariaLabel,
}: {
  series: FactorChartSeries[];
  ariaLabel: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !series.length) return;

    const chart = createChart(el, {
      autoSize: false,
      width: Math.max(el.clientWidth, 200),
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: "#0f1115" },
        textColor: "#a6abb9",
        fontSize: 12,
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.06)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
      crosshair: {
        vertLine: { visible: false, labelVisible: false },
        horzLine: { visible: false, labelVisible: false },
      },
      handleScale: { mouseWheel: false, pinch: false, axisPressedMouseMove: false },
      handleScroll: false,
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
        scaleMargins: { top: 0.1, bottom: 0.15 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const lineMeta = new Map<ISeriesApi<"Line">, { id: string; label: string }>();
    for (const s of series) {
      const api = chart.addLineSeries({
        color: s.color,
        lineWidth: s.id === "factor" ? 3 : 2,
        lineStyle: s.dashed ? LineStyle.Dotted : LineStyle.Solid,
        title: "",
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: s.id === "factor",
      });
      api.setData(toPoints(s.dates, s.values));
      lineMeta.set(api, { id: s.id, label: s.label });
    }
    chart.timeScale().fitContent();

    const onCrosshairMove = (param: MouseEventParams) => {
      const tip = tipRef.current;
      if (!tip || !param.point || !param.seriesData?.size) {
        if (tip) tip.style.display = "none";
        return;
      }

      let picked: ISeriesApi<"Line"> | undefined;
      let bestDist = Number.POSITIVE_INFINITY;
      for (const [rawApi, rawData] of param.seriesData) {
        const api = rawApi as ISeriesApi<"Line">;
        if (!lineMeta.has(api)) continue;
        const v = lineDataValue(rawData);
        if (v == null) continue;
        const y = api.priceToCoordinate(v);
        if (y == null) continue;
        const d = Math.abs(y - param.point.y);
        if (d < bestDist) {
          bestDist = d;
          picked = api;
        }
      }
      if (!picked) {
        tip.style.display = "none";
        return;
      }
      const data = param.seriesData.get(picked);
      const v = lineDataValue(data);
      const meta = lineMeta.get(picked);
      if (!meta || v == null) {
        tip.style.display = "none";
        return;
      }
      const date = formatTooltipDate(param.time);
      tip.textContent = `${date ? `${date} · ` : ""}${meta.label} — ${v.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
      tip.style.display = "block";
      tip.style.left = `${Math.round(param.point.x + 10)}px`;
      tip.style.top = `${Math.round(param.point.y + 10)}px`;
    };
    chart.subscribeCrosshairMove(onCrosshairMove);

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            if (!wrapRef.current) return;
            chart.applyOptions({ width: Math.max(wrapRef.current.clientWidth, 200) });
            chart.timeScale().fitContent();
          })
        : null;
    ro?.observe(el);

    return () => {
      ro?.disconnect();
      chart.unsubscribeCrosshairMove(onCrosshairMove);
      try {
        chart.remove();
      } catch {}
    };
  }, [series]);

  return (
    <div className={styles.factorChartCanvasWrap}>
      <div ref={wrapRef} className={styles.factorChartCanvas} role="img" aria-label={ariaLabel} />
      <div className={styles.factorChartBrand} aria-hidden="true">
        <img src={publicAssetPath("/brand/logo-full-dark-tight.png")} alt="" loading="lazy" decoding="async" />
      </div>
      <div ref={tipRef} className={styles.factorChartTooltip} />
    </div>
  );
}

function normalizeRows(rawEntries: unknown[]): DisplayRow[] {
  if (!rawEntries.length) return [];
  const totalFallback = rawEntries.length;
  return rawEntries
    .map((raw, idx) => {
      if (!raw || typeof raw !== "object") return null;
      const row = raw as Record<string, unknown>;
      const theme = typeof row.theme === "string" ? row.theme : "";
      if (!theme) return null;
      const rankNum = Number(row.rank);
      const totalNum = Number(row.total);
      const scoreNum = Number(row.score);
      const confNum = Number(row.confidence);
      return {
        theme,
        slug: typeof row.slug === "string" ? row.slug : null,
        rank: Number.isFinite(rankNum) && rankNum > 0 ? Math.floor(rankNum) : idx + 1,
        total: Number.isFinite(totalNum) && totalNum > 0 ? Math.floor(totalNum) : totalFallback,
        score: Number.isFinite(scoreNum) ? scoreNum : null,
        confidence: Number.isFinite(confNum) ? confNum : null,
      } as DisplayRow;
    })
    .filter((x): x is DisplayRow => Boolean(x));
}

function scoreText(score?: number | null): string {
  if (score == null || !Number.isFinite(score)) return "—";
  return String(Math.round(score));
}

export function FactorsPageClient({ dataBaseUrl, factorMethodology }: Props) {
  const [indexPayload, setIndexPayload] = useState<FactorIndexV0 | null>(null);
  const [timeseries, setTimeseries] = useState<FactorTimeseriesV0 | null>(null);
  const [selectedFactorId, setSelectedFactorId] = useState<string>("");
  const [rowsCache, setRowsCache] = useState<Record<string, DisplayRow[]>>({});
  const [themeSeriesCache, setThemeSeriesCache] = useState<Record<string, ThemeChartSeries | null>>({});
  const [selectedThemes, setSelectedThemes] = useState<Array<{ slug: string; theme: string }>>([]);
  const [isMobileCompare, setIsMobileCompare] = useState(false);
  const [visibleClosestCount, setVisibleClosestCount] = useState(50);
  const [visibleLeastCount, setVisibleLeastCount] = useState(50);
  const [status, setStatus] = useState<"loading" | "ok" | "empty" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadFactorIndex(dataBaseUrl), loadFactorTimeseries(dataBaseUrl)])
      .then(([next, ts]) => {
        if (cancelled) return;
        if (!next || !Object.keys(next.factors || {}).length) {
          setStatus("empty");
          return;
        }
        setIndexPayload(next);
        setTimeseries(ts);
        const opts = factorOptions(next);
        setSelectedFactorId(opts[0]?.id || "");
        setStatus("ok");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [dataBaseUrl]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedFactorId || rowsCache[selectedFactorId]) return;
    loadFactorRows(dataBaseUrl, selectedFactorId)
      .then((res) => {
        if (cancelled || !res?.entries) return;
        const nextRows = normalizeRows(res.entries as unknown[]);
        setRowsCache((prev) => ({ ...prev, [selectedFactorId]: nextRows }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dataBaseUrl, rowsCache, selectedFactorId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 900px)");
    const sync = () => setIsMobileCompare(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const compareCap = isMobileCompare ? 3 : 8;

  useEffect(() => {
    setSelectedThemes((prev) => prev.slice(0, compareCap));
  }, [compareCap]);

  useEffect(() => {
    let cancelled = false;
    const missing = selectedThemes.filter((t) => themeSeriesCache[t.slug] === undefined);
    if (!missing.length) return;
    Promise.all(
      missing.map(async (item) => {
        try {
          const res = await fetch(`${dataBaseUrl.replace(/\/$/, "")}/themes/${encodeURIComponent(item.slug)}.json`, {
            cache: "force-cache",
          });
          if (!res.ok) return [item.slug, null] as const;
          const payload = (await res.json()) as {
            chart_1y?: { performance?: { dates?: unknown; values?: unknown } };
          };
          const datesRaw = payload?.chart_1y?.performance?.dates;
          const valuesRaw = payload?.chart_1y?.performance?.values;
          const dates = Array.isArray(datesRaw) ? datesRaw.filter((v): v is string => typeof v === "string") : [];
          const values = Array.isArray(valuesRaw) ? valuesRaw.map((v) => Number(v)).filter((v) => Number.isFinite(v)) : [];
          if (!dates.length || !values.length || dates.length !== values.length) return [item.slug, null] as const;
          return [item.slug, { ...item, dates, values }] as const;
        } catch {
          return [item.slug, null] as const;
        }
      }),
    ).then((pairs) => {
      if (cancelled) return;
      setThemeSeriesCache((prev) => {
        const next = { ...prev };
        for (const [slug, series] of pairs) next[slug] = series;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [dataBaseUrl, selectedThemes, themeSeriesCache]);

  const options = useMemo(() => (indexPayload ? factorOptions(indexPayload) : []), [indexPayload]);
  const rows = rowsCache[selectedFactorId] ?? [];
  const closestRows = useMemo(() => rows.slice(0, visibleClosestCount), [rows, visibleClosestCount]);
  const leastRows = useMemo(
    () => [...rows].sort((a, b) => b.rank - a.rank).slice(0, visibleLeastCount),
    [rows, visibleLeastCount],
  );
  const selectedMethod = selectedFactorId ? factorMethodology[selectedFactorId] : null;
  const series = selectedFactorId ? timeseries?.factors?.[selectedFactorId] : null;
  const totalRows = indexPayload?.factors?.[selectedFactorId]?.total ?? rows[0]?.total ?? 0;
  const selectedThemeSeries = useMemo(
    () =>
      selectedThemes
        .map((item, idx) => {
          const s = themeSeriesCache[item.slug];
          if (!s?.values?.length) return null;
          return { ...s, color: COMPARE_COLORS[idx % COMPARE_COLORS.length] };
        })
        .filter((x): x is ThemeChartSeries & { color: string } => Boolean(x)),
    [selectedThemes, themeSeriesCache],
  );
  const chartSeries = useMemo(() => {
    if (!series?.values?.length) return [] as FactorChartSeries[];
    const base: FactorChartSeries = {
      id: "factor",
      label: `${series.label} factor`,
      dates: series.dates,
      values: series.values,
      color: FACTOR_LINE_COLOR,
    };
    return [
      ...selectedThemeSeries.map((s) => ({
        id: `theme-${s.slug}`,
        label: s.theme,
        dates: s.dates,
        values: s.values,
        color: s.color,
      })),
      base,
    ];
  }, [selectedThemeSeries, series]);
  const toggleThemeSelection = (row: DisplayRow) => {
    const slug = row.slug;
    if (!slug) return;
    setSelectedThemes((prev) => {
      const exists = prev.some((x) => x.slug === slug);
      if (exists) return prev.filter((x) => x.slug !== slug);
      if (prev.length >= compareCap) return prev;
      return [...prev, { slug, theme: row.theme }];
    });
  };
  const isSelectedTheme = (slug?: string | null) => Boolean(slug && selectedThemes.some((x) => x.slug === slug));
  const seriesChange = useMemo(() => {
    if (!series?.values?.length || series.values.length < 2) return null;
    const first = series.values[0];
    const last = series.values[series.values.length - 1];
    if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return null;
    return ((last / first - 1) * 100).toFixed(1);
  }, [series]);

  if (status === "loading") return <p className={styles.empty}>Loading factor rankings…</p>;
  if (status === "empty") return <p className={styles.empty}>No factor ranking data is available yet.</p>;
  if (status === "error" || !indexPayload) return <p className={styles.empty}>Could not load factor rankings.</p>;

  return (
    <>
      <div className={styles.controls}>
        <div className={styles.fieldRow}>
          <label htmlFor="factor-select" className={styles.label}>
            Factor
          </label>
          <select
            id="factor-select"
            className={styles.select}
            value={selectedFactorId}
            onChange={(e) => {
              setSelectedFactorId(e.target.value);
              setVisibleClosestCount(50);
              setVisibleLeastCount(50);
            }}
          >
            {options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <p className={styles.meta}>
          {totalRows ? totalRows.toLocaleString() : "—"} ranked themes
          {indexPayload.as_of ? ` · As of ${indexPayload.as_of.slice(0, 10)}` : ""}
        </p>
        {selectedMethod ? (
          <p className={styles.explainer} aria-live="polite">
            {selectedMethod.summary}
          </p>
        ) : null}
      </div>
      {series?.values?.length ? (
        <div className={styles.chartWrap}>
          <div className={styles.chartHead}>
            <p className={styles.chartTitle}>
              {series.label} factor trend (1Y)
              {seriesChange ? (
                <span className={styles.chartDelta}> · {Number(seriesChange) >= 0 ? "+" : ""}{seriesChange}%</span>
              ) : null}
            </p>
            <div className={styles.compareControls}>
              <span className={styles.compareHint}>
                Compare themes ({selectedThemes.length}/{compareCap})
              </span>
              {selectedThemes.length ? (
                <button type="button" className={styles.clearBtn} onClick={() => setSelectedThemes([])}>
                  Clear
                </button>
              ) : null}
            </div>
          </div>
          <FactorTrendChart series={chartSeries} ariaLabel={`${series.label} factor chart`} />
          <div className={styles.compareLegend}>
            <span className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ background: FACTOR_LINE_COLOR }} />
              {series.label} factor
            </span>
            {selectedThemeSeries.map((item) => (
              <span key={`legend-${item.slug}`} className={styles.legendItem}>
                <span className={styles.legendSwatch} style={{ background: item.color }} />
                {item.theme}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <div className={styles.rankingGrid}>
        <section className={styles.panel} aria-label="Closest themes">
          <h3 className={styles.panelTitle}>Closest (Top {Math.min(visibleClosestCount, 250)})</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Cmp</th>
                  <th scope="col">Rank</th>
                  <th scope="col">Theme</th>
                  <th scope="col">Score</th>
                </tr>
              </thead>
              <tbody>
                {closestRows.map((row) => (
                  <tr key={`${selectedFactorId}-${row.rank}-${row.theme}`}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Compare ${row.theme}`}
                        checked={isSelectedTheme(row.slug)}
                        disabled={!row.slug || (!isSelectedTheme(row.slug) && selectedThemes.length >= compareCap)}
                        onChange={() => toggleThemeSelection(row)}
                      />
                    </td>
                    <td className={`${styles.scoreCell} ${styles.rankCell}`}>#{row.rank}</td>
                    <td>
                      {row.slug ? (
                        <Link href={`/themes/${row.slug}`} className={styles.themeLink}>
                          {row.theme}
                        </Link>
                      ) : (
                        row.theme
                      )}
                    </td>
                    <td className={styles.scoreCell}>{scoreText(row.score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visibleClosestCount < 250 ? (
            <div className={styles.panelActions}>
              <button
                type="button"
                className={styles.moreBtn}
                onClick={() => setVisibleClosestCount((n) => Math.min(n + 50, 250))}
              >
                Show 50 more
              </button>
            </div>
          ) : null}
        </section>
        <section className={styles.panel} aria-label="Least close themes">
          <h3 className={styles.panelTitle}>
            Least close (Bottom {Math.min(visibleLeastCount, 250)}{totalRows ? ` of ${totalRows.toLocaleString()}` : ""})
          </h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Cmp</th>
                  <th scope="col">Rank</th>
                  <th scope="col">Theme</th>
                  <th scope="col">Score</th>
                </tr>
              </thead>
              <tbody>
                {leastRows.map((row) => (
                  <tr key={`${selectedFactorId}-least-${row.rank}-${row.theme}`}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Compare ${row.theme}`}
                        checked={isSelectedTheme(row.slug)}
                        disabled={!row.slug || (!isSelectedTheme(row.slug) && selectedThemes.length >= compareCap)}
                        onChange={() => toggleThemeSelection(row)}
                      />
                    </td>
                    <td className={`${styles.scoreCell} ${styles.rankCell}`}>#{row.rank}</td>
                    <td>
                      {row.slug ? (
                        <Link href={`/themes/${row.slug}`} className={styles.themeLink}>
                          {row.theme}
                        </Link>
                      ) : (
                        row.theme
                      )}
                    </td>
                    <td className={styles.scoreCell}>{scoreText(row.score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visibleLeastCount < 250 ? (
            <div className={styles.panelActions}>
              <button
                type="button"
                className={styles.moreBtn}
                onClick={() => setVisibleLeastCount((n) => Math.min(n + 50, 250))}
              >
                Show 50 more
              </button>
            </div>
          ) : null}
        </section>
      </div>
      <p className={styles.caption}>
        {totalRows ? totalRows.toLocaleString() : "—"} ranked themes
        {indexPayload.as_of ? ` · As of ${indexPayload.as_of.slice(0, 10)}` : ""}
      </p>
    </>
  );
}
