import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";

import { stockthemesLiveFetchInit } from "@/lib/stockthemesPublicBase";

/** Default dev disk cache TTL when STOCKTHEMES_DEV_REVALIDATE_SEC is unset (seconds). */
const DEV_DISK_CACHE_DEFAULT_SEC = 120;

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
  return path.join(process.cwd(), custom || STOCKTHEMES_BUILD_CACHE_DIR);
}

function cachePathForRel(relPath: string): string {
  const safe = relPath.replace(/^\/+/, "");
  return path.join(cacheRoot(), safe);
}

function devDiskCacheDisabled(): boolean {
  return process.env.STOCKTHEMES_DEV_NO_STORE === "1";
}

function devDiskCacheMaxAgeMs(): number {
  const raw = process.env.STOCKTHEMES_DEV_REVALIDATE_SEC?.trim();
  if (raw) {
    const seconds = Number(raw);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }
  return DEV_DISK_CACHE_DEFAULT_SEC * 1000;
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
 * Fetch public JSON during static export / CI, preferring a on-disk cache to cut GCS egress.
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

  const devCached = await readDevDiskCache(cacheRelPath);
  if (devCached !== null) {
    return devCached;
  }

  const res = await fetch(url, stockthemesLiveFetchInit());
  if (!res.ok) {
    throw new Error(`fetch failed ${res.status}: ${url}`);
  }
  const text = await res.text();

  if (stockthemesBuildCacheEnabled()) {
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, text, "utf-8");
  } else {
    await writeDevDiskCache(cacheRelPath, text);
  }

  return text;
}
