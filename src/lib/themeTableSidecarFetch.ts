import { publicAssetPath } from "@/lib/siteUrl";
import { stockthemesRevalidateSeconds } from "@/lib/stockthemesCache";
import { QUALITY_RISK_SIDECAR_SUFFIX } from "@/lib/themeQualityRisk";
import { REVENUE_SIDECAR_SUFFIX } from "@/lib/themeRevenue";

export type ThemeTableSidecarKind = "revenue" | "quality_risk";

const SUFFIX: Record<ThemeTableSidecarKind, string> = {
  revenue: REVENUE_SIDECAR_SUFFIX,
  quality_risk: QUALITY_RISK_SIDECAR_SUFFIX,
};

/** Same-origin path under `public/data/themes/` (filled by sync-build-cache). */
export function themeTableSidecarLocalUrl(kind: ThemeTableSidecarKind, slug: string): string {
  return publicAssetPath(`/data/themes/${encodeURIComponent(slug)}${SUFFIX[kind]}`);
}

export function themeTableSidecarRemoteUrl(
  kind: ThemeTableSidecarKind,
  dataBaseUrl: string,
  slug: string,
): string {
  return `${dataBaseUrl.replace(/\/$/, "")}/themes/${encodeURIComponent(slug)}${SUFFIX[kind]}`;
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
 * Prefer same-origin build artifact, then fall back to public R2/CDN.
 * Returns null on 404 from both.
 */
export async function fetchThemeTableSidecarText(
  kind: ThemeTableSidecarKind,
  slug: string,
  dataBaseUrl: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const q = themeTableSidecarBrowserCacheBusterQuery();
  const cache = themeTableSidecarBrowserFetchCache();
  const localUrl = `${themeTableSidecarLocalUrl(kind, slug)}?${q}`;
  const remoteUrl = `${themeTableSidecarRemoteUrl(kind, dataBaseUrl, slug)}?${q}`;

  try {
    const localRes = await fetch(localUrl, { credentials: "omit", cache, signal });
    if (localRes.ok) return localRes.text();
  } catch (err) {
    if (signal?.aborted) throw err;
  }

  const remoteRes = await fetch(remoteUrl, { credentials: "omit", cache, signal });
  if (remoteRes.status === 404) return null;
  if (!remoteRes.ok) throw new Error(`${kind} sidecar ${remoteRes.status}`);
  return remoteRes.text();
}
