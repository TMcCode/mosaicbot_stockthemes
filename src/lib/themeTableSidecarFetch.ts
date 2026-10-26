import { stockthemesRevalidateSeconds } from "@/lib/stockthemesCache";
import { themeTierBBrowserPath, themeTierBUrl } from "@/lib/themeTierB";
import { NOTES_SIDECAR_SUFFIX } from "@/lib/themeNotes";
import { QUALITY_RISK_SIDECAR_SUFFIX } from "@/lib/themeQualityRisk";
import { REVENUE_SIDECAR_SUFFIX, revenueSidecarHasSequentialLags } from "@/lib/themeRevenue";

export type ThemeTableSidecarKind = "revenue" | "quality_risk" | "notes";

const SUFFIX: Record<ThemeTableSidecarKind, string> = {
  revenue: REVENUE_SIDECAR_SUFFIX,
  quality_risk: QUALITY_RISK_SIDECAR_SUFFIX,
  notes: NOTES_SIDECAR_SUFFIX,
};

/** @deprecated Prefer gated `/cdn-app` — local public/data copies re-expose Tier B. */
export function themeTableSidecarLocalUrl(kind: ThemeTableSidecarKind, slug: string): string {
  return themeTierBBrowserPath(slug, SUFFIX[kind]);
}

export function themeTableSidecarRemoteUrl(
  kind: ThemeTableSidecarKind,
  dataBaseUrl: string,
  slug: string,
): string {
  return themeTierBUrl(dataBaseUrl, slug, SUFFIX[kind]);
}

/**
 * Cache bust for table sidecars (revenue / quality-risk).
 * Uses the production windowed bucket even in development unless
 * STOCKTHEMES_DEV_SIDECAR_NO_STORE=1 (opt into Date.now() busting).
 */
export function themeTableSidecarBrowserCacheBusterQuery(): string {
  const forceNoStore =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_STOCKTHEMES_DEV_SIDECAR_NO_STORE === "1";
  if (forceNoStore) {
    return `ts=${Date.now()}`;
  }
  const windowMs = stockthemesRevalidateSeconds() * 1000;
  const bucket = Math.floor(Date.now() / windowMs);
  return `ts=${bucket}`;
}

export function themeTableSidecarBrowserFetchCache(): RequestCache {
  const forceNoStore =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_STOCKTHEMES_DEV_SIDECAR_NO_STORE === "1";
  return forceNoStore ? "no-store" : "default";
}

/**
 * Browser: gated `/cdn-app` only (Tier B). SSR/build uses dataBaseUrl cache path.
 * Revenue sidecars skip a baked copy that predates L5Q/L4Q/L3Q (schema lag).
 * Returns null on 404.
 */
export async function fetchThemeTableSidecarText(
  kind: ThemeTableSidecarKind,
  slug: string,
  dataBaseUrl: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const q = themeTableSidecarBrowserCacheBusterQuery();
  const cache = themeTableSidecarBrowserFetchCache();
  const url = `${themeTableSidecarRemoteUrl(kind, dataBaseUrl, slug)}?${q}`;

  const res = await fetch(url, { credentials: "omit", cache, signal });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${kind} sidecar ${res.status}`);
  const text = await res.text();
  if (kind === "revenue" && !revenueSidecarHasSequentialLags(text)) {
    return null;
  }
  return text;
}
