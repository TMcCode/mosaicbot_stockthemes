import type { HomeRadarV0 } from "@/types/home_radar.v0";
import type { ThemesInMotionV0 } from "@/types/themes_in_motion.v0";

/** Collect thesis blurbs keyed by theme slug (radar + motion cards). */
export function buildThesisBySlugFromBundles(
  radar: HomeRadarV0 | null | undefined,
  motions?: ThemesInMotionV0 | null,
): Record<string, string> {
  const out: Record<string, string> = {};
  const put = (slug: string | null | undefined, thesis: string | null | undefined) => {
    const s = String(slug || "").trim();
    const t = String(thesis || "").trim();
    if (!s || !t || out[s]) return;
    out[s] = t;
  };

  if (radar?.tabs) {
    for (const key of ["new", "accelerating", "fading"] as const) {
      const block = radar.tabs[key];
      const cards = [
        ...(Array.isArray(block?.all) ? block.all : []),
        ...(Array.isArray(block?.home) ? block.home : []),
      ];
      for (const c of cards) {
        put(c.slug, c.thesis);
        for (const sib of c.siblings || []) put(sib.slug, sib.thesis);
      }
    }
  }

  if (motions) {
    for (const row of [...(motions.homepage || []), ...(motions.pool || [])]) {
      put(row.slug, row.thesis);
    }
  }

  return out;
}
