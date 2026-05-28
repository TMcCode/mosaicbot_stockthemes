import type { FactorLeaderboardsV0 } from "@/types/factor_leaderboards.v0";
import type { ThemeFactorProfileV0, ThemeFactorScoreEntryV0 } from "@/types/theme.factor_profile.v0";

/** Phase 0 spec default — hide/gray panel below this theme-level confidence. */
export const FACTOR_CONFIDENCE_UI_FLOOR = 0.35;

export const FACTOR_PROFILE_SIDECAR_SUFFIX = ".factor_profile.v0.json";

export function themeFactorProfileUrl(dataBaseUrl: string, slug: string): string {
  const base = dataBaseUrl.replace(/\/$/, "");
  return `${base}/themes/${encodeURIComponent(slug)}${FACTOR_PROFILE_SIDECAR_SUFFIX}`;
}

export function parseThemeFactorProfile(raw: string): ThemeFactorProfileV0 {
  const data = JSON.parse(raw) as ThemeFactorProfileV0;
  if (data.schema_version !== "theme.factor_profile.v0") {
    throw new Error(`Unsupported factor profile schema: ${data.schema_version}`);
  }
  return data;
}

export function factorProfileHasContent(profile: ThemeFactorProfileV0): boolean {
  const pos = profile.factors_positive?.length ?? 0;
  const neg = profile.factors_negative?.length ?? 0;
  return pos + neg > 0;
}

export function factorProfileUiAllowed(profile: ThemeFactorProfileV0): boolean {
  const conf = profile.confidence;
  if (conf == null || !Number.isFinite(conf)) {
    return factorProfileHasContent(profile);
  }
  return conf >= FACTOR_CONFIDENCE_UI_FLOOR && factorProfileHasContent(profile);
}

export function factorLeaderboardsUrl(dataBaseUrl: string): string {
  const base = dataBaseUrl.replace(/\/$/, "");
  return `${base}/factor_leaderboards.v0.json`;
}

export function parseFactorLeaderboards(raw: string): FactorLeaderboardsV0 {
  const data = JSON.parse(raw) as FactorLeaderboardsV0;
  if (data.schema_version !== "factor_leaderboards.v0" || !data.factors) {
    throw new Error("Invalid factor_leaderboards.v0");
  }
  return data;
}

function entryNeedsLeaderboardEnrich(entry: ThemeFactorScoreEntryV0): boolean {
  if (entry.rank == null || !Number.isFinite(entry.rank)) return true;
  if (entry.total == null || !Number.isFinite(entry.total)) return true;
  if (entry.score_standalone != null && Number.isFinite(entry.score_standalone)) {
    if (entry.rank_standalone == null || !Number.isFinite(entry.rank_standalone)) return true;
  }
  return false;
}

/** True when sidecar is missing rank/total (or standalone rank) and needs leaderboards fallback. */
export function factorProfileNeedsLeaderboardEnrich(profile: ThemeFactorProfileV0): boolean {
  for (const entry of [...(profile.factors_positive ?? []), ...(profile.factors_negative ?? [])]) {
    if (entryNeedsLeaderboardEnrich(entry)) return true;
  }
  if (profile.dominant_sector && entryNeedsLeaderboardEnrich(profile.dominant_sector)) return true;
  return false;
}

function leaderboardRowsForFactor(
  bucket: unknown,
): Array<{
  slug?: string | null;
  rank: number;
  rank_standalone?: number | null;
  total: number;
  score_standalone?: number | null;
}> {
  if (!bucket) return [];
  const rawEntries = Array.isArray((bucket as { entries?: unknown }).entries)
    ? ((bucket as { entries: unknown[] }).entries ?? [])
    : Array.isArray(bucket)
      ? (bucket as unknown[])
      : [];
  const totalFallback = rawEntries.length;
  return rawEntries
    .map((raw, idx) => {
      if (!raw || typeof raw !== "object") return null;
      const row = raw as Record<string, unknown>;
      const rankNum = Number(row.rank);
      const rankStandaloneNum = Number(row.rank_standalone);
      const totalNum = Number(row.total);
      const scoreStandaloneNum = Number(row.score_standalone);
      return {
        slug: typeof row.slug === "string" ? row.slug : null,
        rank: Number.isFinite(rankNum) && rankNum > 0 ? Math.floor(rankNum) : idx + 1,
        rank_standalone:
          Number.isFinite(rankStandaloneNum) && rankStandaloneNum > 0 ? Math.floor(rankStandaloneNum) : null,
        total: Number.isFinite(totalNum) && totalNum > 0 ? Math.floor(totalNum) : totalFallback,
        score_standalone: Number.isFinite(scoreStandaloneNum) ? scoreStandaloneNum : null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
}

function enrichEntryFromLeaderboards(
  entry: ThemeFactorScoreEntryV0,
  slug: string,
  leaderboards: FactorLeaderboardsV0 | null,
): ThemeFactorScoreEntryV0 {
  if (!leaderboards?.factors) return entry;
  const rows = leaderboardRowsForFactor(leaderboards.factors[entry.id]);
  const match = rows.find((r) => r.slug === slug);
  if (!match) return entry;
  const next: ThemeFactorScoreEntryV0 = { ...entry };
  if (next.rank == null) next.rank = match.rank;
  if (next.total == null) next.total = match.total;
  if (next.rank_standalone == null && match.rank_standalone != null) {
    next.rank_standalone = match.rank_standalone;
  }
  if (next.score_standalone == null && match.score_standalone != null) {
    next.score_standalone = Math.round(match.score_standalone);
  }
  return next;
}

/** Fill missing rank/total on sidecar entries using factor_leaderboards.v0.json. */
export function enrichFactorProfileRanks(
  profile: ThemeFactorProfileV0,
  slug: string,
  leaderboards: FactorLeaderboardsV0 | null,
): ThemeFactorProfileV0 {
  const pos = (profile.factors_positive ?? []).map((e) => enrichEntryFromLeaderboards(e, slug, leaderboards));
  const neg = (profile.factors_negative ?? []).map((e) => enrichEntryFromLeaderboards(e, slug, leaderboards));
  const dom = profile.dominant_sector
    ? enrichEntryFromLeaderboards(profile.dominant_sector, slug, leaderboards)
    : profile.dominant_sector;
  return { ...profile, factors_positive: pos, factors_negative: neg, dominant_sector: dom };
}

export function formatFactorRankLabel(entry: ThemeFactorScoreEntryV0): string | null {
  if (entry.rank == null || entry.total == null) return null;
  if (!Number.isFinite(entry.rank) || !Number.isFinite(entry.total)) return null;
  return `#${entry.rank} of ${entry.total.toLocaleString()} themes`;
}

export function formatFactorRankLabelStandalone(entry: ThemeFactorScoreEntryV0): string | null {
  if (entry.rank_standalone == null || entry.total == null) return null;
  if (!Number.isFinite(entry.rank_standalone) || !Number.isFinite(entry.total)) return null;
  return `#${entry.rank_standalone} of ${entry.total.toLocaleString()} themes`;
}

/** Theme pages: co-movement score when published, else incremental. */
export function themeFactorDisplayScore(entry: ThemeFactorScoreEntryV0): number {
  if (entry.score_standalone != null && Number.isFinite(entry.score_standalone)) {
    return Math.max(0, Math.min(100, Math.round(entry.score_standalone)));
  }
  return Math.max(0, Math.min(100, Math.round(entry.score)));
}

export function formatThemeFactorDisplayRank(entry: ThemeFactorScoreEntryV0): string | null {
  if (entry.score_standalone != null && Number.isFinite(entry.score_standalone)) {
    return formatFactorRankLabelStandalone(entry);
  }
  return formatFactorRankLabel(entry);
}

export function formatFactorAsOf(iso?: string): string | null {
  const t = (iso ?? "").trim();
  if (!t) return null;
  const ms = Date.parse(t);
  if (!Number.isNaN(ms)) {
    return new Date(ms).toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return t.length >= 10 ? t.slice(0, 10) : t;
}
