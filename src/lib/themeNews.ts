import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import { stockthemesBrowserSidecarFetchBase } from "@/lib/stockthemesPublicBase";
import type {
  ThemeNewsAlsoV0,
  ThemeNewsIndexV0,
  ThemeNewsItemV0,
  ThemeNewsMonthV0,
} from "@/types/theme.news.v0";

/** CDN / rewrite path under the public data base (no leading slash). */
export function themeNewsRelPath(slug: string, file: string): string {
  return `stockcontext/themes/${encodeURIComponent(slug)}/news/${file}`;
}

function parseAlso(value: unknown): ThemeNewsAlsoV0[] | undefined {
  if (!Array.isArray(value) || !value.length) return undefined;
  const out: ThemeNewsAlsoV0[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.url !== "string" || typeof r.title !== "string") {
      continue;
    }
    const row: ThemeNewsAlsoV0 = {
      id: r.id,
      url: r.url,
      title: r.title,
      date: typeof r.date === "string" ? r.date : "",
    };
    if (typeof r.source === "string" && r.source) row.source = r.source;
    if (r.picked) row.picked = true;
    if (r.on_site) row.on_site = true;
    if (Array.isArray(r.tickers)) {
      const tickers = r.tickers.filter((t): t is string => typeof t === "string" && Boolean(t));
      if (tickers.length) row.tickers = tickers.slice(0, 6);
    }
    out.push(row);
  }
  return out.length ? out : undefined;
}

function parseItems(value: unknown): ThemeNewsItemV0[] {
  if (!Array.isArray(value)) return [];
  const out: ThemeNewsItemV0[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.url !== "string" || typeof r.title !== "string") {
      continue;
    }
    const item: ThemeNewsItemV0 = {
      id: r.id,
      url: r.url,
      title: r.title,
      date: typeof r.date === "string" ? r.date : "",
    };
    if (typeof r.source === "string" && r.source) item.source = r.source;
    if (r.picked) item.picked = true;
    if (r.on_site) item.on_site = true;
    if (typeof r.note === "string" && r.note) item.note = r.note;
    if (Array.isArray(r.tickers)) {
      const tickers = r.tickers.filter((t): t is string => typeof t === "string" && Boolean(t));
      if (tickers.length) item.tickers = tickers.slice(0, 6);
    }
    const also = parseAlso(r.also);
    if (also) item.also = also;
    out.push(item);
  }
  return out;
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

function mergeAlsoInto(into: ThemeNewsItemV0, donor: ThemeNewsItemV0): void {
  const seen = new Set<string>([into.id, ...(into.also ?? []).map((a) => a.id)]);
  const extras: ThemeNewsAlsoV0[] = [];
  if (!seen.has(donor.id)) {
    extras.push({
      id: donor.id,
      url: donor.url,
      title: donor.title,
      date: donor.date,
      source: donor.source,
      picked: donor.picked,
      on_site: donor.on_site,
      tickers: donor.tickers,
    });
    seen.add(donor.id);
  }
  for (const a of donor.also ?? []) {
    if (seen.has(a.id)) continue;
    extras.push(a);
    seen.add(a.id);
  }
  if (extras.length) into.also = [...(into.also ?? []), ...extras];
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
    const dupOf = kept.find((h) => {
      if (url && normUrl(h.url) === url) return true;
      if (!titlesNearDup(item.title, h.title)) return false;
      const keepDay = String(h.date ?? "").slice(0, 10);
      return !day || !keepDay || day === keepDay;
    });
    if (dupOf) {
      mergeAlsoInto(dupOf, item);
      continue;
    }
    kept.push(item);
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
