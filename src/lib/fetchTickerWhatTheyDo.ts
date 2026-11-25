import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { stockthemesBrowserSidecarFetchBase } from "@/lib/stockthemesPublicBase";
import { clipPlainBlurb } from "@/lib/clipPlainBlurb";

const WHAT_THEY_DO_KEY = "What they do (plain English & analogies)";

const inflight = new Map<string, Promise<string | null>>();

function overviewRelPath(ticker: string): string {
  return `stockcontext/tickers/${encodeURIComponent(ticker.toUpperCase())}/tables/overview.v0.json`;
}

function extractWhatTheyDo(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const rows = (payload as { rows?: unknown }).rows;
  if (!Array.isArray(rows) || !rows.length) return null;
  const row = rows[0];
  if (!row || typeof row !== "object") return null;
  const raw = (row as Record<string, unknown>)[WHAT_THEY_DO_KEY];
  if (typeof raw !== "string") return null;
  const clipped = clipPlainBlurb(raw, 180);
  return clipped || null;
}

/**
 * Plain-English “what they do” from stockcontext overview (Ticker_DetailedOverview fold-in).
 * Silent null on 404 / missing field (~8/9 tickers).
 */
export function fetchTickerWhatTheyDo(ticker: string): Promise<string | null> {
  const key = ticker.trim().toUpperCase();
  if (!key) return Promise.resolve(null);

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const base = stockthemesBrowserSidecarFetchBase();
    if (!base) return null;
    const q = stockthemesBrowserCacheBusterQuery();
    const url = `${base.replace(/\/$/, "")}/${overviewRelPath(key)}${q ? `?${q}` : ""}`;
    try {
      const res = await fetch(url, { cache: stockthemesBrowserFetchCache() });
      if (!res.ok) return null;
      return extractWhatTheyDo(await res.json());
    } catch {
      return null;
    }
  })();

  inflight.set(key, promise);
  return promise;
}
