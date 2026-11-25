import type { ThemesInMotionRowV0 } from "@/types/themes_in_motion.v0";

/**
 * Sheet-ordered “Most talked about” table (`most_talked_about.v0.json`).
 * Same row shape as Motions; baked in the Motions discovery pass with Motions metrics.
 */
export type MostTalkedAboutV0 = {
  schema_version: 0;
  as_of: string;
  build_id?: string;
  label?: string;
  names_source?: string;
  homepage: ThemesInMotionRowV0[];
  pool: ThemesInMotionRowV0[];
  theme_slugs?: string[];
};
