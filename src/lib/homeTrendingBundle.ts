import type { ManifestV0 } from "@/types/manifest.v0";
import type { HomeTrendingV0 } from "@/types/home_trending.v0";

/**
 * True when the pre-built bundle matches manifest trending order and as_of (same publish).
 */
export function canUseHomeTrendingBundle(
  manifest: ManifestV0,
  trendingNames: string[],
  home: HomeTrendingV0 | null | undefined,
): home is HomeTrendingV0 {
  if (!home?.rows) return false;
  if (String(home.as_of || "").trim() !== String(manifest.as_of || "").trim()) return false;
  if (home.rows.length !== trendingNames.length) return false;
  for (let i = 0; i < trendingNames.length; i++) {
    const a = String(trendingNames[i] || "").trim();
    const b = String(home.rows[i]?.name || "").trim();
    if (a !== b) return false;
  }
  return true;
}
