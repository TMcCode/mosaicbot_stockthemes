import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";

import { stockthemesLiveFetchInit } from "@/lib/stockthemesPublicBase";

/** Default dev disk cache TTL when STOCKTHEMES_DEV_REVALIDATE_SEC is unset (seconds). */
const DEV_DISK_CACHE_DEFAULT_SEC = 120;
/** With STOCKTHEMES_DEV_VIA_R2=1, default longer TTL so UI work does not re-auth to R2 every 2 min. */
const DEV_DISK_CACHE_R2_DEFAULT_SEC = 600;

/** Relative paths under `.cache/stockthemes-public/` mirror public bucket keys. */
export const STOCKTHEMES_BUILD_CACHE_DIR = ".cache/stockthemes-public";

export function stockthemesBuildCacheEnabled(): boolean {
  if (process.env.STOCKTHEMES_USE_FIXTURES === "1") {
    return false;
  }
  if (process.env.STOCKTHEMES_BUILD_CACHE === "0") {
    return false;
  }
  return (
    process.env.STOCKTHEMES_BUILD_CACHE === "1" ||
    process.env.STOCKTHEMES_STATIC_PAGES === "1"
  );
}

function cacheRoot(): string {
  const custom = process.env.STOCKTHEMES_BUILD_CACHE_DIR?.trim();
  const subdir = custom || STOCKTHEMES_BUILD_CACHE_DIR;
  // Prevent Turbopack from tracing the entire .cache tree (breaks dev chunks).
  return path.join(/* turbopackIgnore: true */ process.cwd(), subdir);
}

function cachePathForRel(relPath: string): string {
  const safe = relPath.replace(/^\/+/, "");
  return path.join(/* turbopackIgnore: true */ cacheRoot(), safe);
}

function devDiskCacheDisabled(): boolean {
  return process.env.STOCKTHEMES_DEV_NO_STORE === "1";
}

function devViaGcsEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    (process.env.STOCKTHEMES_DEV_VIA_R2 === "1" || process.env.STOCKTHEMES_DEV_VIA_GCS === "1") &&
    Boolean(
      process.env.R2_ENDPOINT_URL?.trim() ||
        process.env.r2_endpoint?.trim() ||
        process.env.S3_ENDPOINT_API?.trim() ||
        process.env.S3_endpoint_API?.trim(),
    )
  );
}

function isDetailJsonRel(relPath: string): boolean {
  const rel = relPath.replace(/^\/+/, "");
  return /^themes\/[^/]+\.json$/.test(rel) || /^groups\/[^/]+\.json$/.test(rel);
}

/** Manifest/theme/group JSON must come from R2 in dev when enabled (no stale CDN fallback). */
function devRequireGcsForRel(relPath: string): boolean {
  if (!devViaGcsEnabled()) return false;
  const rel = relPath.replace(/^\/+/, "");
  return rel === "manifest.json" || isDetailJsonRel(rel);
}

type GcsDownloadMod = {
  downloadGcsObject: (objectPath: string) => Promise<string>;
};

let gcsDownloadModPromise: Promise<GcsDownloadMod> | null = null;

function loadGcsDownloadMod(): Promise<GcsDownloadMod> {
  if (!gcsDownloadModPromise) {
    const modPath = path.join(process.cwd(), "scripts/lib/gcsDownload.mjs");
    gcsDownloadModPromise = import(/* webpackIgnore: true */ pathToFileURL(modPath).href) as Promise<GcsDownloadMod>;
  }
  return gcsDownloadModPromise;
}

async function fetchDevGcsObject(relPath: string): Promise<string> {
  const mod = await loadGcsDownloadMod();
  return mod.downloadGcsObject(relPath.replace(/^\/+/, ""));
}

/** Read dev cache ignoring TTL (for as_of comparison). */
async function readDevDiskCacheRaw(relPath: string): Promise<string | null> {
  if (process.env.NODE_ENV !== "development" || devDiskCacheDisabled()) {
    return null;
  }
  try {
    return await readFile(cachePathForRel(relPath), "utf-8");
  } catch {
    return null;
  }
}

async function devDetailOlderThanCachedManifest(detailText: string): Promise<boolean> {
  try {
    const detail = JSON.parse(detailText) as { as_of?: string };
    const detailAsOf = String(detail.as_of || "");
    if (!detailAsOf) return false;
    const manifestText = await readDevDiskCacheRaw("manifest.json");
    if (!manifestText) return false;
    const manifest = JSON.parse(manifestText) as { as_of?: string };
    const manifestAsOf = String(manifest.as_of || "");
    return Boolean(manifestAsOf && detailAsOf < manifestAsOf);
  } catch {
    return false;
  }
}

function devDiskCacheMaxAgeMs(): number {
  const raw = process.env.STOCKTHEMES_DEV_REVALIDATE_SEC?.trim();
  if (raw) {
    const seconds = Number(raw);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }
  const defaultSec = devViaGcsEnabled() ? DEV_DISK_CACHE_R2_DEFAULT_SEC : DEV_DISK_CACHE_DEFAULT_SEC;
  return defaultSec * 1000;
}

/** Local `.cache/stockthemes-public/` reads in `next dev` (avoids CDN on every navigation). */
async function readDevDiskCache(relPath: string): Promise<string | null> {
  if (process.env.NODE_ENV !== "development" || devDiskCacheDisabled()) {
    return null;
  }
  const abs = cachePathForRel(relPath);
  try {
    const st = await stat(abs);
    if (Date.now() - st.mtimeMs > devDiskCacheMaxAgeMs()) {
      return null;
    }
    return await readFile(abs, "utf-8");
  } catch {
    return null;
  }
}

async function writeDevDiskCache(relPath: string, text: string): Promise<void> {
  if (process.env.NODE_ENV !== "development" || devDiskCacheDisabled()) {
    return;
  }
  const abs = cachePathForRel(relPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, text, "utf-8");
}

/**
 * Fetch public JSON during static export / CI, preferring an on-disk cache.
 * In `next dev`, also reads/writes `.cache/stockthemes-public/` (see STOCKTHEMES_DEV_REVALIDATE_SEC).
 * Browser runtime does not use this module.
 */
export async function fetchPublicJsonText(
  url: string,
  cacheRelPath: string,
): Promise<string> {
  const abs = cachePathForRel(cacheRelPath);
  if (stockthemesBuildCacheEnabled()) {
    try {
      return await readFile(abs, "utf-8");
    } catch {
      // miss — fetch and persist below
    }
  }

  // Dev disk cache (default 120s) — used even with STOCKTHEMES_DEV_VIA_R2=1; R2 only on miss/stale.
  if (process.env.NODE_ENV === "development" && !devDiskCacheDisabled()) {
    let devCached = await readDevDiskCache(cacheRelPath);
    if (devCached !== null && isDetailJsonRel(cacheRelPath) && (await devDetailOlderThanCachedManifest(devCached))) {
      devCached = null;
    }
    if (devCached !== null) {
      return devCached;
    }
  }

  if (devViaGcsEnabled()) {
    try {
      const text = await fetchDevGcsObject(cacheRelPath);
      await writeDevDiskCache(cacheRelPath, text);
      return text;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const strict =
        process.env.STOCKTHEMES_DEV_GCS_STRICT === "1" && devRequireGcsForRel(cacheRelPath);
      if (strict) {
        throw new Error(
          `[stockthemes] STOCKTHEMES_DEV_VIA_R2=1 (strict) but R2 fetch failed for ${cacheRelPath}: ${msg}`,
        );
      }
      console.warn(
        `[stockthemes] R2 fetch failed for ${cacheRelPath} (${msg}); trying public URL (${url}).`,
      );
    }
  }

  let text: string;
  try {
    const res = await fetch(url, stockthemesLiveFetchInit());
    if (!res.ok) {
      throw new Error(`fetch failed ${res.status}: ${url}`);
    }
    text = await res.text();
  } catch (cdnErr) {
    const stale = await readDevDiskCacheRaw(cacheRelPath);
    if (stale && process.env.NODE_ENV === "development") {
      const msg = cdnErr instanceof Error ? cdnErr.message : String(cdnErr);
      console.warn(
        `[stockthemes] CDN fetch failed for ${cacheRelPath} (${msg}); using stale disk cache.`,
      );
      return stale;
    }
    throw cdnErr;
  }

  if (stockthemesBuildCacheEnabled()) {
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, text, "utf-8");
  } else if (process.env.NODE_ENV === "development" && !devDiskCacheDisabled()) {
    await writeDevDiskCache(cacheRelPath, text);
  }

  return text;
}
