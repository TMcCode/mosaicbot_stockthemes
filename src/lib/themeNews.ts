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

const TITLE_STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "for",
  "as",
  "at",
  "by",
  "from",
  "with",
  "its",
  "is",
  "are",
  "was",
  "were",
  "be",
  "after",
  "says",
  "said",
]);
const TITLE_ALIAS: Record<string, string> = {
  shares: "stock",
  share: "stock",
  tumbles: "tumble",
  plunges: "plunge",
  drops: "drop",
  falls: "fall",
  slumps: "slump",
};

function normTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleTokens(title: string): Set<string> {
  const out = new Set<string>();
  for (const t of normTitle(title).split(" ")) {
    if (t.length < 4 || TITLE_STOP.has(t)) continue;
    out.add(TITLE_ALIAS[t] ?? t);
  }
  return out;
}

function titlesNearDup(a: string, b: string): boolean {
  const na = normTitle(a);
  const nb = normTitle(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ta = titleTokens(a);
  const tb = titleTokens(b);
  if (ta.size < 3 || tb.size < 3) return false;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  const union = ta.size + tb.size - inter;
  return union > 0 && inter / union >= 0.55;
}

function normUrl(url: string): string {
  return url.trim().split("?")[0]!.split("#")[0]!.replace(/\/+$/, "").toLowerCase();
}

/** Collapse same-day wire rewrites (WSJ Shares/Stock twins) until ETL republishes. */
export function dedupeThemeNewsItems(items: ThemeNewsItemV0[]): ThemeNewsItemV0[] {
  const ranked = [...items].sort((a, b) => {
    const d = String(b.date ?? "").localeCompare(String(a.date ?? ""));
    if (d) return d;
    const pick = Number(Boolean(b.picked)) - Number(Boolean(a.picked));
    if (pick) return pick;
    return (b.title?.length ?? 0) - (a.title?.length ?? 0);
  });
  const kept: ThemeNewsItemV0[] = [];
  for (const item of ranked) {
    const url = normUrl(item.url);
    const day = String(item.date ?? "").slice(0, 10);
    const dup = kept.some((h) => {
      if (url && normUrl(h.url) === url) return true;
      if (!titlesNearDup(item.title, h.title)) return false;
      const keepDay = String(h.date ?? "").slice(0, 10);
      return !day || !keepDay || day === keepDay;
    });
    if (!dup) kept.push(item);
  }
  return kept.sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
}

export function parseThemeNewsIndex(raw: unknown): ThemeNewsIndexV0 | null {
  const row = (raw ?? {}) as Record<string, unknown>;
  if (row.schema_version !== "theme.news.index.v0" || typeof row.slug !== "string") return null;
  const months = Array.isArray(row.months)
    ? (row.months as { month?: unknown; count?: unknown }[])
        .filter((m) => typeof m?.month === "string" && /^\d{4}-\d{2}$/.test(m.month as string))
        .map((m) => ({ month: m.month as string, count: Number(m.count) || 0 }))
    : [];
  const latest = dedupeThemeNewsItems(parseItems(row.latest));
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
    return raw?.schema_version === "theme.news.month.v0"
      ? dedupeThemeNewsItems(parseItems(raw.items))
      : [];
  } catch {
    return [];
  }
}
