import { readFile } from "fs/promises";
import path from "path";

import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { fetchPublicJsonText, invalidateDevDiskCache } from "@/lib/stockthemesBuildCache";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { ThemeDetailV0 } from "@/types/theme.detail.v0";

const FIXTURE_DIR = path.join("public", "fixtures", "themes");

function parseThemeDetail(raw: string): ThemeDetailV0 {
  const data = parseJsonPayload<ThemeDetailV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported theme detail schema_version: ${data.schema_version}`);
  }
  if (!data.slug || !data.name || !Array.isArray(data.constituents)) {
    throw new Error("Invalid theme detail JSON: missing slug, name, or constituents");
  }
  return data;
}

async function loadLiveThemeDetail(slug: string, bypassDevCache: boolean): Promise<ThemeDetailV0 | null> {
  const base = stockthemesPublicDataBase();
  if (!base) return null;
  const rel = `themes/${slug}.json`;
  const url = `${base}/themes/${encodeURIComponent(slug)}.json`;
  let raw: string;
  try {
    raw = await fetchPublicJsonText(url, rel, { bypassDevCache });
  } catch {
    return null;
  }
  try {
    return parseThemeDetail(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[stockthemes] Invalid theme JSON for ${slug} (${msg}).`);
    return null;
  }
}

export type ThemeDetailLoadResult = {
  detail: ThemeDetailV0;
  /** `live` = fetched from public bucket; `fixture` = public/fixtures/themes/<slug>.json */
  source: "live" | "fixture";
};

/**
 * Loads themes/<slug>.json from the same public origin as the manifest, or from local fixtures.
 */
export async function loadThemeDetail(slug: string): Promise<ThemeDetailLoadResult | null> {
  if (stockthemesPublicDataBase()) {
    let detail = await loadLiveThemeDetail(slug, false);
    if (!detail && process.env.NODE_ENV === "development") {
      await invalidateDevDiskCache(`themes/${slug}.json`);
      detail = await loadLiveThemeDetail(slug, true);
    }
    return detail ? { detail, source: "live" } : null;
  }

  const abs = path.join(process.cwd(), FIXTURE_DIR, `${slug}.json`);
  try {
    const raw = await readFile(abs, "utf-8");
    const detail = parseThemeDetail(raw);
    return { detail, source: "fixture" };
  } catch {
    return null;
  }
}
