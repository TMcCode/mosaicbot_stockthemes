import type { ThemeDetailConstituentV0, ThemeDetailV0 } from "@/types/theme.detail.v0";
import type { ThemeChart1yV0 } from "@/types/chart.v0";
import type { ThemePriceReturnsSidecarV0 } from "@/types/theme.price_returns.v0";

export function mergeThemeDetailPriceReturns(
  server: ThemeDetailV0,
  live: ThemeDetailV0,
): ThemeDetailV0 {
  const liveByTicker = new Map(
    (live.constituents || []).map((c) => [String(c.ticker || "").trim().toUpperCase(), c]),
  );
  const constituents = (server.constituents || []).map((c) => {
    const liveC = liveByTicker.get(String(c.ticker || "").trim().toUpperCase());
    if (!liveC?.price_returns) return c;
    return { ...c, price_returns: liveC.price_returns } satisfies ThemeDetailConstituentV0;
  });
  return {
    ...server,
    constituents,
    ticker_performance_as_of: live.ticker_performance_as_of ?? server.ticker_performance_as_of,
    as_of: live.as_of ?? server.as_of,
  };
}

/** Refresh Prev/Next report dates from full theme JSON (price_returns sidecars omit them). */
export function mergeThemeDetailEarningsSchedule(
  server: ThemeDetailV0,
  live: ThemeDetailV0,
): ThemeDetailV0 {
  const liveByTicker = new Map(
    (live.constituents || []).map((c) => [String(c.ticker || "").trim().toUpperCase(), c]),
  );
  let changed = false;
  const constituents = (server.constituents || []).map((c) => {
    const liveC = liveByTicker.get(String(c.ticker || "").trim().toUpperCase());
    if (!liveC) return c;
    const next: ThemeDetailConstituentV0 = { ...c };
    let rowChanged = false;
    const copyKeys = [
      "last_report_date",
      "next_report_date",
      "last_before_after_market",
      "next_before_after_market",
      "earnings_percent_last_report",
      "earnings_percent_prev_report",
      "pre_earnings_percent_last_report",
      "since_last_rpt_percent",
      "last_rpt_percent",
      "last_rpt_live_percent",
      "last_rpt_final_percent",
      "last_rpt_is_final",
    ] as const;
    for (const key of copyKeys) {
      if (!Object.prototype.hasOwnProperty.call(liveC, key)) continue;
      const value = liveC[key as keyof ThemeDetailConstituentV0];
      if (next[key as keyof ThemeDetailConstituentV0] !== value) {
        Object.assign(next, { [key]: value });
        rowChanged = true;
      }
    }
    if (rowChanged) {
      changed = true;
      return next;
    }
    return c;
  });
  if (!changed) return server;
  return { ...server, constituents };
}

export type MergeThemeDetailLiveOptions = {
  prices?: boolean;
  compareReturns?: boolean;
  composition?: boolean;
  /** Merge Prev/Next report dates from live theme JSON (default true). */
  earningsSchedule?: boolean;
};

/** Merge selected live fields from CDN theme JSON into the build-time snapshot. */
export function mergeThemeDetailLiveFields(
  server: ThemeDetailV0,
  live: ThemeDetailV0,
  options: MergeThemeDetailLiveOptions = {},
): ThemeDetailV0 {
  const prices = options.prices !== false;
  const compareReturns = options.compareReturns === true;
  const composition = options.composition === true;
  const earningsSchedule = options.earningsSchedule !== false;

  let merged = prices ? mergeThemeDetailPriceReturns(server, live) : { ...server };

  if (earningsSchedule) {
    merged = mergeThemeDetailEarningsSchedule(merged, live);
  }

  if (compareReturns && live.compare_returns) {
    merged = { ...merged, compare_returns: live.compare_returns };
  }

  if (composition && live.chart_1y?.composition_indexed) {
    const chart1y: ThemeChart1yV0 = {
      ...(merged.chart_1y ?? {}),
      composition_indexed: live.chart_1y.composition_indexed,
    };
    merged = { ...merged, chart_1y: chart1y };
  }

  return merged;
}

function parseThemeDetail(raw: unknown): ThemeDetailV0 {
  const data = raw as ThemeDetailV0;
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported theme detail schema_version: ${data.schema_version}`);
  }
  if (!data.slug || !data.name || !Array.isArray(data.constituents)) {
    throw new Error("Invalid theme detail JSON");
  }
  return data;
}

export function parseThemePriceReturnsSidecar(
  raw: unknown,
): ThemePriceReturnsSidecarV0 {
  const data = raw as ThemePriceReturnsSidecarV0;
  if (data.schema_version !== "theme.price_returns.v0") {
    throw new Error(`Unsupported price returns schema_version: ${data.schema_version}`);
  }
  if (!data.slug || !data.name || !Array.isArray(data.constituents)) {
    throw new Error("Invalid theme price returns sidecar");
  }
  for (const constituent of data.constituents) {
    if (!constituent?.ticker || !constituent.price_returns) {
      throw new Error("Invalid theme price returns constituent");
    }
  }
  return data;
}

function sidecarAsThemeDetail(sidecar: ThemePriceReturnsSidecarV0): ThemeDetailV0 {
  return {
    schema_version: 0,
    slug: sidecar.slug,
    name: sidecar.name,
    as_of: sidecar.as_of,
    build_id: sidecar.build_id,
    ticker_performance_as_of: sidecar.ticker_performance_as_of,
    constituents: sidecar.constituents,
    compare_returns: sidecar.compare_returns,
  };
}

type Entry = {
  merged: ThemeDetailV0;
  fetchedAtMs: number;
  tickerPerformanceAsOf?: string;
};

type Listener = () => void;

const entries = new Map<string, Entry>();
const listeners = new Map<string, Set<Listener>>();
const inflight = new Map<string, Promise<ThemeDetailV0>>();

function cacheKey(slug: string, dataBaseUrl: string): string {
  return `${dataBaseUrl}::${slug}`;
}

function notify(key: string) {
  for (const listener of listeners.get(key) || []) {
    listener();
  }
}

export function subscribeLiveThemeDetail(key: string, listener: Listener): () => void {
  const set = listeners.get(key) || new Set<Listener>();
  set.add(listener);
  listeners.set(key, set);
  return () => {
    const current = listeners.get(key);
    if (!current) return;
    current.delete(listener);
    if (!current.size) listeners.delete(key);
  };
}

export function getLiveThemeDetailEntry(key: string): Entry | undefined {
  return entries.get(key);
}

export async function refreshLiveThemeDetail({
  slug,
  dataBaseUrl,
  serverDetail,
  fetchJson,
  mergeOptions,
}: {
  slug: string;
  dataBaseUrl: string;
  serverDetail: ThemeDetailV0;
  fetchJson: (url: string) => Promise<unknown>;
  mergeOptions?: MergeThemeDetailLiveOptions;
}): Promise<ThemeDetailV0> {
  const key = cacheKey(slug, dataBaseUrl);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const encodedSlug = encodeURIComponent(slug);
    const previous = entries.get(key)?.merged;
    let live: ThemeDetailV0;
    let usedPriceReturnsSidecar = false;
    try {
      const sidecar = parseThemePriceReturnsSidecar(
        await fetchJson(
          `${dataBaseUrl}/themes/${encodedSlug}.price_returns.v0.json`,
        ),
      );
      live = sidecarAsThemeDetail(sidecar);
      usedPriceReturnsSidecar = true;
    } catch {
      live = parseThemeDetail(
        await fetchJson(`${dataBaseUrl}/themes/${encodedSlug}.json`),
      );
    }
    // Slim price_returns sidecars omit chart_1y and earnings schedule dates.
    let scheduleSource: ThemeDetailV0 | null = null;
    if (usedPriceReturnsSidecar) {
      const needComposition =
        mergeOptions?.composition === true && !live.chart_1y?.composition_indexed;
      if (needComposition && previous?.chart_1y?.composition_indexed) {
        live = { ...live, chart_1y: previous.chart_1y };
      }
      const needFull =
        mergeOptions?.earningsSchedule !== false ||
        (needComposition && !live.chart_1y?.composition_indexed);
      if (needFull) {
        try {
          const full = parseThemeDetail(
            await fetchJson(`${dataBaseUrl}/themes/${encodedSlug}.json`),
          );
          scheduleSource = full;
          if (full.chart_1y?.composition_indexed) {
            live = {
              ...live,
              chart_1y: {
                ...(live.chart_1y ?? {}),
                composition_indexed: full.chart_1y.composition_indexed,
              },
            };
          }
        } catch {
          /* keep price_returns-only merge; ThemeChartLiveHydrate may still fetch composition */
        }
      }
    }
    let merged = mergeThemeDetailLiveFields(serverDetail, live, {
      ...mergeOptions,
      // Earnings come from full theme JSON when available (sidecar omits them).
      earningsSchedule: scheduleSource ? false : mergeOptions?.earningsSchedule !== false,
    });
    if (scheduleSource) {
      merged = mergeThemeDetailEarningsSchedule(merged, scheduleSource);
    }
    entries.set(key, {
      merged,
      fetchedAtMs: Date.now(),
      tickerPerformanceAsOf: merged.ticker_performance_as_of,
    });
    notify(key);
    return merged;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

export function liveThemeDetailCacheKey(slug: string, dataBaseUrl: string): string {
  return cacheKey(slug, dataBaseUrl);
}

export function seedLiveThemeDetail(key: string, serverDetail: ThemeDetailV0): void {
  if (entries.has(key)) return;
  entries.set(key, {
    merged: serverDetail,
    fetchedAtMs: 0,
    tickerPerformanceAsOf: serverDetail.ticker_performance_as_of,
  });
}
