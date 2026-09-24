import { valueForTrendingColumn } from "@/lib/trendingCompareMetrics";
import type { CompareThemesRowV0 } from "@/types/compare_themes.v0";
import type { ManifestV0 } from "@/types/manifest.v0";

export type ExploreThemeChip = {
  slug: string;
  name: string;
  return_1m: number | null;
};

export type GroupExplore = {
  slug: string;
  name: string;
  theme_count?: number;
  themes: ExploreThemeChip[];
};

export type PickExploreGroupsOptions = {
  count?: number;
  themesPerGroup?: number;
  /** Override clock (tests). Defaults to now. */
  now?: Date;
};

const DEFAULT_COUNT = 6;
const DEFAULT_THEMES_PER_GROUP = 4;

/** YYYY-MM-DD in America/New_York — stable daily draw aligned to market calendar. */
export function exploreDayKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32 — deterministic PRNG from a 32-bit seed. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rand: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}

/**
 * Light diversity key so one daily draw doesn't stack near-duplicates
 * (AI / AI Power / AI Bottleneck).
 */
export function exploreDiversityKey(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "";
  if (words[0] === "ai") return "ai";
  return words[0]!;
}

function themeReturn1m(row: CompareThemesRowV0 | undefined): number | null {
  if (!row) return null;
  const v = valueForTrendingColumn("1M", row.compare_returns ?? undefined, {}, row.name);
  return v != null && Number.isFinite(v) ? v : null;
}

/**
 * Daily-stable random sample of groups for homepage discovery.
 * Not a leaderboard — Radar / movers already cover that.
 */
export function pickExploreGroups(
  manifest: ManifestV0,
  compareRows: CompareThemesRowV0[] = [],
  options: PickExploreGroupsOptions = {},
): GroupExplore[] {
  const count = options.count ?? DEFAULT_COUNT;
  const themesPerGroup = options.themesPerGroup ?? DEFAULT_THEMES_PER_GROUP;
  const day = exploreDayKey(options.now);
  const rand = mulberry32(hashSeed(`explore-groups:${day}`));

  const compareBySlug = new Map<string, CompareThemesRowV0>();
  for (const row of compareRows) {
    if (row?.slug) compareBySlug.set(row.slug, row);
  }

  const themesByGroup = new Map<string, { slug: string; name: string }[]>();
  for (const t of manifest.themes || []) {
    if (!t?.slug || !t?.name) continue;
    const gSlug = String(t.group_slug || "").trim();
    if (!gSlug) continue;
    const list = themesByGroup.get(gSlug) || [];
    list.push({ slug: t.slug, name: t.name });
    themesByGroup.set(gSlug, list);
  }

  type Candidate = {
    slug: string;
    name: string;
    theme_count?: number;
    themes: { slug: string; name: string }[];
  };

  const candidates: Candidate[] = (manifest.groups || [])
    .filter((g) => g?.slug && g?.name)
    .map((g) => {
      const fromSlugs = (g.theme_slugs || [])
        .map((slug) => {
          const row = compareBySlug.get(slug);
          const fromManifest = (manifest.themes || []).find((t) => t.slug === slug);
          const name = row?.name || fromManifest?.name;
          if (!name) return null;
          return { slug, name };
        })
        .filter((x): x is { slug: string; name: string } => Boolean(x));
      const themes =
        fromSlugs.length > 0 ? fromSlugs : themesByGroup.get(g.slug) || [];
      return {
        slug: g.slug,
        name: g.name,
        theme_count: typeof g.theme_count === "number" ? g.theme_count : themes.length || undefined,
        themes,
      };
    })
    .filter((g) => g.themes.length > 0);

  shuffleInPlace(candidates, rand);

  const picked: Candidate[] = [];
  const usedKeys = new Set<string>();

  for (const g of candidates) {
    if (picked.length >= count) break;
    const key = exploreDiversityKey(g.name);
    if (key && usedKeys.has(key)) continue;
    if (key) usedKeys.add(key);
    picked.push(g);
  }

  if (picked.length < count) {
    for (const g of candidates) {
      if (picked.length >= count) break;
      if (picked.some((p) => p.slug === g.slug)) continue;
      picked.push(g);
    }
  }

  return picked.slice(0, count).map((g) => {
    const themeRand = mulberry32(hashSeed(`explore-themes:${day}:${g.slug}`));
    const themePool = [...g.themes];
    shuffleInPlace(themePool, themeRand);
    const themes: ExploreThemeChip[] = themePool.slice(0, themesPerGroup).map((t) => ({
      slug: t.slug,
      name: t.name,
      return_1m: themeReturn1m(compareBySlug.get(t.slug)),
    }));
    return {
      slug: g.slug,
      name: g.name,
      theme_count: g.theme_count,
      themes,
    };
  });
}
