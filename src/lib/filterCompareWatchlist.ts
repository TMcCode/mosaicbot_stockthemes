type ThemeRowLike = {
  slug: string;
  groupSlug?: string | null;
};

type GroupRowLike = {
  slug: string;
};

/** Match watchlist DB keys (theme slugs stored lowercased). */
function themeKey(slug: string): string {
  return String(slug || "").trim().toLowerCase();
}

/**
 * Union of selected watchlist scopes. Neither selected → null (no filter).
 * Themes: slug set. Groups: Top Picks uses ETL ``group_slugs``; My uses groups
 * that contain any saved theme (from theme rows already on the page).
 */
export function resolveCompareWatchlistSlugFilter(opts: {
  myWatchlist: boolean;
  topPicks: boolean;
  viewMode: "themes" | "groups";
  myThemeSlugs: ReadonlySet<string>;
  topPickThemeSlugs: ReadonlySet<string>;
  topPickGroupSlugs: ReadonlySet<string>;
  /** Theme rows with groupSlug — used to map My watchlist → groups. */
  themeRowsForGroupMembership: readonly ThemeRowLike[];
}): Set<string> | null {
  const { myWatchlist, topPicks, viewMode } = opts;
  if (!myWatchlist && !topPicks) return null;

  const out = new Set<string>();

  if (viewMode === "themes") {
    if (myWatchlist) {
      for (const slug of opts.myThemeSlugs) {
        const s = String(slug || "").trim().toLowerCase();
        if (s) out.add(s);
      }
    }
    if (topPicks) {
      for (const slug of opts.topPickThemeSlugs) {
        const s = String(slug || "").trim().toLowerCase();
        if (s) out.add(s);
      }
    }
    return out;
  }

  // Groups — Top Picks group_slugs are ETL-precomputed; My derives from theme→group on page rows.
  if (topPicks) {
    for (const slug of opts.topPickGroupSlugs) {
      const s = String(slug || "").trim().toLowerCase();
      if (s) out.add(s);
    }
  }
  if (myWatchlist && opts.myThemeSlugs.size > 0) {
    for (const row of opts.themeRowsForGroupMembership) {
      const key = themeKey(row.slug);
      if (!key || !opts.myThemeSlugs.has(key)) continue;
      const g = String(row.groupSlug || "").trim().toLowerCase();
      if (g) out.add(g);
    }
  }
  return out;
}

export function filterRowsBySlugSet<T extends { slug: string }>(
  rows: readonly T[],
  slugSet: Set<string> | null,
): T[] {
  if (!slugSet) return [...rows];
  return rows.filter((row) => {
    const slug = String(row.slug || "").trim();
    if (!slug) return false;
    return slugSet.has(slug) || slugSet.has(slug.toLowerCase());
  });
}

export function toSlugSet(slugs: readonly string[] | undefined | null): Set<string> {
  const out = new Set<string>();
  for (const raw of slugs || []) {
    const s = String(raw || "").trim().toLowerCase();
    if (s) out.add(s);
  }
  return out;
}

export type { ThemeRowLike, GroupRowLike };
