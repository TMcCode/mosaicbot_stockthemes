import { cache } from "react";

import { loadThemeDetail, type ThemeDetailLoadResult } from "@/lib/loadThemeDetail";

export const getThemeDetailCached = cache(
  async (slug: string): Promise<ThemeDetailLoadResult | null> => {
    return loadThemeDetail(slug);
  },
);
