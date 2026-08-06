import { readFile } from "fs/promises";
import path from "path";

import { parseJsonPayload } from "@/lib/parseJsonPayload";
import { fetchPublicJsonText } from "@/lib/stockthemesBuildCache";
import { stockthemesPublicDataBase, stockthemesServerUseFixtures } from "@/lib/stockthemesPublicBase";
import type { ThemeSlugRedirectsV0 } from "@/types/theme_slug_redirects.v0";

const FIXTURE_REL = path.join("public", "fixtures", "theme_slug_redirects.v0.json");
const CACHE_FILE = "theme_slug_redirects.v0.json";

function parseRedirects(raw: string): ThemeSlugRedirectsV0 {
  const data = parseJsonPayload<ThemeSlugRedirectsV0>(raw);
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported theme_slug_redirects schema_version: ${data.schema_version}`);
  }
  if (!data.redirects || typeof data.redirects !== "object") {
    return { schema_version: 0, redirects: {} };
  }
  return data;
}

/**
 * Load old→new theme slug redirects from CDN (or fixture). Missing file → empty map.
 */
export async function loadThemeSlugRedirects(): Promise<ThemeSlugRedirectsV0> {
  if (stockthemesServerUseFixtures()) {
    try {
      const raw = await readFile(path.join(process.cwd(), FIXTURE_REL), "utf8");
      return parseRedirects(raw);
    } catch {
      return { schema_version: 0, redirects: {} };
    }
  }
  const base = stockthemesPublicDataBase();
  if (!base) {
    try {
      const raw = await readFile(path.join(process.cwd(), FIXTURE_REL), "utf8");
      return parseRedirects(raw);
    } catch {
      return { schema_version: 0, redirects: {} };
    }
  }
  try {
    const raw = await fetchPublicJsonText(`${base}/${CACHE_FILE}`, CACHE_FILE);
    return parseRedirects(raw);
  } catch {
    return { schema_version: 0, redirects: {} };
  }
}

/** Resolve a possibly-retired slug to the current slug (follows one hop; collapses chains). */
export function resolveThemeSlugRedirect(
  slug: string,
  redirects: Record<string, string>,
): string | null {
  const start = String(slug || "").trim();
  if (!start) return null;
  let cur = start;
  const seen = new Set<string>();
  while (redirects[cur]) {
    if (seen.has(cur)) break;
    seen.add(cur);
    const next = String(redirects[cur] || "").trim();
    if (!next || next === cur) break;
    cur = next;
  }
  return cur !== start ? cur : null;
}
