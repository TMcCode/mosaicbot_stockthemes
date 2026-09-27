import type { ThemesInMotionRowV0 } from "@/types/themes_in_motion.v0";

/**
 * Table-only fields for Themes in Motion rows. The bake also carries `chart_1y`
 * (~70–160KB per row) and `compare_returns`, which would otherwise be serialized
 * into the page RSC payload.
 */
export function slimMotionsRows(
  rows: readonly ThemesInMotionRowV0[] | null | undefined,
  limit?: number,
): ThemesInMotionRowV0[] {
  const pool = rows ?? [];
  const sliced = limit != null && Number.isFinite(limit) ? pool.slice(0, limit) : pool;
  return sliced.map((r) => ({
    slug: r.slug,
    name: r.name,
    return_1m: r.return_1m ?? null,
    return_120d: r.return_120d ?? null,
    return_ytd: r.return_ytd ?? null,
    revisions_label: r.revisions_label ?? null,
    breadth_pct: r.breadth_pct ?? null,
    breadth_label: r.breadth_label ?? null,
  }));
}
