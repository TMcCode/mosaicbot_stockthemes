import { cache } from "react";

import { loadThemesInMotion, type ThemesInMotionLoadResult } from "@/lib/loadThemesInMotion";

export const getThemesInMotionCached = cache(async (): Promise<ThemesInMotionLoadResult | null> => {
  return loadThemesInMotion();
});
