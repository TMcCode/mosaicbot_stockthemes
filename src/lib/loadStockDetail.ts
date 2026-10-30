import { readdir, readFile } from "fs/promises";
import path from "path";

import {
  mergeStockDetailWithApp,
  parseStockAppPayload,
  stockAppSidecarRel,
  stockAppSidecarUrl,
} from "@/lib/mergeStockApp";
import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { fetchPublicJsonText, invalidateDevDiskCache } from "@/lib/stockthemesBuildCache";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { StockAppV0 } from "@/types/stock.app.v0";
import type { StockDetailV0 } from "@/types/stock.detail.v0";
import {
  STOCK_PRICE_RETURNS_SIDECAR_SUFFIX,
  type StockPriceReturnsSidecarV0,
} from "@/types/stock.price_returns.v0";
import type { ConstituentPriceReturnsV0 } from "@/types/theme.detail.v0";
import { stockTierBUrl } from "@/lib/stockTierB";

const FIXTURE_DIR = path.join("public", "fixtures", "stocks");

function parseStockDetail(raw: string): StockDetailV0 {
  const data = parseJsonPayload<StockDetailV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported stock detail schema_version: ${data.schema_version}`);
  }
  if (!data.ticker || !Array.isArray(data.themes)) {
    throw new Error("Invalid stock detail JSON: missing ticker or themes");
  }
  return data;
}

async function loadLiveStockApp(
  ticker: string,
  bypassDevCache: boolean,
): Promise<StockAppV0 | null> {
  const base = stockthemesPublicDataBase();
  if (!base) return null;
  const rel = stockAppSidecarRel(ticker);
  const url = stockAppSidecarUrl(base, ticker);
  try {
    const raw = await fetchPublicJsonText(url, rel, { bypassDevCache });
    return parseStockAppPayload(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function loadLiveStockDetail(
  ticker: string,
  bypassDevCache: boolean,
): Promise<StockDetailV0 | null> {
  const base = stockthemesPublicDataBase();
  if (!base) return null;
  const rel = `stocks/${ticker}.json`;
  const url = `${base}/stocks/${encodeURIComponent(ticker)}.json`;
  let raw: string;
  try {
    raw = await fetchPublicJsonText(url, rel, { bypassDevCache });
  } catch {
    return null;
  }
  try {
    const publicDetail = parseStockDetail(raw);
    const app = await loadLiveStockApp(ticker, bypassDevCache);
    return mergeStockDetailWithApp(publicDetail, app);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[stockthemes] Invalid stock JSON for ${ticker} (${msg}).`);
    return null;
  }
}

function parseStockPriceReturns(data: unknown): StockPriceReturnsSidecarV0 | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (obj.schema_version !== "stock.price_returns.v0") return null;
  if (typeof obj.ticker !== "string" || !obj.ticker.trim()) return null;
  if (!obj.price_returns || typeof obj.price_returns !== "object") return null;
  return data as StockPriceReturnsSidecarV0;
}

async function loadStockPriceReturns(
  ticker: string,
  bypassDevCache: boolean,
): Promise<ConstituentPriceReturnsV0 | null> {
  const base = stockthemesPublicDataBase();
  if (base) {
    const rel = `stocks/${ticker}${STOCK_PRICE_RETURNS_SIDECAR_SUFFIX}`;
    const url = stockTierBUrl(base, ticker, STOCK_PRICE_RETURNS_SIDECAR_SUFFIX);
    try {
      const raw = await fetchPublicJsonText(url, rel, { bypassDevCache });
      const parsed = parseStockPriceReturns(JSON.parse(raw));
      return parsed?.price_returns ?? null;
    } catch {
      return null;
    }
  }
  try {
    const raw = await readFile(
      path.join(process.cwd(), FIXTURE_DIR, `${ticker}${STOCK_PRICE_RETURNS_SIDECAR_SUFFIX}`),
      "utf-8",
    );
    const parsed = parseStockPriceReturns(JSON.parse(raw));
    return parsed?.price_returns ?? null;
  } catch {
    return null;
  }
}

export type StockDetailLoadResult = {
  detail: ReturnType<typeof mergeStockDetailWithApp>;
  priceReturns?: ConstituentPriceReturnsV0 | null;
  /** `live` = fetched from public bucket; `fixture` = public/fixtures/stocks/<ticker>.json */
  source: "live" | "fixture";
};

/**
 * Loads stocks/<ticker>.json (+ optional stocks/<ticker>.app.v0.json Tier B merge).
 */
export async function loadStockDetail(ticker: string): Promise<StockDetailLoadResult | null> {
  const key = String(ticker || "").trim();
  if (!key) return null;

  if (stockthemesPublicDataBase()) {
    let detail = await loadLiveStockDetail(key, false);
    let priceReturns = await loadStockPriceReturns(key, false);
    if (!detail && process.env.NODE_ENV === "development") {
      await invalidateDevDiskCache(`stocks/${key}.json`);
      await invalidateDevDiskCache(stockAppSidecarRel(key));
      await invalidateDevDiskCache(`stocks/${key}${STOCK_PRICE_RETURNS_SIDECAR_SUFFIX}`);
      detail = await loadLiveStockDetail(key, true);
      priceReturns = await loadStockPriceReturns(key, true);
    }
    return detail ? { detail, priceReturns, source: "live" } : null;
  }

  const abs = path.join(process.cwd(), FIXTURE_DIR, `${key}.json`);
  try {
    const raw = await readFile(abs, "utf-8");
    let detail = parseStockDetail(raw);
    try {
      const appRaw = await readFile(
        path.join(process.cwd(), FIXTURE_DIR, `${key}.app.v0.json`),
        "utf-8",
      );
      detail = mergeStockDetailWithApp(detail, parseStockAppPayload(JSON.parse(appRaw)));
    } catch {
      /* optional fixture sidecar */
    }
    const priceReturns = await loadStockPriceReturns(key, false);
    return { detail, priceReturns, source: "fixture" };
  } catch {
    return null;
  }
}

/** Fixture tickers that have `public/fixtures/stocks/<T>.json` (for offline generateStaticParams). */
export async function listStockFixtureTickers(): Promise<string[]> {
  try {
    const names = await readdir(path.join(process.cwd(), FIXTURE_DIR));
    return names
      .filter((f) => f.endsWith(".json") && !f.includes(".app.") && !f.includes(".price_returns."))
      .map((f) => f.replace(/\.json$/, ""))
      .filter(Boolean)
      .sort();
  } catch {
    return [];
  }
}
