import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { stockthemesBrowserSidecarFetchBase } from "@/lib/stockthemesPublicBase";
import type {
  ThemeNewsIndexV0,
  ThemeNewsItemV0,
  ThemeNewsMonthV0,
} from "@/types/theme.news.v0";

/** CDN / rewrite path under the public data base (no leading slash). */
export function themeNewsRelPath(slug: string, file: string): string {
  return `stockcontext/themes/${encodeURIComponent(slug)}/news/${file}`;
}

function parseItems(value: unknown): ThemeNewsItemV0[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (i): i is ThemeNewsItemV0 =>
      Boolean(i) && typeof i.url === "string" && typeof i.title === "string" && Boolean(i.id),
  );
}

export function parseThemeNewsIndex(raw: unknown): ThemeNewsIndexV0 | null {
  const row = (raw ?? {}) as Record<string, unknown>;
  if (row.schema_version !== "theme.news.index.v0" || typeof row.slug !== "string") return null;
  const months = Array.isArray(row.months)
    ? (row.months as { month?: unknown; count?: unknown }[])
        .filter((m) => typeof m?.month === "string" && /^\d{4}-\d{2}$/.test(m.month as string))
        .map((m) => ({ month: m.month as string, count: Number(m.count) || 0 }))
    : [];
  const latest = parseItems(row.latest);
  if (!latest.length) return null;
  return {
    schema_version: "theme.news.index.v0",
    slug: row.slug,
    theme_name: typeof row.theme_name === "string" ? row.theme_name : row.slug,
    total: Number(row.total) || latest.length,
    months,
    latest,
  };
}

function newsFetchUrl(rel: string): string | null {
  const base = stockthemesBrowserSidecarFetchBase();
  if (!base) return null;
  const q = stockthemesBrowserCacheBusterQuery();
  return `${base}/${rel}${q ? `?${q}` : ""}`;
}

/** Lazy index fetch — call only when the news panel is near the viewport. */
export async function fetchThemeNewsIndex(
  slug: string,
  signal?: AbortSignal,
): Promise<ThemeNewsIndexV0 | null> {
  const url = newsFetchUrl(themeNewsRelPath(slug, "index.v0.json"));
  if (!url) return null;
  try {
    const res = await fetch(url, {
      credentials: "omit",
      cache: stockthemesBrowserFetchCache(),
      signal,
    });
    if (!res.ok) return null;
    return parseThemeNewsIndex(await res.json());
  } catch {
    return null;
  }
}

export async function fetchThemeNewsMonth(
  slug: string,
  month: string,
  signal?: AbortSignal,
): Promise<ThemeNewsItemV0[]> {
  const url = newsFetchUrl(themeNewsRelPath(slug, `${month}.v0.json`));
  if (!url) return [];
  try {
    const res = await fetch(url, {
      credentials: "omit",
      cache: stockthemesBrowserFetchCache(),
      signal,
    });
    if (!res.ok) return [];
    const raw = (await res.json()) as Partial<ThemeNewsMonthV0>;
    return raw?.schema_version === "theme.news.month.v0" ? parseItems(raw.items) : [];
  } catch {
    return [];
  }
}
