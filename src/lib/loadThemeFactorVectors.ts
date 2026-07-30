import { FACTOR_MAKEUP_AXIS_IDS } from "@/lib/factorMakeupAxes";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesCache";
import type { FactorLeaderboardsV0 } from "@/types/factor_leaderboards.v0";
import type { ThemeFactorVectorsV0 } from "@/types/theme_factor_vectors.v0";

export type ThemeFactorMakeupScores = {
  theme: string;
  /** Co-movement (standalone) score 0–100 per factor id. */
  scores: Record<string, number>;
  ranks: Record<string, number>;
  totals: Record<string, number>;
};

export type ThemeFactorMakeupBundle = {
  asOf: string | null;
  /** Slug → co-movement scores for makeup axes. Fat JSON is not retained. */
  bySlug: Map<string, ThemeFactorMakeupScores>;
  source: "vectors" | "leaderboards";
};

const cache = new Map<string, ThemeFactorMakeupBundle | null>();
const inflight = new Map<string, Promise<ThemeFactorMakeupBundle | null>>();

function indexFromVectors(payload: ThemeFactorVectorsV0): Map<string, ThemeFactorMakeupScores> {
  const bySlug = new Map<string, ThemeFactorMakeupScores>();
  const axes = Array.isArray(payload.axes) ? payload.axes : [];
  const axisIds = axes.map((a) => String(a?.id || "").trim()).filter(Boolean);
  const preferred = FACTOR_MAKEUP_AXIS_IDS.filter((id) => axisIds.includes(id));
  const useIds = preferred.length ? preferred : axisIds;
  const indexById = new Map(axisIds.map((id, i) => [id, i]));

  const themes = payload.themes && typeof payload.themes === "object" ? payload.themes : {};
  for (const [slugRaw, row] of Object.entries(themes)) {
    const slug = slugRaw.trim();
    if (!slug || !row || typeof row !== "object") continue;
    const scoresArr = Array.isArray(row.scores) ? row.scores : [];
    const ranksArr = Array.isArray(row.ranks) ? row.ranks : [];
    const totalNum = Number(row.total);
    const total = Number.isFinite(totalNum) && totalNum > 0 ? Math.floor(totalNum) : null;
    const scores: Record<string, number> = {};
    const ranks: Record<string, number> = {};
    const totals: Record<string, number> = {};
    for (const id of useIds) {
      const i = indexById.get(id);
      if (i == null) continue;
      const scoreNum = Number(scoresArr[i]);
      if (Number.isFinite(scoreNum)) {
        scores[id] = Math.max(0, Math.min(100, Math.round(scoreNum)));
      }
      const rankNum = Number(ranksArr[i]);
      if (Number.isFinite(rankNum) && rankNum > 0) {
        ranks[id] = Math.floor(rankNum);
      }
      if (total != null) totals[id] = total;
    }
    bySlug.set(slug, {
      theme: typeof row.name === "string" && row.name.trim() ? row.name.trim() : slug,
      scores,
      ranks,
      totals,
    });
  }
  return bySlug;
}

/** Fallback path until theme_factor_vectors.v0.json is published. */
export function buildThemeMakeupScoreIndex(
  payload: FactorLeaderboardsV0,
  factorIds: readonly string[],
): Map<string, ThemeFactorMakeupScores> {
  const bySlug = new Map<string, ThemeFactorMakeupScores>();

  for (const factorId of factorIds) {
    const bucket = payload.factors[factorId];
    if (!bucket?.entries?.length) continue;
    for (const entry of bucket.entries) {
      const slug = typeof entry.slug === "string" ? entry.slug.trim() : "";
      if (!slug) continue;
      const scoreRaw =
        entry.score_standalone != null && Number.isFinite(entry.score_standalone)
          ? Number(entry.score_standalone)
          : Number(entry.score);
      if (!Number.isFinite(scoreRaw)) continue;
      const rankRaw =
        entry.rank_standalone != null && Number.isFinite(entry.rank_standalone)
          ? Number(entry.rank_standalone)
          : Number(entry.rank);
      let row = bySlug.get(slug);
      if (!row) {
        row = {
          theme: typeof entry.theme === "string" ? entry.theme : slug,
          scores: {},
          ranks: {},
          totals: {},
        };
        bySlug.set(slug, row);
      } else if (entry.theme && !row.theme) {
        row.theme = entry.theme;
      }
      row.scores[factorId] = Math.max(0, Math.min(100, Math.round(scoreRaw)));
      if (Number.isFinite(rankRaw) && rankRaw > 0) {
        row.ranks[factorId] = Math.floor(rankRaw);
      }
      if (Number.isFinite(entry.total) && entry.total > 0) {
        row.totals[factorId] = Math.floor(entry.total);
      }
    }
  }

  return bySlug;
}

async function loadVectorsFile(base: string): Promise<ThemeFactorVectorsV0 | null> {
  const url = `${base}/theme_factor_vectors.v0.json?${stockthemesBrowserCacheBusterQuery()}`;
  const res = await fetch(url, {
    credentials: "omit",
    cache: stockthemesBrowserFetchCache(),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as ThemeFactorVectorsV0;
  if (data.schema_version !== "theme_factor_vectors.v0" || !data.themes || !data.axes) {
    return null;
  }
  return data;
}

async function loadLeaderboardsFallback(base: string): Promise<ThemeFactorMakeupBundle | null> {
  const url = `${base}/factor_leaderboards.v0.json?${stockthemesBrowserCacheBusterQuery()}`;
  const res = await fetch(url, {
    credentials: "omit",
    cache: stockthemesBrowserFetchCache(),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as FactorLeaderboardsV0;
  if (data.schema_version !== "factor_leaderboards.v0" || !data.factors) return null;
  const bySlug = buildThemeMakeupScoreIndex(data, FACTOR_MAKEUP_AXIS_IDS);
  return {
    asOf: data.as_of ?? data.generated_at ?? null,
    bySlug,
    source: "leaderboards",
  };
}

/**
 * Load Factor makeup scores once per data base URL.
 * Prefers slim theme_factor_vectors.v0.json; falls back to leaderboards.
 * Only the slug index is retained in memory (not the raw JSON).
 */
export async function loadThemeFactorMakeupBundle(
  dataBaseUrl: string,
): Promise<ThemeFactorMakeupBundle | null> {
  const base = (dataBaseUrl || "").trim().replace(/\/$/, "");
  if (!base) return null;
  if (cache.has(base)) return cache.get(base) ?? null;
  const existing = inflight.get(base);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const vectors = await loadVectorsFile(base);
      let bundle: ThemeFactorMakeupBundle | null = null;
      if (vectors) {
        bundle = {
          asOf: vectors.as_of ?? vectors.generated_at ?? null,
          bySlug: indexFromVectors(vectors),
          source: "vectors",
        };
      } else {
        bundle = await loadLeaderboardsFallback(base);
      }
      cache.set(base, bundle);
      return bundle;
    } catch {
      cache.set(base, null);
      return null;
    } finally {
      inflight.delete(base);
    }
  })();

  inflight.set(base, promise);
  return promise;
}

/** @deprecated Prefer loadThemeFactorMakeupBundle */
export async function loadFactorLeaderboards(
  dataBaseUrl: string,
): Promise<FactorLeaderboardsV0 | null> {
  const base = (dataBaseUrl || "").trim().replace(/\/$/, "");
  if (!base) return null;
  const url = `${base}/factor_leaderboards.v0.json?${stockthemesBrowserCacheBusterQuery()}`;
  const res = await fetch(url, {
    credentials: "omit",
    cache: stockthemesBrowserFetchCache(),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as FactorLeaderboardsV0;
  if (data.schema_version !== "factor_leaderboards.v0" || !data.factors) return null;
  return data;
}
