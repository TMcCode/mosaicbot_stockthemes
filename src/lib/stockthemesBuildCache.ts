import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { stockthemesLiveFetchInit } from "@/lib/stockthemesPublicBase";

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

/**
 * Fetch public JSON during static export / CI, preferring a on-disk cache to cut GCS egress.
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

  const res = await fetch(url, stockthemesLiveFetchInit());
  if (!res.ok) {
    throw new Error(`fetch failed ${res.status}: ${url}`);
  }
  const text = await res.text();

  if (stockthemesBuildCacheEnabled()) {
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, text, "utf-8");
  }

  return text;
}
