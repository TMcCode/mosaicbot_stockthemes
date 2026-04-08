import { readFile } from "fs/promises";
import path from "path";

import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import type { ThemeDetailV0 } from "@/types/theme.detail.v0";

const FIXTURE_DIR = path.join("public", "fixtures", "themes");

function parseThemeDetail(raw: string): ThemeDetailV0 {
  const data = JSON.parse(raw) as ThemeDetailV0;
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported theme detail schema_version: ${data.schema_version}`);
  }
  if (!data.slug || !data.name || !Array.isArray(data.constituents)) {
    throw new Error("Invalid theme detail JSON: missing slug, name, or constituents");
  }
  return data;
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
  const base = stockthemesPublicDataBase();
  if (base) {
    const url = `${base}/themes/${encodeURIComponent(slug)}.json`;
    const devNoStore =
      process.env.NODE_ENV === "development" && process.env.STOCKTHEMES_DEV_NO_STORE === "1";
    const res = await fetch(url, devNoStore ? { cache: "no-store" } : { next: { revalidate: 300 } });
    if (!res.ok) {
      return null;
    }
    const detail = parseThemeDetail(await res.text());
    return { detail, source: "live" };
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
