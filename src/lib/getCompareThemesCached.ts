import { cache } from "react";

import { loadCompareThemes, type CompareThemesLoadResult } from "@/lib/loadCompareThemes";

export const getCompareThemesCached = cache(async (): Promise<CompareThemesLoadResult | null> => {
  return loadCompareThemes();
});
