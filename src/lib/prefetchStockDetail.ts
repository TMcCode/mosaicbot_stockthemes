import { stockthemesBrowserCacheBusterQuery, stockthemesBrowserFetchCache } from "@/lib/stockthemesCache";
import {
  stockthemesBrowserSidecarFetchBase,
  stockthemesPublicDataBase,
} from "@/lib/stockthemesPublicBase";

const warmed = new Set<string>();

/** Warm public stock JSON on hover so on-demand open feels snappier. */
export function prefetchStockDetail(ticker: string): void {
  const t = String(ticker || "").trim();
  if (!t || warmed.has(t) || typeof window === "undefined") return;
  warmed.add(t);
  const base =
    stockthemesBrowserSidecarFetchBase() || stockthemesPublicDataBase() || "";
  if (!base) return;
  const q = stockthemesBrowserCacheBusterQuery();
  const url = `${base.replace(/\/$/, "")}/stocks/${encodeURIComponent(t)}.json?${q}`;
  void fetch(url, { credentials: "omit", cache: stockthemesBrowserFetchCache() }).catch(() => {
    warmed.delete(t);
  });
}
