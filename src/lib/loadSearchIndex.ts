import { readFile } from "fs/promises";
import path from "path";

import { parseSearchIndex } from "@/lib/searchThemeHits";
import { stockthemesPublicDataBase } from "@/lib/stockthemesPublicBase";
import { fetchPublicJsonText } from "@/lib/stockthemesBuildCache";
import type { SearchIndexV0 } from "@/types/search_index.v0";

const FIXTURE_REL = path.join("public", "fixtures", "search_index.v0.json");
const DEFAULT_OBJECT = "search_index.v0.json";

function searchIndexUrl(): string | undefined {
  const fromEnv = process.env.NEXT_PUBLIC_STOCKTHEMES_SEARCH_INDEX_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (process.env.STOCKTHEMES_USE_FIXTURES === "1") {
    return undefined;
  }
  const base = stockthemesPublicDataBase();
  if (!base) {
    return undefined;
  }
  return `${base.replace(/\/$/, "")}/${DEFAULT_OBJECT}`;
}

export type SearchIndexLoadResult = {
  index: SearchIndexV0;
  source: "live" | "fixture";
};

export async function loadSearchIndex(): Promise<SearchIndexLoadResult> {
  const url = searchIndexUrl();
  if (url) {
    const raw = await fetchPublicJsonText(url, DEFAULT_OBJECT);
    return { index: parseSearchIndex(raw), source: "live" };
  }
  const abs = path.join(process.cwd(), FIXTURE_REL);
  const raw = await readFile(abs, "utf-8");
  return { index: parseSearchIndex(raw), source: "fixture" };
}

export function buildTickerToThemeNamesMap(index: SearchIndexV0): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const row of index.tickers ?? []) {
    const ticker = String(row.ticker || "")
      .trim()
      .toUpperCase();
    const names = (row.theme_names ?? []).map((n) => String(n || "").trim()).filter(Boolean);
    if (ticker && names.length) {
      out.set(ticker, names);
    }
  }
  return out;
}
